import { createFileRoute } from "@tanstack/react-router";

import type { ReviewStatus } from "#/lib/db/schema";
import { requireAdminSecret } from "#/lib/license/admin-auth";
import { listReviewsForAdmin } from "#/lib/reviews/service";

const STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

// GET /api/admin/reviews/list?status=pending|approved|rejected  (omit for all)
// Header: Authorization: Bearer <LICENSE_ADMIN_SECRET>
export const Route = createFileRoute("/api/admin/reviews/list")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const deny = requireAdminSecret(request);
        if (deny) return deny;

        const status = new URL(request.url).searchParams.get("status");
        if (status && !STATUSES.includes(status as ReviewStatus)) {
          return Response.json(
            { error: `status must be one of ${STATUSES.join(", ")}` },
            { status: 400 },
          );
        }

        const rows = await listReviewsForAdmin((status as ReviewStatus | null) ?? undefined);
        return Response.json({ reviews: rows });
      },
    },
  },
});
