import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import * as z from "zod";

import { authMiddleware, freshAuthMiddleware } from "#/lib/auth/middleware";
import { userHasActiveLicense } from "#/lib/billing/service";

import { getUserReview, listApprovedReviews, upsertReview } from "./service";

/** Public: approved testimonials for the landing page. No auth required. */
export const $listApprovedReviews = createServerFn({ method: "GET" }).handler(async () => {
  return listApprovedReviews();
});

/** The signed-in user's own review (any status), for the in-app editor. */
export const $getMyReview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return getUserReview(context.user.id);
  });

const submitInput = z.object({
  body: z.string().trim().min(10, "Please write at least a sentence.").max(1000),
  title: z.string().trim().max(80).optional(),
});

/**
 * Create or update the current user's testimonial. Gated on ownership: only a
 * user with an active license (personal, team owner, or covered member) may
 * leave a review. Uses fresh auth since this is a public-facing mutation.
 */
export const $submitReview = createServerFn({ method: "POST" })
  .middleware([freshAuthMiddleware])
  .inputValidator(submitInput)
  .handler(async ({ context, data }) => {
    const licensed = await userHasActiveLicense(context.user.id);
    if (!licensed) {
      setResponseStatus(403);
      throw new Error("Only license holders can leave a review.");
    }
    return upsertReview(context.user.id, { body: data.body, title: data.title });
  });

export const approvedReviewsQueryOptions = () =>
  queryOptions({
    queryKey: ["reviews", "approved"],
    queryFn: ({ signal }) => $listApprovedReviews({ signal }),
    staleTime: 1000 * 60 * 5,
  });

export const myReviewQueryOptions = () =>
  queryOptions({
    queryKey: ["reviews", "mine"],
    queryFn: ({ signal }) => $getMyReview({ signal }),
  });
