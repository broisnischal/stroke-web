import "@tanstack/react-start/server-only";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "#/lib/db";
import { enterpriseDomains, licenses, payments, subscriptions, user } from "#/lib/db/schema";
import { getOrIssueLicense } from "#/lib/license";

import { domainFromEmail, getEnterpriseDomain, isPublicEmailDomain, TEAM_PLAN } from "./enterprise";
import type { BillingEvent } from "./providers/types";

/**
 * Apply a completed Team purchase. Idempotent: safe to call for the first
 * webhook, a retry, or the recover flow. Marks the buyer's email domain as
 * covered (so every colleague is auto-licensed) and issues the buyer's own key.
 */
async function grantTeamPurchase(args: {
  userId: string;
  email: string;
  paymentId: string;
  customerId?: string;
  amount?: number;
  currency?: string;
}): Promise<void> {
  const { userId, email, paymentId, customerId, amount, currency } = args;
  const domain = domainFromEmail(email);

  // Mark the company domain as covered. A consumer domain should have been
  // blocked at checkout; if one slips through, skip domain coverage and grant
  // only the buyer a personal license.
  if (domain && !isPublicEmailDomain(domain)) {
    const existing = await getEnterpriseDomain(domain);
    if (!existing) {
      await db.insert(enterpriseDomains).values({
        id: crypto.randomUUID(),
        domain,
        ownerUserId: userId,
        plan: TEAM_PLAN,
        provider: "dodo",
        providerCustomerId: customerId ?? null,
        providerPaymentId: paymentId,
        status: "active",
      });
    } else if (existing.status !== "active") {
      await db
        .update(enterpriseDomains)
        .set({ status: "active" })
        .where(eq(enterpriseDomains.id, existing.id));
    }
  } else {
    console.warn(
      "[billing] team purchase for non-corporate domain, issuing personal license only:",
      email,
    );
  }

  // Record the buyer's subscription + payment (idempotent on providerPaymentId).
  const existingSub = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  let subscriptionId: string;
  if (existingSub.length > 0) {
    subscriptionId = existingSub[0].id;
    await db
      .update(subscriptions)
      .set({ status: "active", plan: TEAM_PLAN, providerCustomerId: customerId ?? "" })
      .where(eq(subscriptions.id, subscriptionId));
  } else {
    subscriptionId = crypto.randomUUID();
    await db.insert(subscriptions).values({
      id: subscriptionId,
      userId,
      provider: "dodo",
      providerCustomerId: customerId ?? "",
      providerSubscriptionId: paymentId,
      plan: TEAM_PLAN,
      status: "active",
      currentPeriodEnd: null,
    });
  }

  const existingPayment = await db
    .select({ id: payments.id })
    .from(payments)
    .where(eq(payments.providerPaymentId, paymentId))
    .limit(1);

  if (existingPayment.length === 0) {
    await db.insert(payments).values({
      id: crypto.randomUUID(),
      userId,
      subscriptionId,
      provider: "dodo",
      providerPaymentId: paymentId,
      amount: amount ?? 0,
      currency: currency ?? "USD",
      status: "succeeded",
    });
  }

  await getOrIssueLicense(userId, email, { plan: TEAM_PLAN });
}

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

/**
 * True when the user already owns Stroke — an active subscription record or a
 * non-revoked license. Used to block a second purchase before checkout.
 */
export async function userHasActiveLicense(userId: string): Promise<boolean> {
  const activeSub = await getActiveSubscription(userId);
  if (activeSub) return true;

  const licenseRows = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(and(eq(licenses.userId, userId), isNull(licenses.revokedAt)))
    .limit(1);
  return licenseRows.length > 0;
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

      // Team purchase: mark the buyer's domain as covered. grantTeamPurchase is
      // fully idempotent, so it also handles retries and the recover flow.
      if (data.plan === TEAM_PLAN) {
        await grantTeamPurchase({
          userId: resolvedUserId,
          email: resolvedEmail,
          paymentId: data.paymentId,
          customerId: data.customerId,
          amount: data.amount,
          currency: data.currency,
        });
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

      // If this payment backed a Team domain, stop covering new members.
      // Already-issued member licenses are left intact — revoke them via the
      // admin endpoint if a refund should fully cut off access.
      await db
        .update(enterpriseDomains)
        .set({ status: "refunded" })
        .where(eq(enterpriseDomains.providerPaymentId, data.paymentId));
      break;
    }
  }
}
