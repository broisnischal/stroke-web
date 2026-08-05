import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";

import { env as serverEnv } from "#/env/server";
import {
  neuronsUsed,
  normalizeMessages,
  toOpenAiCompletion,
  toOpenAiStream,
} from "#/lib/ai/openai-compat";

import {
  decide,
  deviceIdFrom,
  FAST_MODEL,
  ipFrom,
  OVERFLOW_MODEL,
  PRIMARY_MODEL,
  quotaError,
  recordUsage,
} from "#/lib/ai/free-tier";

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

        // TEMPORARY diagnostic: the desktop app gets refusals that curl with the
        // same nominal shape does not, so log what actually arrives. Remove once
        // the discrepancy is identified.
        console.log(
          "ai-req",
          JSON.stringify({
            model: body.model,
            stream: body.stream,
            temperature: body.temperature,
            max_tokens: body.max_tokens,
            toolCount: Array.isArray(body.tools) ? body.tools.length : 0,
            msgs: (body.messages as { role?: string; content?: unknown }[]).map((m) => ({
              role: m.role,
              type: Array.isArray(m.content) ? "array" : typeof m.content,
              len:
                typeof m.content === "string"
                  ? m.content.length
                  : JSON.stringify(m.content ?? "").length,
            })),
          }),
        );
        const ip = ipFrom(request);
        const verdict = await decide(deviceId, ip);
        if (!verdict.allow) return quotaError(verdict.code, verdict.retryAfter);

        // The client may omit `stream`; OpenAI's default is false and the desktop
        // app states it explicitly. Never infer streaming from anything else —
        // answering a non-streaming request with SSE breaks the caller's parser.
        const stream = body.stream === true;

        const shared = {
          // Workers AI only understands string content; see normalizeMessages.
          messages: normalizeMessages(body.messages),
          temperature: body.temperature ?? 0,
          max_tokens: body.max_tokens ?? 4096,
          ...(Array.isArray(body.tools) && body.tools.length > 0
            ? { tools: body.tools, tool_choice: body.tool_choice ?? "auto" }
            : {}),
        };

        const runPrimary = async () => {
          // Model choice is made HERE, not by the client's alias, so cost and
          // capability stay in our hands:
          //   • tools present  → the 70B. Tool calling is what the database agent
          //     runs on, and the 8B is not dependable at it.
          //   • no tools       → the 8B. Greetings, explanations and "what can you
          //     do" have no business costing 70B neurons, and the shared daily
          //     allocation is what limits how many people we can serve.
          const model = hasTools || !wantsFast(body.model) ? PRIMARY_MODEL : FAST_MODEL;
          // The generated binding types key the options off a literal model-name
          // union, which cannot express a model chosen at runtime from our own
          // aliases — so the call is made through a narrow structural shim. The
          // binding speaks OpenAI's schema for chat models (messages, tools) and
          // returns a ReadableStream of SSE when `stream` is true.
          const ai = env.AI as unknown as {
            run: (model: string, options: Record<string, unknown>) => Promise<unknown>;
          };
          return await ai.run(model, { ...shared, stream });
        };

        const runOverflow = async () => {
          const key = serverEnv.OPENROUTER_POOL_KEY;
          if (!key) throw new Error("overflow provider not configured");
          return fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${key}`,
              "http-referer": "https://stroke.click",
              "x-title": "Stroke",
            },
            body: JSON.stringify({ ...shared, stream, model: OVERFLOW_MODEL }),
          });
        };

        // A provider that errors must not burn the user's daily allowance, so
        // usage is booked only after one of them accepts the request.
        let provider = verdict.provider;
        let raw: unknown;
        try {
          raw = provider === "primary" ? await runPrimary() : await runOverflow();
        } catch (primaryErr) {
          if (provider !== "primary") {
            return Response.json(
              {
                error: {
                  code: "upstream_unavailable",
                  message: "The free AI service is temporarily unavailable.",
                },
              },
              { status: 502 },
            );
          }
          // Workers AI refused (cold model, capacity, a bad tools payload it
          // won't take). Falling through to overflow keeps the user working
          // instead of handing them a dead assistant.
          try {
            raw = await runOverflow();
            provider = "overflow";
          } catch {
            console.error("free-tier: both providers failed", primaryErr);
            return Response.json(
              {
                error: {
                  code: "upstream_unavailable",
                  message: "The free AI service is temporarily unavailable.",
                },
              },
              { status: 502 },
            );
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
          await recordUsage({ deviceId, ip, day: verdict.day, provider });
          return new Response(raw.body, {
            status: 200,
            headers: {
              "content-type":
                raw.headers.get("content-type") ??
                (stream ? "text/event-stream" : "application/json"),
              "cache-control": "no-cache",
              "x-stroke-provider": provider,
            },
          });
        }

        // Everything below is the Workers AI path, which answers in its own shape
        // and must be translated before it reaches an OpenAI-shaped client.
        const clientModel = body.model ?? "stroke-free";

        if (stream) {
          await recordUsage({ deviceId, ip, day: verdict.day, provider });
          return new Response(toOpenAiStream(raw as ReadableStream, clientModel), {
            status: 200,
            headers: {
              "content-type": "text/event-stream",
              "cache-control": "no-cache",
              connection: "keep-alive",
              "x-stroke-provider": provider,
            },
          });
        }

        const completion = toOpenAiCompletion(raw, clientModel);
        await recordUsage({
          deviceId,
          ip,
          day: verdict.day,
          provider,
          inputTokens: completion.usage.prompt_tokens,
          outputTokens: completion.usage.completion_tokens,
        });
        return Response.json(completion, {
          headers: {
            "x-stroke-provider": provider,
            // The binding reports real neurons consumed — exact metering, no estimate.
            "x-stroke-neurons": String(neuronsUsed(raw)),
          },
        });
      },
    },
  },
});
