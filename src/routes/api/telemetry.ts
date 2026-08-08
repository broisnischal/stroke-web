import { createFileRoute } from "@tanstack/react-router";

import { deviceIdFrom } from "#/lib/ai/free-tier";
import { isTelemetryEvent, normalizeOs, normalizeVersion } from "#/lib/telemetry/events";
import { MAX_EVENTS_PER_BATCH, recordBatch } from "#/lib/telemetry/service";

/**
 * POST /api/telemetry
 *
 * Anonymous product analytics from the desktop app. Body:
 *
 *   { os, version, launched, events: { [name]: count } }
 *
 * Every field is validated rather than trusted: event names must be on the
 * allowlist, the OS must be one of three known values, and the version must
 * match a version shape. Anything else is dropped and counted, so a client bug
 * shows up in `rejected` instead of writing a caller-supplied string into a
 * primary key column.
 *
 * Always answers 200 with a body. A client that batches in the background must
 * never retry into a loop over a payload the server will never accept, and it
 * must never surface a telemetry failure to the user.
 */
export const Route = createFileRoute("/api/telemetry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deviceId = deviceIdFrom(request);
        if (!deviceId) return Response.json({ ok: false, reason: "missing_device" });

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, reason: "invalid_json" });
        }

        const raw = body.events;
        const entries =
          raw && typeof raw === "object" && !Array.isArray(raw)
            ? Object.entries(raw as Record<string, unknown>)
            : [];

        const counts = new Map<string, number>();
        let rejected = 0;
        for (const [name, value] of entries) {
          if (counts.size >= MAX_EVENTS_PER_BATCH) {
            rejected += 1;
            continue;
          }
          const n = Math.floor(Number(value));
          // A count has to be a real, positive, sane number: a negative would
          // subtract from a shared counter, and an enormous one would poison it.
          if (!isTelemetryEvent(name) || !Number.isFinite(n) || n <= 0 || n > 10_000) {
            rejected += 1;
            continue;
          }
          counts.set(name, n);
        }

        try {
          await recordBatch({
            deviceId,
            os: normalizeOs(body.os),
            version: normalizeVersion(body.version),
            counts,
            launched: body.launched === true,
          });
        } catch (err) {
          // Analytics must never be the reason a request fails loudly. Log it
          // and answer 200 so the client drops the batch instead of retrying.
          console.error("telemetry: write failed", err);
          return Response.json({ ok: false, reason: "write_failed" });
        }

        return Response.json({ ok: true, accepted: counts.size, rejected });
      },
    },
  },
});
