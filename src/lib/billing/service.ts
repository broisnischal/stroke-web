import "@tanstack/react-start/server-only";
import { and, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { payments, subscriptions, user } from "#/lib/db/schema";
import { getOrIssueLicense } from "#/lib/license";

import type { BillingEvent } from "./providers/types";

export async function getActiveSubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubscription(userId: string) {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function handleBillingEvent(event: BillingEvent): Promise<void> {
  const { type, data } = event;

  switch (type) {
    case "subscription.active": {
      if (!data.userId || !data.subscriptionId || !data.customerId) return;

      const existing = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, data.subscriptionId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(subscriptions)
          .set({
            status: "active",
            plan: data.plan ?? "pro",
            currentPeriodEnd: data.periodEnd ?? null,
          })
          .where(eq(subscriptions.providerSubscriptionId, data.subscriptionId));
      } else {
        await db.insert(subscriptions).values({
          id: crypto.randomUUID(),
          userId: data.userId,
          provider: "dodo",
          providerCustomerId: data.customerId,
          providerSubscriptionId: data.subscriptionId,
          plan: data.plan ?? "pro",
          status: "active",
          currentPeriodEnd: data.periodEnd ?? null,
        });
      }
      break;
    }

    case "subscription.updated": {
      if (!data.subscriptionId) return;
      await db
        .update(subscriptions)
        .set({
          plan: data.plan ?? undefined,
          status: (data.status as "active" | "cancelled" | "on_hold" | "expired") ?? undefined,
        })
        .where(eq(subscriptions.providerSubscriptionId, data.subscriptionId));
      break;
    }

    case "subscription.renewed": {
      if (!data.subscriptionId) return;
      await db
        .update(subscriptions)
        .set({ status: "active", currentPeriodEnd: data.periodEnd ?? null })
        .where(eq(subscriptions.providerSubscriptionId, data.subscriptionId));
      break;
    }

    case "subscription.on_hold": {
      if (!data.subscriptionId) return;
      await db
        .update(subscriptions)
        .set({ status: "on_hold" })
        .where(eq(subscriptions.providerSubscriptionId, data.subscriptionId));
      break;
    }

    case "subscription.cancelled": {
      if (!data.subscriptionId) return;
      await db
        .update(subscriptions)
        .set({ status: "cancelled" })
        .where(eq(subscriptions.providerSubscriptionId, data.subscriptionId));
      break;
    }

    case "payment.succeeded": {
      if (!data.paymentId) return;

      // Resolve the user: prefer metadata userId, fall back to email lookup.
      let resolvedUserId = data.userId;
      let resolvedEmail: string | undefined;

      if (resolvedUserId) {
        const userRows = await db
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, resolvedUserId))
          .limit(1);
        if (userRows.length > 0) {
          resolvedEmail = userRows[0].email;
        } else {
          console.warn(
            "[billing] userId from metadata not found in DB, trying email fallback. userId:",
            resolvedUserId,
          );
          resolvedUserId = undefined;
        }
      }

      // Email fallback: look up user by the email Dodo recorded on the payment.
      if (!resolvedUserId && data.email) {
        const userRows = await db
          .select({ id: user.id, email: user.email })
          .from(user)
          .where(eq(user.email, data.email))
          .limit(1);
        if (userRows.length > 0) {
          resolvedUserId = userRows[0].id;
          resolvedEmail = userRows[0].email;
          console.log("[billing] resolved user by email fallback:", resolvedUserId);
        }
      }

      if (!resolvedUserId || !resolvedEmail) {
        console.warn(
          "[billing] payment.succeeded: cannot resolve user, skipping. paymentId:",
          data.paymentId,
          "metadata.userId:",
          data.userId,
          "email:",
          data.email,
        );
        return;
      }

      // Idempotency: if this exact payment was already processed, just ensure license exists.
      const existingPayment = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.providerPaymentId, data.paymentId))
        .limit(1);

      if (existingPayment.length > 0) {
        await getOrIssueLicense(resolvedUserId, resolvedEmail);
        return;
      }

      // Duplicate prevention: if this user already has a succeeded payment, just refresh the license.
      const existingSucceededPayment = await db
        .select({ id: payments.id })
        .from(payments)
        .where(and(eq(payments.userId, resolvedUserId), eq(payments.status, "succeeded")))
        .limit(1);

      if (existingSucceededPayment.length > 0) {
        console.warn(
          "[billing] duplicate payment for user who already paid:",
          resolvedUserId,
          "paymentId:",
          data.paymentId,
        );
        await getOrIssueLicense(resolvedUserId, resolvedEmail);
        return;
      }

      // Upsert a lifetime subscription — this is the primary event that grants Pro access.
      const existingSub = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.userId, resolvedUserId))
        .limit(1);

      let subscriptionId: string;

      if (existingSub.length > 0) {
        subscriptionId = existingSub[0].id;
        await db
          .update(subscriptions)
          .set({ status: "active", providerCustomerId: data.customerId ?? "" })
          .where(eq(subscriptions.id, subscriptionId));
      } else {
        subscriptionId = crypto.randomUUID();
        await db.insert(subscriptions).values({
          id: subscriptionId,
          userId: resolvedUserId,
          provider: "dodo",
          providerCustomerId: data.customerId ?? "",
          providerSubscriptionId: data.paymentId,
          plan: "pro",
          status: "active",
          currentPeriodEnd: null,
        });
      }

      await db.insert(payments).values({
        id: crypto.randomUUID(),
        userId: resolvedUserId,
        subscriptionId,
        provider: "dodo",
        providerPaymentId: data.paymentId,
        amount: data.amount ?? 0,
        currency: data.currency ?? "USD",
        status: "succeeded",
      });

      await getOrIssueLicense(resolvedUserId, resolvedEmail);
      break;
    }

    case "refund.succeeded": {
      if (!data.paymentId) return;
      await db
        .update(payments)
        .set({ status: "refunded" })
        .where(eq(payments.providerPaymentId, data.paymentId));
      break;
    }
  }
}
