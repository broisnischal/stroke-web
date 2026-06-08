import { createFileRoute } from "@tanstack/react-router";
import { and, count, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { activations, licenses } from "#/lib/db/schema";
import { verifyLicenseKey } from "#/lib/license/verify";

export const Route = createFileRoute("/api/license/activate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { key?: string; device_id?: string; hostname?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ valid: false, error: "invalid_json" }, { status: 400 });
        }

        const { key, device_id, hostname } = body;
        if (!key || !device_id) {
          return Response.json({ valid: false, error: "missing_fields" }, { status: 400 });
        }

        const result = verifyLicenseKey(key);
        if (!result.valid) {
          return Response.json({ valid: false, error: result.error });
        }

        const licenseRows = await db
          .select()
          .from(licenses)
          .where(eq(licenses.licenseKey, key))
          .limit(1);

        if (licenseRows.length === 0) {
          return Response.json({ valid: false, error: "not_found" });
        }

        const license = licenseRows[0]!;

        if (license.revokedAt) {
          return Response.json({ valid: false, error: "revoked" });
        }

        const now = new Date();

        const existing = await db
          .select()
          .from(activations)
          .where(and(eq(activations.licenseId, license.id), eq(activations.deviceId, device_id)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(activations)
            .set({ lastSeenAt: now, hostname: hostname ?? null })
            .where(eq(activations.id, existing[0]!.id));
        } else {
          const countRows = await db
            .select({ total: count() })
            .from(activations)
            .where(eq(activations.licenseId, license.id));

          const total = countRows[0]?.total ?? 0;

          if (total >= license.maxDevices) {
            return Response.json({
              valid: false,
              error: "seat_limit_exceeded",
              seats_used: total,
              seats_max: license.maxDevices,
            });
          }

          await db.insert(activations).values({
            id: crypto.randomUUID(),
            licenseId: license.id,
            deviceId: device_id,
            hostname: hostname ?? null,
            activatedAt: now,
            lastSeenAt: now,
          });
        }

        const afterRows = await db
          .select({ total: count() })
          .from(activations)
          .where(eq(activations.licenseId, license.id));

        return Response.json({
          valid: true,
          plan: license.plan,
          expires_at: license.expiresAt ? Math.floor(license.expiresAt.getTime() / 1000) : null,
          seats_used: afterRows[0]?.total ?? 1,
          seats_max: license.maxDevices,
        });
      },
    },
  },
});
