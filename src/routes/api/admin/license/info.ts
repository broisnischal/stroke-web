import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { activations, licenses } from "#/lib/db/schema";
import { requireAdminSecret } from "#/lib/license/admin-auth";

// GET /api/admin/license/info?license_key=... OR ?user_id=...
// Header: Authorization: Bearer <LICENSE_ADMIN_SECRET>
export const Route = createFileRoute("/api/admin/license/info")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deny = requireAdminSecret(request);
        if (deny) return deny;

        const url = new URL(request.url);
        const license_key = url.searchParams.get("license_key");
        const user_id = url.searchParams.get("user_id");

        if (!license_key && !user_id) {
          return Response.json(
            { error: "provide license_key or user_id query param" },
            { status: 400 },
          );
        }

        const where = license_key
          ? eq(licenses.licenseKey, license_key)
          : eq(licenses.userId, user_id!);

        const rows = await db.select().from(licenses).where(where).limit(1);
        if (rows.length === 0) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        const license = rows[0]!;
        const devices = await db
          .select()
          .from(activations)
          .where(eq(activations.licenseId, license.id));

        return Response.json({
          id: license.id,
          user_id: license.userId,
          plan: license.plan,
          max_devices: license.maxDevices,
          issued_at: license.issuedAt,
          expires_at: license.expiresAt,
          revoked_at: license.revokedAt,
          devices: devices.map((d) => ({
            device_id: d.deviceId,
            hostname: d.hostname,
            activated_at: d.activatedAt,
            last_seen_at: d.lastSeenAt,
          })),
        });
      },

      // DELETE clears all active device seats (but keeps the license itself)
      DELETE: async ({ request }) => {
        const deny = requireAdminSecret(request);
        if (deny) return deny;

        const url = new URL(request.url);
        const license_key = url.searchParams.get("license_key");
        const user_id = url.searchParams.get("user_id");

        if (!license_key && !user_id) {
          return Response.json(
            { error: "provide license_key or user_id query param" },
            { status: 400 },
          );
        }

        const where = license_key
          ? eq(licenses.licenseKey, license_key)
          : eq(licenses.userId, user_id!);

        const rows = await db.select({ id: licenses.id }).from(licenses).where(where).limit(1);
        if (rows.length === 0) {
          return Response.json({ error: "not_found" }, { status: 404 });
        }

        await db.delete(activations).where(eq(activations.licenseId, rows[0]!.id));

        return Response.json({ success: true, message: "all device seats cleared" });
      },
    },
  },
});
