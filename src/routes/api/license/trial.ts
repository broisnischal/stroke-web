import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { deviceTrials } from "#/lib/db/schema";

/** Free-trial length in days. Keep in sync with the desktop app (license.rs). */
const TRIAL_DAYS = 17;
const DAY_MS = 86_400_000;

/**
 * POST /api/license/trial
 *
 * Server-authoritative trial clock, keyed by device fingerprint. The desktop
 * app calls this on launch with its `device_id` (and optionally the local
 * `started_at` it has on file). The server records the start the first time it
 * sees a device and always keeps the EARLIEST start thereafter — so a
 * reinstall or disk wipe can't reset the trial, and the clock can't be moved
 * forward.
 *
 * Body: { device_id: string, hostname?: string, started_at?: number (unix secs) }
 * Returns: { started_at, trial_days, days_remaining, expired }
 */
export const Route = createFileRoute("/api/license/trial")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { device_id?: string; hostname?: string; started_at?: number };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const deviceId = body.device_id;
        if (!deviceId || typeof deviceId !== "string") {
          return Response.json({ error: "missing_fields" }, { status: 400 });
        }

        const now = new Date();
        const nowMs = now.getTime();

        // The client's local start (unix seconds → ms), never in the future.
        const clientMs =
          typeof body.started_at === "number" && Number.isFinite(body.started_at)
            ? Math.min(body.started_at * 1000, nowMs)
            : nowMs;

        const rows = await db
          .select()
          .from(deviceTrials)
          .where(eq(deviceTrials.deviceId, deviceId))
          .limit(1);

        let startedMs: number;
        if (rows.length > 0) {
          const existing = rows[0]!;
          // Earliest-wins: the trial start can only ever move earlier, never later.
          startedMs = Math.min(existing.startedAt.getTime(), clientMs);
          await db
            .update(deviceTrials)
            .set({
              startedAt: new Date(startedMs),
              lastSeenAt: now,
              hostname: body.hostname ?? existing.hostname,
            })
            .where(eq(deviceTrials.deviceId, deviceId));
        } else {
          startedMs = clientMs;
          await db.insert(deviceTrials).values({
            deviceId,
            startedAt: new Date(startedMs),
            hostname: body.hostname ?? null,
            lastSeenAt: now,
          });
        }

        const elapsedDays = Math.floor((nowMs - startedMs) / DAY_MS);
        const daysRemaining = TRIAL_DAYS - elapsedDays;

        return Response.json({
          started_at: Math.floor(startedMs / 1000),
          trial_days: TRIAL_DAYS,
          days_remaining: daysRemaining,
          expired: daysRemaining <= 0,
        });
      },
    },
  },
});
