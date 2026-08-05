# Free AI tier — spec

Goal: a user opens Stroke and the AI works with **zero configuration** — no key, no
signup. Served from `stroke.click`. Cost to us must stay at/near $0, which means a
real quota, not unmetered inference.

Decisions (made 2026-08-05, by the project owner):

- **Inference:** Cloudflare Workers AI as primary; **pooled OpenRouter free models as
  overflow** when the Workers AI daily cap is hit, instead of hard-failing.
- **Gating:** anonymous **device token** minted on first launch. No signup wall.

## Why a cap is non-negotiable

Workers AI includes ~10k neurons/day free, then bills at ~$0.011/1k neurons. That
allocation is **shared across every Stroke user**, not per user — a few hundred short
chats/day total. Without an app-wide ceiling this quietly becomes a bill. The ceiling
is the feature, not a safeguard bolted on later.

Order of degradation: Workers AI → OpenRouter free pool → "free tier used up, add your
own key or upgrade to Pro" (bring-your-own-key already works today).

## Backend (`stroke-web` — TanStack Start on Workers, D1 `stroke-web`)

Add to `wrangler.toml`:

```toml
[ai]
binding = "AI"
```

Secret: `OPENROUTER_POOL_KEY` (overflow), `ANON_TOKEN_SECRET` (HMAC for device tokens).

### Endpoints

| Route | Purpose |
| --- | --- |
| `POST /v1/anon` | Mint a signed device token. Body: `{ installId }`. Returns `{ token, expiresAt }`. HMAC-SHA256 over `installId + issuedAt` with `ANON_TOKEN_SECRET`; ~30d expiry, renewable. |
| `GET /v1/models` | Curated free list (OpenAI `{data:[{id}]}` shape) so the existing model picker's live discovery works unchanged. |
| `POST /v1/chat/completions` | OpenAI-compatible, **must support SSE streaming and tool calls**. Routes to Workers AI, falls through to OpenRouter on cap/error. |

### Quota (D1, drizzle migration)

```sql
CREATE TABLE ai_usage (
  device_id   TEXT NOT NULL,
  day         TEXT NOT NULL,          -- UTC YYYY-MM-DD
  requests    INTEGER NOT NULL DEFAULT 0,
  input_tok   INTEGER NOT NULL DEFAULT 0,
  output_tok  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, day)
);
CREATE TABLE ai_usage_global (
  day         TEXT PRIMARY KEY,
  requests    INTEGER NOT NULL DEFAULT 0,
  neurons     INTEGER NOT NULL DEFAULT 0
);
```

Enforce, in order, before touching a model:

1. Valid, unexpired device token (else 401).
2. Per-device daily request cap (start ~30/day).
3. Per-IP daily cap (blunt anti-farm; a re-minted token still shares the IP).
4. **Global daily ceiling** — the wallet guard. Over it → overflow provider, then 429
   with `{ error: { code: "free_tier_exhausted" } }` so the client can show the right
   message instead of a generic failure.

## Model choice — tool calling is the constraint

The DB agent depends on tool calls (`list_tables`, `run_query`, …). Verify before
committing a default:

- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` — expected default, supports tools.
- 8B-class models are unreliable at tool calls — acceptable as a fallback for plain
  chat, not for the agent path.

Confirm tool-call behaviour against the real binding, the way Ollama/OmniRoute were
verified with curl, before shipping.

## Desktop client (`db-studio`)

1. New provider in `src/lib/stores/ai-settings.js`:
   `{ id: 'stroke', label: 'Stroke Free', url: 'https://stroke.click/v1', keysUrl: null }`
   with `PROVIDER_MODELS.stroke = []` (discovered from `/v1/models`).
2. **Make it the default profile.** `makeDefaultProfile()` currently returns OpenRouter
   `deepseek-chat-v3-0324:free`, which is dead on arrival without a key — a new user's
   AI is broken out of the box today. This is the actual onboarding fix.
3. Device token: mint on first launch, store via the existing secure-store commands
   (`ai_store_key`-style keychain path, not localStorage). Send as
   `Authorization: Bearer <deviceToken>`, so the existing request path needs no change.
4. Hide the API-key field for this provider (same treatment as Ollama) and surface
   remaining quota + the exhausted state in the composer.
5. `isAiConfigured()` must return true for it with no key present.

## Client-side notes already learned

- `chatCompletionRaw` sends `stream: false` explicitly — the gateway must honour it and
  return JSON, not SSE. (OmniRoute got this wrong and broke the Test button.)
- Live `/v1/models` discovery + the local-model grid already exist in
  `AiSettingsDialog.svelte`; reuse them rather than adding a new UI.

## Open items

- Neuron accounting: Workers AI usage is not returned per request in an obvious form —
  decide whether to meter on tokens and convert, or track request counts with a
  conservative per-request neuron estimate.
- Abuse: a determined user can re-mint device tokens. IP cap is the only real brake
  without a signup. Revisit if it is actually abused, not before.
- Pro tier already exists (Dodo licensing) — decide whether a licence lifts the free
  quota, and where that check lives.
