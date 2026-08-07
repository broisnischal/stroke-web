import { and, eq, sql } from "drizzle-orm";

import { db } from "#/lib/db";
import { aiUsage, aiUsageGlobal, aiUsageIp } from "#/lib/db/schema";

/**
 * Free AI tier policy.
 *
 * Workers AI's free allocation is granted to the ACCOUNT, not to each user, so
 * every limit here is about protecting one shared pool. The global ceiling is
 * the only one that protects the bill; the per-device and per-IP caps exist so a
 * single user can't drain that pool before anyone else gets a turn.
 *
 * Tune these down first if the bill moves — they are deliberately conservative.
 */
export const FREE_TIER = {
  /** Requests one device may make per UTC day. */
  perDeviceDaily: 30,
  /** Requests one IP may make per UTC day (a device id can be regenerated). */
  perIpDaily: 90,
  /**
   * App-wide Workers AI requests per day. Past this we stop metering Cloudflare
   * and move to the overflow provider. Keep well under the free neuron
   * allocation: a tool-calling agent turn is far more expensive than one chat
   * completion, because each tool round trip is another request.
   */
  globalPrimaryDaily: 1_500,
  /** App-wide overflow requests per day, once the primary cap has tripped. */
  globalOverflowDaily: 1_500,
} as const;

/** Model served by the primary (Cloudflare) path. Tool calling is required. */
export const PRIMARY_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/**
 * Cheap model for turns with no tools. Verified against `wrangler ai models` —
 * an id that merely looks plausible (`...-8b-instruct-fast`) does not exist and
 * makes the binding throw, which surfaces to the user as a bare 502.
 */
export const FAST_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";

/**
 * Model served by the overflow (OpenRouter free pool) path.
 *
 * Must be a `:free` slug that supports tools — the agent is useless without
 * them. OpenRouter retires free slugs without notice (deepseek-chat-v3-0324:free
 * became paid-only and started answering 404 with "use this slug instead"), so
 * if overflow starts failing, re-check `supported_parameters` on
 * https://openrouter.ai/api/v1/models rather than assuming the key is wrong.
 */
export const OVERFLOW_MODELS = [
  "google/gemma-4-31b-it:free",
  "inclusionai/ling-3.0-flash:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "cohere/north-mini-code:free",
] as const;

/** @deprecated kept so a stale import can't break the build; prefer the list. */
export const OVERFLOW_MODEL = OVERFLOW_MODELS[0];

/**
 * The catalogue the desktop app shows. Deliberately tiny: these are aliases we
 * control, not raw upstream ids, so the routing can change underneath without
 * invalidating a model id someone has saved in a profile.
 */
export const FREE_MODELS = [
  { id: "stroke-free", description: "Free tier — routed automatically" },
  { id: "stroke-free-fast", description: "Free tier — smaller, faster model" },
] as const;

export type Decision =
  | { allow: true; provider: "primary" | "overflow"; day: string }
  | { allow: false; code: FreeTierErrorCode; retryAfter: number };

export type FreeTierErrorCode =
  | "device_quota_exhausted"
  | "ip_quota_exhausted"
  | "free_tier_exhausted";

/** UTC day key, YYYY-MM-DD. */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds until the next UTC midnight — the honest Retry-After for a daily cap. */
export function secondsUntilUtcMidnight(now = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
}

/**
 * Decide whether this request may proceed, and on which provider.
 *
 * Checked cheapest-and-most-specific first so an abusive device is rejected
 * without reading the global counters. Counters are read here and incremented by
 * `recordUsage` only once a provider actually accepted the request — a request
 * that fails upstream should not burn someone's daily allowance.
 */
export async function decide(deviceId: string, ip: string): Promise<Decision> {
  const day = utcDay();
  const retryAfter = secondsUntilUtcMidnight();

  const [deviceRow] = await db
    .select({ requests: aiUsage.requests })
    .from(aiUsage)
    .where(and(eq(aiUsage.deviceId, deviceId), eq(aiUsage.day, day)))
    .limit(1);

  if ((deviceRow?.requests ?? 0) >= FREE_TIER.perDeviceDaily) {
    return { allow: false, code: "device_quota_exhausted", retryAfter };
  }

  const [ipRow] = await db
    .select({ requests: aiUsageIp.requests })
    .from(aiUsageIp)
    .where(and(eq(aiUsageIp.ip, ip), eq(aiUsageIp.day, day)))
    .limit(1);

  if ((ipRow?.requests ?? 0) >= FREE_TIER.perIpDaily) {
    return { allow: false, code: "ip_quota_exhausted", retryAfter };
  }

  const [globalRow] = await db
    .select({
      primaryRequests: aiUsageGlobal.primaryRequests,
      overflowRequests: aiUsageGlobal.overflowRequests,
    })
    .from(aiUsageGlobal)
    .where(eq(aiUsageGlobal.day, day))
    .limit(1);

  const usedPrimary = globalRow?.primaryRequests ?? 0;
  const usedOverflow = globalRow?.overflowRequests ?? 0;

  if (usedPrimary < FREE_TIER.globalPrimaryDaily) {
    return { allow: true, provider: "primary", day };
  }
  if (usedOverflow < FREE_TIER.globalOverflowDaily) {
    return { allow: true, provider: "overflow", day };
  }
  return { allow: false, code: "free_tier_exhausted", retryAfter };
}

/**
 * Book a served request against all three counters.
 *
 * Upserts rather than read-modify-write so concurrent requests can't lose an
 * increment — the whole point of these rows is that they never undercount.
 */
export async function recordUsage(opts: {
  deviceId: string;
  ip: string;
  day: string;
  provider: "primary" | "overflow";
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  const { deviceId, ip, day, provider } = opts;
  const inTok = opts.inputTokens ?? 0;
  const outTok = opts.outputTokens ?? 0;

  await Promise.all([
    db
      .insert(aiUsage)
      .values({
        deviceId,
        day,
        requests: 1,
        inputTokens: inTok,
        outputTokens: outTok,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [aiUsage.deviceId, aiUsage.day],
        set: {
          requests: sql`${aiUsage.requests} + 1`,
          inputTokens: sql`${aiUsage.inputTokens} + ${inTok}`,
          outputTokens: sql`${aiUsage.outputTokens} + ${outTok}`,
          lastSeenAt: new Date(),
        },
      }),

    db
      .insert(aiUsageIp)
      .values({ ip, day, requests: 1 })
      .onConflictDoUpdate({
        target: [aiUsageIp.ip, aiUsageIp.day],
        set: { requests: sql`${aiUsageIp.requests} + 1` },
      }),

    db
      .insert(aiUsageGlobal)
      .values({
        day,
        requests: 1,
        primaryRequests: provider === "primary" ? 1 : 0,
        overflowRequests: provider === "overflow" ? 1 : 0,
      })
      .onConflictDoUpdate({
        target: aiUsageGlobal.day,
        set: {
          requests: sql`${aiUsageGlobal.requests} + 1`,
          primaryRequests:
            provider === "primary"
              ? sql`${aiUsageGlobal.primaryRequests} + 1`
              : sql`${aiUsageGlobal.primaryRequests}`,
          overflowRequests:
            provider === "overflow"
              ? sql`${aiUsageGlobal.overflowRequests} + 1`
              : sql`${aiUsageGlobal.overflowRequests}`,
        },
      }),
  ]);
}

/** Remaining per-device allowance, for the client to show in the composer. */
export async function remainingForDevice(deviceId: string): Promise<number> {
  const day = utcDay();
  const [row] = await db
    .select({ requests: aiUsage.requests })
    .from(aiUsage)
    .where(and(eq(aiUsage.deviceId, deviceId), eq(aiUsage.day, day)))
    .limit(1);
  return Math.max(0, FREE_TIER.perDeviceDaily - (row?.requests ?? 0));
}

/**
 * The desktop app sends its device id as a bearer token. It is not a secret and
 * is not signed — the same trust model /api/license/trial already uses — so it
 * identifies a device for quota purposes and nothing more. Never let it grant
 * access to anything but the free tier.
 */
export function deviceIdFrom(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const id = bearer || (request.headers.get("x-stroke-device") ?? "").trim();
  if (!id || id.length < 8 || id.length > 200) return null;
  return id;
}

export function ipFrom(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Error body shaped so the desktop client can branch on `error.code`. */
export function quotaError(code: FreeTierErrorCode, retryAfter: number): Response {
  const message =
    code === "free_tier_exhausted"
      ? "Stroke's free AI is at capacity for today. Add your own API key in Settings → AI, or upgrade to Pro."
      : "You've used today's free AI requests. They reset at midnight UTC — or add your own API key in Settings → AI.";

  return Response.json(
    { error: { code, message, type: "rate_limit_error" } },
    { status: 429, headers: { "retry-after": String(retryAfter) } },
  );
}
