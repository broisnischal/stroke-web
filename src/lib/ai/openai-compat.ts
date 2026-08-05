/**
 * Workers AI → OpenAI wire-format translation.
 *
 * The AI binding answers in its OWN shape — `{ response, tool_calls, usage }` —
 * not OpenAI's `{ choices: [{ message }] }`. Every client we care about (the
 * desktop app, and anything else pointed at an "OpenAI-compatible" base URL)
 * reads `choices[0].message`, so without this layer a working model still looks
 * like a broken endpoint. Tool calls need particular care: Workers AI returns
 * `arguments` as an OBJECT, OpenAI requires a JSON STRING.
 */

/**
 * Flatten OpenAI's array-form message content into the plain string Workers AI
 * requires.
 *
 * OpenAI accepts `content: [{ type: "text", text: "…" }]` as well as a bare
 * string, and clients legitimately send either. Workers AI accepts only the
 * string: hand it the array and the model receives what looks like an empty
 * object, then answers "your input is not sufficient / not properly formatted"
 * — a confusing refusal that looks like a broken assistant rather than a
 * format mismatch. Tool results and multi-part messages both hit this.
 */
export function normalizeMessages(messages: unknown[]): unknown[] {
  return messages.map((m) => {
    const msg = m as { role?: string; content?: unknown };
    if (typeof msg.content === "string" || msg.content == null) return m;

    if (Array.isArray(msg.content)) {
      const text = msg.content
        .map((part) => {
          const p = part as { type?: string; text?: string };
          if (typeof part === "string") return part;
          // Non-text parts (images) have no representation here; dropping them is
          // better than passing an object the model will read as empty.
          return p?.type === "text" || typeof p?.text === "string" ? (p.text ?? "") : "";
        })
        .filter(Boolean)
        .join("\n");
      return { ...msg, content: text };
    }

    // Any other shape (a bare object) would read as empty — stringify it so the
    // model at least sees the payload.
    return { ...msg, content: JSON.stringify(msg.content) };
  });
}

type WorkersAiToolCall = { name?: string; arguments?: unknown };

type WorkersAiResult = {
  response?: string | null;
  tool_calls?: WorkersAiToolCall[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    neurons?: number;
  };
};

/** OpenAI wants a JSON string for tool arguments; Workers AI hands back an object. */
function toolCallsToOpenAi(calls: WorkersAiToolCall[] | undefined) {
  if (!Array.isArray(calls) || calls.length === 0) return undefined;
  return calls.map((c, i) => ({
    index: i,
    id: `call_${i}_${(c.name ?? "fn").replace(/[^\w-]/g, "")}`,
    type: "function" as const,
    function: {
      name: c.name ?? "",
      arguments:
        typeof c.arguments === "string"
          ? c.arguments
          : JSON.stringify(c.arguments ?? {}),
    },
  }));
}

/** Neurons actually consumed, when the binding reports them. Used for metering. */
export function neuronsUsed(raw: unknown): number {
  const usage = (raw as WorkersAiResult)?.usage;
  return typeof usage?.neurons === "number" ? usage.neurons : 0;
}

/** Wrap a non-streaming Workers AI result as an OpenAI chat completion. */
export function toOpenAiCompletion(raw: unknown, model: string) {
  const r = (raw ?? {}) as WorkersAiResult;
  const toolCalls = toolCallsToOpenAi(r.tool_calls);
  return {
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: r.response ?? null,
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: toolCalls ? "tool_calls" : "stop",
      },
    ],
    usage: {
      prompt_tokens: r.usage?.prompt_tokens ?? 0,
      completion_tokens: r.usage?.completion_tokens ?? 0,
      total_tokens: r.usage?.total_tokens ?? 0,
    },
  };
}

/**
 * Re-frame a Workers AI SSE stream as OpenAI `chat.completion.chunk` events.
 *
 * Workers AI emits `data: {"response":"tok"}`; OpenAI clients expect
 * `data: {"choices":[{"delta":{"content":"tok"}}]}` and a terminating
 * `data: [DONE]`. Buffering is line-based because a network chunk can split an
 * SSE frame mid-JSON — parsing per network chunk drops tokens under load.
 */
export function toOpenAiStream(source: ReadableStream, model: string): ReadableStream {
  const id = `chatcmpl-${crypto.randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let closed = false;

  const frame = (delta: Record<string, unknown>, finish: string | null) =>
    encoder.encode(
      `data: ${JSON.stringify({
        id,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [{ index: 0, delta, finish_reason: finish }],
      })}\n\n`,
    );

  return new ReadableStream({
    async start(controller) {
      const reader = source.getReader();
      // Clients treat the first chunk as the turn opening; send the role up front
      // so a stream that only produces tool calls still looks well-formed.
      controller.enqueue(frame({ role: "assistant" }, null));

      const finish = (reason: string) => {
        if (closed) return;
        closed = true;
        controller.enqueue(frame({}, reason));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            if (payload === "[DONE]") {
              finish("stop");
              return;
            }
            let parsed: WorkersAiResult;
            try {
              parsed = JSON.parse(payload) as WorkersAiResult;
            } catch {
              continue; // a frame we don't understand is not worth killing the turn
            }
            const toolCalls = toolCallsToOpenAi(parsed.tool_calls);
            if (toolCalls) {
              controller.enqueue(frame({ tool_calls: toolCalls }, null));
              continue;
            }
            if (typeof parsed.response === "string" && parsed.response.length > 0) {
              controller.enqueue(frame({ content: parsed.response }, null));
            }
          }
        }
        finish("stop");
      } catch (err) {
        if (!closed) {
          closed = true;
          controller.error(err);
        }
      }
    },
  });
}
