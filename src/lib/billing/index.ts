import "@tanstack/react-start/server-only";
import { env } from "#/env/server";

import { createDodoProvider } from "./providers/dodo";
import type { BillingProvider } from "./providers/types";

const providers: Record<string, BillingProvider> = {};

function getOrCreateDodoProvider(): BillingProvider {
  if (!providers.dodo) {
    providers.dodo = createDodoProvider({
      apiKey: env.DODO_PAYMENTS_API_KEY,
      webhookKey: env.DODO_WEBHOOK_KEY,
      productId: env.DODO_PRODUCT_ID,
      environment: env.DODO_ENVIRONMENT,
    });
  }
  return providers.dodo;
}

// To add a new provider (e.g. Stripe):
// 1. Create src/lib/billing/providers/stripe.ts implementing BillingProvider
// 2. Add a getOrCreateStripeProvider() function here
// 3. Add "stripe" case below and the env vars

export function getProvider(name: string): BillingProvider {
  switch (name) {
    case "dodo":
      return getOrCreateDodoProvider();
    default:
      throw new Error(`Unknown billing provider: ${name}`);
  }
}

export const billing = getOrCreateDodoProvider();
export type { BillingProvider };
export * from "./providers/types";
