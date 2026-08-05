import { createFileRoute } from "@tanstack/react-router";

import type { ReviewStatus } from "#/lib/db/schema";
import { requireAdminSecret } from "#/lib/license/admin-auth";
import { setReviewStatus } from "#/lib/reviews/service";

const ACTION_TO_STATUS: Record<string, ReviewStatus> = {
  approve: "approved",
  reject: "rejected",
  unpublish: "pending",
};

// POST /api/admin/reviews/moderate
// Body: { id: string, action: "approve" | "reject" | "unpublish" }
// Header: Authorization: Bearer <LICENSE_ADMIN_SECRET>
export const Route = createFileRoute("/api/admin/reviews/moderate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const deny = requireAdminSecret(request);
        if (deny) return deny;

        let body: { id?: string; action?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ success: false, error: "invalid_json" }, { status: 400 });
        }

        const status = body.action ? ACTION_TO_STATUS[body.action] : undefined;
        if (!body.id || !status) {
          return Response.json(
            { success: false, error: "provide id and action (approve|reject|unpublish)" },
            { status: 400 },
          );
        }

        const ok = await setReviewStatus(body.id, status);
        if (!ok) return Response.json({ success: false, error: "not_found" }, { status: 404 });

        return Response.json({ success: true, status });
      },
    },
  },
});
