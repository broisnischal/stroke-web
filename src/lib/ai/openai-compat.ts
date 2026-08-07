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
      arguments: typeof c.arguments === "string" ? c.arguments : JSON.stringify(c.arguments ?? {}),
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

/**
 * A refusal produced by the tool template rather than by the user's request.
 *
 * Handed a dozen tool definitions and a plain "hi", Workers AI's llama template
 * has no tool to reach for and no permission to just chat, so it answers "your
 * input is not sufficient" — which reads to the user as a broken assistant on
 * the very first message they ever send. The text is the only signal we get:
 * there is no flag on the response that says "I declined because of the tools".
 */
const TOOL_REFUSAL =
  /^[\s"'*]*(?:(?:your |the )?input is (?:not sufficient|incomplete|not properly formatted|insufficient)|i (?:don'?t|do not) have enough (?:information|context)|please (?:provide (?:more|further) (?:details|information)|specify the task))/i;

export function looksLikeToolRefusal(text: string | null | undefined): boolean {
  return typeof text === "string" && TOOL_REFUSAL.test(text.trim());
}

/**
 * Could this opening still turn into a refusal?
 *
 * Buffering a whole answer to find out costs the user their streaming — the
 * tokens stop arriving one at a time and land in a lump at the end. So the
 * decision is made on the first couple of dozen characters: only an opening
 * that could still become a refusal is worth reading further, and everything
 * else is forwarded immediately.
 */
const REFUSAL_OPENING =
  /^[\s"'*]*(?:(?:your |the )?input (?:is\b.*)?$|(?:your |the )?inpu?t?$|i (?:don'?t|do not)(?: have(?: enough)?)?$|i$|please(?: provide| specify)?$|(?:your |the )?input is (?:not|inc|ins))/i;

export function mightBecomeRefusal(head: string): boolean {
  return looksLikeToolRefusal(head) || REFUSAL_OPENING.test(head.trim());
}

/**
 * Read the opening of a Workers AI stream without consuming it.
 *
 * Lets the caller see what the model is about to say — enough to catch a tool
 * refusal and start over before the client has been shown a single token — and
 * hands back a stream that still replays from the very first byte.
 */
export async function peekStreamHead(
  source: ReadableStream,
  maxChars = 160,
): Promise<{ head: string; sawToolCall: boolean; stream: ReadableStream }> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  /** @type {Uint8Array[]} */
  const seen: Uint8Array[] = [];
  let head = "";
  let sawToolCall = false;
  let sourceDone = false;
  let carry = "";

  while (head.length < maxChars && !sawToolCall) {
    const { done, value } = await reader.read();
    if (done) {
      sourceDone = true;
      break;
    }
    seen.push(value);
    carry += decoder.decode(value, { stream: true });
    const lines = carry.split("\n");
    carry = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as WorkersAiResult;
        if (Array.isArray(parsed.tool_calls) && parsed.tool_calls.length > 0) sawToolCall = true;
        if (typeof parsed.response === "string") head += parsed.response;
      } catch {
        // A frame we can't parse tells us nothing; the real translator will
        // skip it too.
      }
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of seen) controller.enqueue(chunk);
      if (sourceDone) {
        controller.close();
        return;
      }
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  return { head, sawToolCall, stream };
}

// ── Tool calls the model typed instead of called ──────────────────────────────

/**
 * Some Workers AI llama builds answer a tool turn by *printing* the call —
 * `{"type": "function", "name": "list_tables", "parameters": {}}` lands in
 * `response` and `tool_calls` comes back empty. The client shows the user raw
 * JSON and the agent never runs, which is the single worst thing this endpoint
 * can do: it looks like the assistant is broken AND nothing happens.
 *
 * So text that is *only* a tool call is promoted back to a real one. Prose that
 * merely contains JSON is left alone — the test is that the whole message parses
 * as a call and nothing else.
 */
export function parseTextToolCalls(text: string | null | undefined): WorkersAiToolCall[] | null {
  if (typeof text !== "string") return null;
  let body = text.trim();
  if (!body) return null;

  // The same call arrives wearing different clothes depending on the build.
  body = body
    .replace(/^<\|?python_tag\|?>/i, "")
    .replace(/^<tool_call>/i, "")
    .replace(/<\/tool_call>$/i, "")
    .replace(/^```(?:json|tool_code)?/i, "")
    .replace(/```$/i, "")
    .trim();
  if (!body.startsWith("{") && !body.startsWith("[")) return null;

  // The model does not always stop at one: the same call often arrives twice,
  // back to back with no separator, which is not valid JSON as a whole.
  const chunks = splitJsonValues(body);
  if (chunks.length === 0) return null;

  const list: unknown[] = [];
  for (const chunk of chunks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(chunk);
    } catch {
      return null;
    }
    if (Array.isArray(parsed)) list.push(...parsed);
    else list.push(parsed);
  }
  const calls: WorkersAiToolCall[] = [];
  for (const entry of list) {
    const e = entry as Record<string, unknown>;
    const name = typeof e?.name === "string" ? e.name : undefined;
    if (!name) return null; // not a call — don't mangle whatever this is
    const args = e.parameters ?? e.arguments ?? e.input ?? {};
    if (typeof args !== "object" || args === null) return null;
    // A repeated call is the model stuttering, not two units of work — running
    // the same query twice would double the cost and, for a write, the damage.
    const seen = JSON.stringify({ name, args });
    if (calls.some((c) => JSON.stringify({ name: c.name, args: c.arguments }) === seen)) continue;
    calls.push({ name, arguments: args });
  }
  return calls.length > 0 ? calls : null;
}

/**
 * Split concatenated top-level JSON values (`{…}{…}`) into their pieces,
 * tracking string state so a brace inside a SQL literal doesn't end a value.
 */
function splitJsonValues(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(body.slice(start, i + 1));
        start = -1;
      }
      if (depth < 0) return [];
    }
  }
  // Unbalanced tail (a truncated stream) — better to show the text than to guess.
  return depth === 0 && start === -1 ? out : [];
}

/**
 * A Workers-AI-shaped SSE stream carrying nothing but these tool calls, so the
 * recovered call goes back through the same translation as a native one.
 */
export function toolCallStream(calls: WorkersAiToolCall[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ tool_calls: calls })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

/** Everything the model said, for a turn short enough that buffering is free. */
export async function collectStreamText(source: ReadableStream): Promise<string> {
  const reader = source.getReader();
  const decoder = new TextDecoder();
  let carry = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    const lines = carry.split("\n");
    carry = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as WorkersAiResult;
        if (typeof parsed.response === "string") text += parsed.response;
      } catch {
        // unparseable frame: nothing to collect
      }
    }
  }
  return text;
}
