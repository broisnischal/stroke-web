import { and, desc, gte, sql } from "drizzle-orm";

import { db } from "#/lib/db";
import { appEvents, appUsage } from "#/lib/db/schema";

import { utcDay } from "./events";

/** How many distinct events one request may carry. Keeps a bad client bounded. */
export const MAX_EVENTS_PER_BATCH = 40;

type Batch = {
  deviceId: string;
  os: string;
  version: string;
  /** event -> count, already validated and normalized by the caller. */
  counts: Map<string, number>;
  launched: boolean;
};

/**
 * Fold one batch into the day's counters.
 *
 * Everything is an upsert against a composite primary key, so a retry — which a
 * fire-and-forget client will do — adds to the count rather than creating a
 * duplicate row, and a device that reports nothing simply has no row.
 */
export async function recordBatch({ deviceId, os, version, counts, launched }: Batch) {
  const day = utcDay();

  await db
    .insert(appUsage)
    .values({
      deviceId,
      day,
      os,
      version,
      launches: launched ? 1 : 0,
      firstSeenDay: day,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [appUsage.deviceId, appUsage.day],
      set: {
        launches: sql`${appUsage.launches} + ${launched ? 1 : 0}`,
        // Version and OS take the latest value: an upgrade mid-day should be
        // reported as the version they ended on, not the one they started with.
        os,
        version,
        lastSeenAt: new Date(),
      },
    });

  if (counts.size === 0) return;

  // One statement per event: D1 has no multi-row upsert with per-row increments,
  // and the batch is capped at MAX_EVENTS_PER_BATCH so this stays bounded.
  await Promise.all(
    [...counts].map(([event, count]) =>
      db
        .insert(appEvents)
        .values({ day, event, os, version, count })
        .onConflictDoUpdate({
          target: [appEvents.day, appEvents.event, appEvents.os, appEvents.version],
          set: { count: sql`${appEvents.count} + ${count}` },
        }),
    ),
  );
}

/** `days` ago, as a UTC day string. */
function dayOffset(days: number): string {
  return utcDay(new Date(Date.now() - days * 86_400_000));
}

/**
 * The numbers worth looking at, in one round trip each.
 *
 * Active-device counts are `COUNT(DISTINCT device_id)` over the window rather
 * than a stored aggregate, so they stay correct no matter how the app batches.
 */
export async function usageSummary(windowDays = 30) {
  const since = dayOffset(windowDays);
  const today = utcDay();

  const distinctSince = async (from: string) => {
    const [row] = await db
      .select({ n: sql<number>`count(distinct ${appUsage.deviceId})` })
      .from(appUsage)
      .where(gte(appUsage.day, from));
    return Number(row?.n ?? 0);
  };

  const [dau, wau, mau] = await Promise.all([
    distinctSince(today),
    distinctSince(dayOffset(6)),
    distinctSince(dayOffset(29)),
  ]);

  const daily = await db
    .select({
      day: appUsage.day,
      devices: sql<number>`count(distinct ${appUsage.deviceId})`,
      launches: sql<number>`sum(${appUsage.launches})`,
    })
    .from(appUsage)
    .where(gte(appUsage.day, since))
    .groupBy(appUsage.day)
    .orderBy(appUsage.day);

  const byOs = await db
    .select({ os: appUsage.os, devices: sql<number>`count(distinct ${appUsage.deviceId})` })
    .from(appUsage)
    .where(gte(appUsage.day, since))
    .groupBy(appUsage.os);

  const byVersion = await db
    .select({
      version: appUsage.version,
      devices: sql<number>`count(distinct ${appUsage.deviceId})`,
    })
    .from(appUsage)
    .where(gte(appUsage.day, since))
    .groupBy(appUsage.version)
    .orderBy(desc(sql`count(distinct ${appUsage.deviceId})`));

  const features = await db
    .select({ event: appEvents.event, count: sql<number>`sum(${appEvents.count})` })
    .from(appEvents)
    .where(gte(appEvents.day, since))
    .groupBy(appEvents.event)
    .orderBy(desc(sql`sum(${appEvents.count})`));

  /** Devices whose first day was in the window and that came back on another day. */
  const [retention] = await db
    .select({
      cohort: sql<number>`count(distinct ${appUsage.deviceId})`,
      returned: sql<number>`count(distinct case when ${appUsage.day} > ${appUsage.firstSeenDay} then ${appUsage.deviceId} end)`,
    })
    .from(appUsage)
    .where(and(gte(appUsage.firstSeenDay, since), sql`${appUsage.firstSeenDay} <> ''`));

  return {
    windowDays,
    active: { today: dau, sevenDay: wau, thirtyDay: mau },
    daily: daily.map((d) => ({
      ...d,
      devices: Number(d.devices),
      launches: Number(d.launches ?? 0),
    })),
    byOs: byOs.map((r) => ({ os: r.os || "unknown", devices: Number(r.devices) })),
    byVersion: byVersion.map((r) => ({
      version: r.version || "unknown",
      devices: Number(r.devices),
    })),
    features: features.map((r) => ({ event: r.event, count: Number(r.count) })),
    retention: {
      cohort: Number(retention?.cohort ?? 0),
      returned: Number(retention?.returned ?? 0),
    },
  };
}
