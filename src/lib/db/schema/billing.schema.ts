import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { user } from "./auth.schema";

export type SubscriptionStatus = "active" | "cancelled" | "on_hold" | "expired";
export type PaymentStatus = "succeeded" | "failed" | "refunded";

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'dodo' | 'stripe'
    providerCustomerId: text("provider_customer_id").notNull(),
    providerSubscriptionId: text("provider_subscription_id").notNull().unique(),
    plan: text("plan").notNull().default("pro"),
    status: text("status").notNull().default("active").$type<SubscriptionStatus>(),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_provider_sub_id_idx").on(table.providerSubscriptionId),
    index("subscriptions_provider_customer_id_idx").on(table.providerCustomerId),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull().unique(),
    amount: integer("amount").notNull(), // in smallest currency unit (cents)
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().$type<PaymentStatus>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    index("payments_user_id_idx").on(table.userId),
    index("payments_provider_payment_id_idx").on(table.providerPaymentId),
  ],
);

export const licenses = sqliteTable(
  "licenses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
      .unique(),
    licenseKey: text("license_key").notNull().unique(),
    plan: text("plan").notNull().default("pro"),
    maxDevices: integer("max_devices").notNull().default(2),
    issuedAt: integer("issued_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [index("licenses_user_id_idx").on(table.userId)],
);

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(user, { fields: [subscriptions.userId], references: [user.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(user, { fields: [payments.userId], references: [user.id] }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const activations = sqliteTable(
  "activations",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    hostname: text("hostname"),
    activatedAt: integer("activated_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("activations_license_id_idx").on(table.licenseId),
    uniqueIndex("activations_license_device_uniq").on(table.licenseId, table.deviceId),
  ],
);

export const licensesRelations = relations(licenses, ({ one, many }) => ({
  user: one(user, { fields: [licenses.userId], references: [user.id] }),
  activations: many(activations),
}));

export const activationsRelations = relations(activations, ({ one }) => ({
  license: one(licenses, { fields: [activations.licenseId], references: [licenses.id] }),
}));
