import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Product analytics for the desktop app.
 *
 * Stroke connects to people's production databases, so what is *not* stored
 * here is the design:
 *
 *   • no connection details, hostnames, database, schema or table names
 *   • no SQL, no query text, no row data
 *   • no IP address, no account, no email
 *   • no free-form strings at all — event names are validated against a fixed
 *     allowlist on ingest, so a future bug cannot turn a table name into a
 *     telemetry field
 *
 * The two tables are deliberately shaped so that a per-person activity trail
 * cannot be reconstructed from them. `appUsage` knows a device was active on a
 * day, and nothing about what it did. `appEvents` knows a feature was used N
 * times that day, and nothing about who used it. Answering "how many people use
 * Stroke" and "which features earn their keep" needs no more than that, and
 * joining the two tells you nothing extra.
 *
 * The device id is the same hashed machine fingerprint the free AI tier already
 * uses (`ai_device_id`), so this introduces no new identifier.
 */

/** One row per device per UTC day. Answers DAU/WAU/MAU, retention, and spread. */
export const appUsage = sqliteTable(
  "app_usage",
  {
    deviceId: text("device_id").notNull(),
    /** UTC day, YYYY-MM-DD. */
    day: text("day").notNull(),
    /** App version, e.g. "1.21.0". */
    version: text("version").notNull().default(""),
    /** "macos" | "windows" | "linux". */
    os: text("os").notNull().default(""),
    /** Times the app was opened on this day. */
    launches: integer("launches").notNull().default(0),
    /**
     * Days since this device was first seen, stamped at insert. Retention is a
     * cohort question, and keeping the answer per row means it can be asked
     * without a self-join over the whole table.
     */
    firstSeenDay: text("first_seen_day").notNull().default(""),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.day] })],
);

/**
 * Feature counters, aggregated at write time.
 *
 * No device id on purpose: this is the table that would otherwise become a
 * behavioural log. Counting into a shared bucket means the most granular
 * question it can answer is "how often was this used, on this day, on this
 * platform" — which is the question worth asking.
 */
export const appEvents = sqliteTable(
  "app_events",
  {
    /** UTC day, YYYY-MM-DD. */
    day: text("day").notNull(),
    /** From the ingest allowlist — never a caller-supplied string. */
    event: text("event").notNull(),
    os: text("os").notNull().default(""),
    version: text("version").notNull().default(""),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.event, t.os, t.version] })],
);
