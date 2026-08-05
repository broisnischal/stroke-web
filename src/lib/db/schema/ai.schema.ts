import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Per-device daily usage of the free AI tier.
 *
 * Keyed on the same `device_id` the desktop app already sends to
 * /api/license/trial, so the free tier needs no second identity and no signup.
 * Rows are per UTC day, which keeps the reset trivial (a new key) and lets old
 * rows be swept without touching live counters.
 */
export const aiUsage = sqliteTable(
  "ai_usage",
  {
    deviceId: text("device_id").notNull(),
    /** UTC day, YYYY-MM-DD. */
    day: text("day").notNull(),
    requests: integer("requests").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.day] })],
);

/**
 * Same, keyed by IP. A device id can be regenerated at will; the IP is the only
 * brake we have on that without putting a signup wall in front of the feature.
 */
export const aiUsageIp = sqliteTable(
  "ai_usage_ip",
  {
    ip: text("ip").notNull(),
    day: text("day").notNull(),
    requests: integer("requests").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.ip, t.day] })],
);

/**
 * App-wide daily totals — the wallet guard.
 *
 * Workers AI's free allocation is shared across EVERY user, not granted per
 * user, so this counter (not the per-device one) is what stops the free tier
 * from turning into a bill. When it trips, traffic moves to the overflow
 * provider and then to a typed 429.
 */
export const aiUsageGlobal = sqliteTable("ai_usage_global", {
  day: text("day").primaryKey(),
  requests: integer("requests").notNull().default(0),
  /** Requests served by Workers AI (the metered path). */
  primaryRequests: integer("primary_requests").notNull().default(0),
  /** Requests served by the overflow provider once the cap tripped. */
  overflowRequests: integer("overflow_requests").notNull().default(0),
});
