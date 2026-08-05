import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { env } from "#/env/server";
import { authMiddleware } from "#/lib/auth/middleware";
import { billing } from "#/lib/billing";
import { getActiveSubscription, getSubscription } from "#/lib/billing/service";
import { db } from "#/lib/db";
import { subscriptions } from "#/lib/db/schema";
import { getLicense, getOrIssueLicense } from "#/lib/license";

export const $getSubscription = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return getSubscription(context.user.id);
  });

export const $createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const existing = await getActiveSubscription(context.user.id);
    if (existing) {
      throw new Error("You already have an active license.");
    }

    const { checkoutUrl, sessionId } = await billing.createCheckoutSession({
      productId: env.DODO_PRODUCT_ID,
      customer: {
        email: context.user.email,
        name: context.user.name,
      },
      metadata: { userId: context.user.id },
      returnUrl: `${env.VITE_BASE_URL}/app/billing?success=true`,
    });
    return { checkoutUrl, sessionId };
  });

export const $getLicense = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return getLicense(context.user.id);
  });

/**
 * Attempt to issue a license for the current user.
 *
 * - If sessionId is provided, verifies the payment directly with Dodo (works
 *   even when the webhook hasn't fired yet).
 * - Otherwise falls back to checking whether a subscription already exists.
 *
 * Safe to call multiple times.
 */
export const $recoverLicense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ sessionId: z.string().optional() }))
  .handler(async ({ context, data }) => {
    // 1. Already have a license — return it immediately.
    const existing = await getLicense(context.user.id);
    if (existing) return existing;

    // 2. Verify directly with Dodo when we have a checkout session ID.
    if (data.sessionId) {
      try {
        const { succeeded, paymentId } = await billing.verifyCheckoutSession(data.sessionId);
        if (succeeded && paymentId) {
          const existingSub = await getSubscription(context.user.id);
          if (!existingSub) {
            await db.insert(subscriptions).values({
              id: crypto.randomUUID(),
              userId: context.user.id,
              provider: "dodo",
              providerCustomerId: "",
              providerSubscriptionId: paymentId,
              plan: "pro",
              status: "active",
              currentPeriodEnd: null,
            });
          }
          return getOrIssueLicense(context.user.id, context.user.email);
        }
      } catch {
        // Dodo API failure — fall through to subscription check.
      }
    }

    // 3. Fallback: subscription already exists (e.g. webhook fired).
    const sub = await getActiveSubscription(context.user.id);
    if (!sub) return null;
    return getOrIssueLicense(context.user.id, context.user.email);
  });

export const billingQueryOptions = () =>
  queryOptions({
    queryKey: ["billing", "subscription"],
    queryFn: ({ signal }) => $getSubscription({ signal }),
  });

export const licenseQueryOptions = () =>
  queryOptions({
    queryKey: ["billing", "license"],
    queryFn: ({ signal }) => $getLicense({ signal }),
  });
