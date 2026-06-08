import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { activations, licenses } from "#/lib/db/schema";
import { verifyLicenseKey } from "#/lib/license/verify";

export const Route = createFileRoute("/api/license/deactivate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { key?: string; device_id?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "invalid_json" }, { status: 400 });
        }

        const { key, device_id } = body;
        if (!key || !device_id) {
          return Response.json({ success: false, error: "missing_fields" }, { status: 400 });
        }

        const result = verifyLicenseKey(key);
        if (!result.valid) {
          return Response.json({ success: false, error: result.error });
        }

        const licenseRows = await db
          .select({ id: licenses.id })
          .from(licenses)
          .where(eq(licenses.licenseKey, key))
          .limit(1);

        if (licenseRows.length === 0) {
          return Response.json({ success: false, error: "not_found" });
        }

        await db
          .delete(activations)
          .where(
            and(eq(activations.licenseId, licenseRows[0]!.id), eq(activations.deviceId, device_id)),
          );

        return Response.json({ success: true });
      },
    },
  },
});
