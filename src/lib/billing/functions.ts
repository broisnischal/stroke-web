import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { env } from "#/env/server";
import { authMiddleware } from "#/lib/auth/middleware";
import { billing } from "#/lib/billing";
import { getSubscription } from "#/lib/billing/service";
import { getLicense } from "#/lib/license";

export const $getSubscription = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return getSubscription(context.user.id);
  });

export const $createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const checkoutUrl = await billing.createCheckoutSession({
      productId: env.DODO_PRODUCT_ID,
      customer: {
        email: context.user.email,
        name: context.user.name,
      },
      metadata: { userId: context.user.id },
      returnUrl: `${env.VITE_BASE_URL}/app/billing?success=true`,
    });
    return { checkoutUrl };
  });

export const $getLicense = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return getLicense(context.user.id);
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
