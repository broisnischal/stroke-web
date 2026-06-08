import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { licenses } from "#/lib/db/schema";
import { requireAdminSecret } from "#/lib/license/admin-auth";

// POST /api/admin/license/revoke
// Body: { license_key: string } OR { user_id: string }
// Header: Authorization: Bearer <LICENSE_ADMIN_SECRET>
export const Route = createFileRoute("/api/admin/license/revoke")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deny = requireAdminSecret(request);
        if (deny) return deny;

        let body: { license_key?: string; user_id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "invalid_json" }, { status: 400 });
        }

        const { license_key, user_id } = body;
        if (!license_key && !user_id) {
          return Response.json(
            { success: false, error: "provide license_key or user_id" },
            { status: 400 },
          );
        }

        const where = license_key
          ? eq(licenses.licenseKey, license_key)
          : eq(licenses.userId, user_id!);

        const rows = await db.select({ id: licenses.id }).from(licenses).where(where).limit(1);
        if (rows.length === 0) {
          return Response.json({ success: false, error: "not_found" }, { status: 404 });
        }

        await db
          .update(licenses)
          .set({ revokedAt: new Date() })
          .where(eq(licenses.id, rows[0]!.id));

        return Response.json({ success: true });
      },
    },
  },
});
