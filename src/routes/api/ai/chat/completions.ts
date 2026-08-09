import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { env as serverEnv } from "#/env/server";
import {
  decide,
  deviceIdFrom,
  FAST_MODEL,
  ipFrom,
  OVERFLOW_MODELS,
  PRIMARY_MODEL,
  quotaError,
  recordUsage,
} from "#/lib/ai/free-tier";
import {
  collectStreamText,
  looksLikeToolRefusal,
  mightBecomeRefusal,
  neuronsUsed,
  normalizeMessages,
  parseTextToolCalls,
  peekStreamHead,
  toolCallStream,
  toOpenAiCompletion,
  toOpenAiStream,
} from "#/lib/ai/openai-compat";

/**
 * POST /api/ai/chat/completions
 *
 * The free tier's OpenAI-compatible endpoint. The desktop app points its base
 * URL at /api/ai and everything downstream (streaming, tool calls, the Test
 * button) works unchanged.
 *
 * Routing: Cloudflare Workers AI while the shared daily allocation lasts, then
 * the OpenRouter free pool, then a typed 429. Tool calls must survive both paths
 * — the database agent is useless without them.
 */

type ChatBody = {
  model?: string;
  messages?: unknown[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: unknown[];
  tool_choice?: unknown;
};

/**
 * Cheap prefix test, so a normal answer is never buffered on suspicion. The
 * printed-call shapes all open the same way.
 */
function startsLikeToolCall(head: string): boolean {
  const t = head.trimStart();
  return (
    t.startsWith('{"type": "function"') ||
    t.startsWith('{"type":"function"') ||
    t.startsWith('{"name"') ||
    t.startsWith('{ "name"') ||
    t.startsWith("<tool_call>") ||
    t.startsWith("<|python_tag|>")
  );
}

/** Replay text we buffered but could not turn into a call. */
function textStream(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ response: text })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/** "stroke-free-fast" is the only alias that asks for the smaller model. */
function wantsFast(model: string | undefined): boolean {
  return (model ?? "").endsWith("-fast");
}

export const Route = createFileRoute("/api/ai/chat/completions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deviceId = deviceIdFrom(request);
        if (!deviceId) {
          return Response.json(
            {
              error: {
                code: "missing_device",
                message: "Missing device identifier.",
                type: "invalid_request_error",
              },
            },
            { status: 401 },
          );
        }

        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return Response.json(
            { error: { code: "invalid_json", message: "Malformed request body." } },
            { status: 400 },
          );
        }

        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return Response.json(
            { error: { code: "invalid_request", message: "`messages` is required." } },
            { status: 400 },
          );
        }

        const hasTools = Array.isArray(body.tools) && body.tools.length > 0;

        const ip = ipFrom(request);
        const verdict = await decide(deviceId, ip);
        if (!verdict.allow) return quotaError(verdict.code, verdict.retryAfter);

        // The client may omit `stream`; OpenAI's default is false and the desktop
        // app states it explicitly. Never infer streaming from anything else —
        // answering a non-streaming request with SSE breaks the caller's parser.
        const stream = body.stream === true;

        // Two payloads, not one: the second is the escape hatch for a model that
        // answers a greeting with "your input is not sufficient" purely because
        // tools were on the table.
        const base = {
          // Workers AI only understands string content; see normalizeMessages.
          messages: normalizeMessages(body.messages),
          temperature: body.temperature ?? 0,
          max_tokens: body.max_tokens ?? 4096,
        };
        const shared = hasTools
          ? { ...base, tools: body.tools, tool_choice: body.tool_choice ?? "auto" }
          : base;

        const runPrimary = async () => {
          // Model choice is made HERE, not by the client's alias, so cost and
          // capability stay in our hands:
          //   • tools present  → the 70B. Tool calling is what the database agent
          //     runs on, and the 8B is not dependable at it.
          //   • no tools       → the 8B. Greetings, explanations and "what can you
          //     do" have no business costing 70B neurons, and the shared daily
          //     allocation is what limits how many people we can serve.
          const model = hasTools || !wantsFast(body.model) ? PRIMARY_MODEL : FAST_MODEL;
          primaryModel = model;
          // The generated binding types key the options off a literal model-name
          // union, which cannot express a model chosen at runtime from our own
          // aliases — so the call is made through a narrow structural shim. The
          // binding speaks OpenAI's schema for chat models (messages, tools) and
          // returns a ReadableStream of SSE when `stream` is true.
          const ai = env.AI as unknown as {
            run: (model: string, options: Record<string, unknown>) => Promise<unknown>;
          };
          workersAi = ai;
          return await ai.run(model, { ...shared, stream });
        };

        /**
         * Same turn, second chance, with the tools taken away.
         *
         * The model didn't decline the request — it declined to pick a tool, and
         * then said so instead of answering. Without the tools in front of it the
         * same prompt gets a normal reply, which is what the user asked for.
         */
        const runWithoutTools = async (head: string) => {
          // Logged because this is invisible otherwise: the user sees a normal
          // answer either way, so a matcher that stops recognising a refusal
          // (the model's phrasing drifts, or a new template lands) looks exactly
          // like a matcher that never has to fire. The head is what to add to
          // the patterns when this stops appearing and complaints start.
          console.log(
            "free-tier: tool refusal, retrying without tools —",
            JSON.stringify(head.slice(0, 120)),
          );
          return await workersAi!.run(primaryModel, { ...base, stream });
        };

        // Free OpenRouter slugs are individually unreliable — they get retired
        // (404 "use this slug instead") and rate-limited upstream (429) without
        // warning. Walk the list until one answers, so overflow degrades model by
        // model instead of collapsing on the first bad one.
        const runOverflow = async () => {
          const key = serverEnv.OPENROUTER_POOL_KEY;
          if (!key) throw new Error("overflow provider not configured");

          let lastDetail = "";
          for (const model of OVERFLOW_MODELS) {
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${key}`,
                "http-referer": "https://stroke.click",
                "x-title": "Stroke",
              },
              body: JSON.stringify({ ...shared, stream, model }),
            });
            if (res.ok) return res;
            lastDetail = (await res.text().catch(() => "")).slice(0, 200);
            console.log("overflow model rejected", model, res.status, lastDetail);
          }
          throw new Error(`all overflow models failed: ${lastDetail}`);
        };

        /**
         * Book the request, but never at the cost of the answer. The counters
         * are D1 writes; a D1 hiccup after the model has already replied would
         * otherwise throw out of the handler and hand the user a bare 500 for a
         * response that was sitting right there.
         */
        const bookUsage = async (p: "primary" | "overflow", inTok?: number, outTok?: number) => {
          try {
            await recordUsage({
              deviceId,
              ip,
              day: verdict.day,
              provider: p,
              inputTokens: inTok,
              outputTokens: outTok,
            });
          } catch (err) {
            console.error("free-tier: usage not recorded", err);
          }
        };

        /** Hand an overflow provider's response straight through, SSE framing intact. */
        const passThrough = async (res: Response) => {
          await bookUsage("overflow");
          return new Response(res.body, {
            status: 200,
            headers: {
              "content-type":
                res.headers.get("content-type") ??
                (stream ? "text/event-stream" : "application/json"),
              "cache-control": "no-cache",
              "x-stroke-provider": "overflow",
            },
          });
        };

        const unavailable = () =>
          Response.json(
            {
              error: {
                code: "upstream_unavailable",
                message: "The free AI service is temporarily unavailable.",
              },
            },
            { status: 502 },
          );

        // A provider that errors must not burn the user's daily allowance, so
        // usage is booked only after one of them accepts the request.
        let provider = verdict.provider;
        let raw: unknown;
        let primaryModel = PRIMARY_MODEL;
        let workersAi: { run: (m: string, o: Record<string, unknown>) => Promise<unknown> } | null =
          null;
        try {
          raw = provider === "primary" ? await runPrimary() : await runOverflow();
        } catch (primaryErr) {
          if (provider !== "primary") return unavailable();
          // Workers AI refused (cold model, capacity, a bad tools payload it
          // won't take). Falling through to overflow keeps the user working
          // instead of handing them a dead assistant.
          try {
            raw = await runOverflow();
            provider = "overflow";
          } catch {
            console.error("free-tier: both providers failed", primaryErr);
            return unavailable();
          }
        }

        // Overflow returns a whole Response; pass its body through untouched so
        // SSE framing survives, and surface upstream failures as-is.
        if (raw instanceof Response) {
          if (!raw.ok) {
            const detail = await raw.text().catch(() => "");
            return Response.json(
              {
                error: {
                  code: "upstream_error",
                  message: detail.slice(0, 400) || "Upstream provider error.",
                },
              },
              { status: raw.status },
            );
          }
          return await passThrough(raw);
        }

        // Everything below is the Workers AI path, which answers in its own shape
        // and must be translated before it reaches an OpenAI-shaped client.
        const clientModel = body.model ?? "stroke-free";

        let out = raw as ReadableStream;
        if (stream && hasTools) {
          try {
            // A glance, not a gulp. Reading 160 characters before forwarding any
            // of them cost every tool-enabled turn its streaming — a short answer
            // arrived in one lump at the end. 24 is enough to tell a printed tool
            // call from prose, and only an opening that could still become a
            // refusal is read any further.
            let peek = await peekStreamHead(out, 24);
            if (
              !peek.sawToolCall &&
              !startsLikeToolCall(peek.head) &&
              mightBecomeRefusal(peek.head)
            ) {
              peek = await peekStreamHead(peek.stream, 160);
            }
            if (!peek.sawToolCall && looksLikeToolRefusal(peek.head)) {
              await peek.stream.cancel().catch(() => {});
              out = (await runWithoutTools(peek.head)) as ReadableStream;
            } else if (!peek.sawToolCall && startsLikeToolCall(peek.head)) {
              // The model is typing its tool call instead of calling it. Buffer
              // the whole thing — a call has nothing to stream anyway — and hand
              // back a real one. If it doesn't parse, replay the text as written.
              // `peek.stream` replays from the first byte, head included: adding
              // `peek.head` to it would count the opening twice.
              const text = await collectStreamText(peek.stream);
              const calls = parseTextToolCalls(text);
              out = calls ? toolCallStream(calls) : textStream(text);
            } else {
              out = peek.stream;
            }
          } catch (err) {
            // The binding accepted the request and then the stream died — a model
            // that runs out of context part-way through looks exactly like this,
            // which is why it showed up on long conversations. These awaits are
            // the last thing between that and an unhandled rejection, and an
            // unhandled rejection in a Worker reaches the user as a bare 500.
            console.error("free-tier: primary stream failed after accept", err);
            try {
              return await passThrough(await runOverflow());
            } catch {
              return unavailable();
            }
          }
        }

        if (stream) {
          await bookUsage(provider);
          return new Response(toOpenAiStream(out, clientModel), {
            status: 200,
            headers: {
              "content-type": "text/event-stream",
              "cache-control": "no-cache",
              connection: "keep-alive",
              "x-stroke-provider": provider,
            },
          });
        }

        let result = raw;
        let completion;
        try {
          if (hasTools) {
            const first = toOpenAiCompletion(result, clientModel).choices[0];
            if (!first.message.tool_calls && looksLikeToolRefusal(first.message.content)) {
              result = await runWithoutTools(first.message.content ?? "");
            }
          }
          completion = toOpenAiCompletion(result, clientModel);
        } catch (err) {
          console.error("free-tier: primary result could not be translated", err);
          try {
            return await passThrough(await runOverflow());
          } catch {
            return unavailable();
          }
        }

        // Same recovery on the non-streaming path: a printed call is still a call.
        const printed = completion.choices[0].message.tool_calls
          ? null
          : parseTextToolCalls(completion.choices[0].message.content);
        if (printed) {
          completion.choices[0] = {
            ...completion.choices[0],
            message: {
              role: "assistant",
              content: null,
              tool_calls: printed.map((c, i) => ({
                index: i,
                id: `call_${i}_${(c.name ?? "fn").replace(/[^\w-]/g, "")}`,
                type: "function" as const,
                function: { name: c.name ?? "", arguments: JSON.stringify(c.arguments ?? {}) },
              })),
            },
            finish_reason: "tool_calls",
          };
        }
        await bookUsage(
          provider,
          completion.usage.prompt_tokens,
          completion.usage.completion_tokens,
        );
        return Response.json(completion, {
          headers: {
            "x-stroke-provider": provider,
            // The binding reports real neurons consumed — exact metering, no estimate.
            "x-stroke-neurons": String(neuronsUsed(result)),
          },
        });
      },
    },
  },
});
