import "@tanstack/react-start/server-only";
import { and, desc, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { reviews, user } from "#/lib/db/schema";
import type { ReviewStatus } from "#/lib/db/schema";

export interface PublicReview {
  id: string;
  body: string;
  title: string | null;
  authorName: string;
  approvedAt: Date | null;
}

/** The current user's own review (any status), or null if they have none. */
export async function getUserReview(userId: string) {
  const rows = await db.select().from(reviews).where(eq(reviews.userId, userId)).limit(1);
  return rows[0] ?? null;
}

/** Approved reviews for public display, newest first. No PII beyond name. */
export async function listApprovedReviews(limit = 24): Promise<PublicReview[]> {
  const rows = await db
    .select({
      id: reviews.id,
      body: reviews.body,
      title: reviews.title,
      authorName: user.name,
      approvedAt: reviews.approvedAt,
    })
    .from(reviews)
    .innerJoin(user, eq(reviews.userId, user.id))
    .where(eq(reviews.status, "approved"))
    .orderBy(desc(reviews.approvedAt))
    .limit(limit);
  return rows;
}

/**
 * Create or update the user's review. Editing always resets moderation state
 * back to `pending` (and clears the approval timestamp) so changed text is
 * re-reviewed before it shows publicly again.
 */
export async function upsertReview(userId: string, input: { body: string; title?: string | null }) {
  const title = input.title?.trim() ? input.title.trim() : null;
  const existing = await getUserReview(userId);

  if (existing) {
    await db
      .update(reviews)
      .set({ body: input.body, title, status: "pending", approvedAt: null })
      .where(eq(reviews.id, existing.id));
    return { ...existing, body: input.body, title, status: "pending" as ReviewStatus };
  }

  const row = {
    id: crypto.randomUUID(),
    userId,
    body: input.body,
    title,
    status: "pending" as ReviewStatus,
    approvedAt: null,
  };
  await db.insert(reviews).values(row);
  return row;
}

/** Admin: list reviews by moderation status (or all), newest first, with author. */
export async function listReviewsForAdmin(status?: ReviewStatus) {
  const base = db
    .select({
      id: reviews.id,
      body: reviews.body,
      title: reviews.title,
      status: reviews.status,
      authorName: user.name,
      authorEmail: user.email,
      createdAt: reviews.createdAt,
      updatedAt: reviews.updatedAt,
      approvedAt: reviews.approvedAt,
    })
    .from(reviews)
    .innerJoin(user, eq(reviews.userId, user.id))
    .orderBy(desc(reviews.updatedAt));

  const rows = status ? await base.where(eq(reviews.status, status)) : await base;
  return rows;
}

/** Admin: set a review's moderation status. Approving stamps `approvedAt`. */
export async function setReviewStatus(id: string, status: ReviewStatus): Promise<boolean> {
  const rows = await db.select({ id: reviews.id }).from(reviews).where(eq(reviews.id, id)).limit(1);
  if (rows.length === 0) return false;

  await db
    .update(reviews)
    .set({ status, approvedAt: status === "approved" ? new Date() : null })
    .where(eq(reviews.id, id));
  return true;
}

/** True when the user currently has an approved, publicly-shown review. */
export async function hasApprovedReview(userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.status, "approved")))
    .limit(1);
  return rows.length > 0;
}
