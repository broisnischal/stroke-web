import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

/**
 * Moderation state for a review. New/edited reviews start `pending` and only
 * surface on the public landing page once an admin sets them to `approved`.
 */
export type ReviewStatus = "pending" | "approved" | "rejected";

/**
 * A written testimonial left by a licensed user. One row per user (they can
 * edit their own); editing resets the row to `pending` for re-moderation.
 */
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    /** The testimonial text. */
    body: text("body").notNull(),
    /** Optional byline shown under the name, e.g. "Backend engineer at Acme". */
    title: text("title"),
    status: text("status").notNull().default("pending").$type<ReviewStatus>(),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("reviews_user_id_idx").on(table.userId),
    index("reviews_status_idx").on(table.status),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(user, { fields: [reviews.userId], references: [user.id] }),
}));
