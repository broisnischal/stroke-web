import { createFileRoute } from "@tanstack/react-router";

import { requireAdminSecret } from "#/lib/license/admin-auth";
import { usageSummary } from "#/lib/telemetry/service";

/**
 * GET /api/admin/telemetry/summary?days=30
 * Header: Authorization: Bearer <LICENSE_ADMIN_SECRET>
 *
 * Active devices (today / 7d / 30d), a daily series, OS and version spread,
 * feature counts, and first-week retention.
 */
export const Route = createFileRoute("/api/admin/telemetry/summary")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deny = requireAdminSecret(request);
        if (deny) return deny;

        const raw = Number(new URL(request.url).searchParams.get("days"));
        // Clamped rather than rejected: the window is a convenience, and an
        // unbounded one is a full-table scan on every call.
        const days = Number.isFinite(raw) ? Math.min(365, Math.max(1, Math.floor(raw))) : 30;

        return Response.json(await usageSummary(days));
      },
    },
  },
});
