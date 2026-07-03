import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { checkout, dodopayments, portal, webhooks } from "@dodopayments/better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import DodoPayments from "dodopayments";

import { env } from "#/env/server";
import {
  domainFromEmail,
  getEnterpriseDomain,
  isPublicEmailDomain,
  STROKE_TEAM_SLUG,
  TEAM_PLAN,
} from "#/lib/billing/enterprise";
import { handleBillingEvent, userHasActiveLicense } from "#/lib/billing/service";
import { db } from "#/lib/db";
import * as schema from "#/lib/db/schema";

export const dodoClient = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_ENVIRONMENT,
});

export const STROKE_LICENSE_SLUG = "stroke-license";

const CHECKOUT_PATHS = ["/dodopayments/checkout", "/dodopayments/checkout-session"];

function metadataUserId(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.userId;
  return typeof value === "string" ? value : undefined;
}

function metadataPlan(metadata: Record<string, unknown> | undefined): string | undefined {
  const value = metadata?.plan;
  return typeof value === "string" ? value : undefined;
}

// Products offered through the Dodo checkout plugin. The Team product is only
// registered when its id is configured.
const checkoutProducts: { productId: string; slug: string }[] = [
  { productId: env.DODO_PRODUCT_ID, slug: STROKE_LICENSE_SLUG },
];
if (env.DODO_TEAM_PRODUCT_ID) {
  checkoutProducts.push({ productId: env.DODO_TEAM_PRODUCT_ID, slug: STROKE_TEAM_SLUG });
}

export const auth = betterAuth({
  baseURL: env.VITE_BASE_URL,
  telemetry: {
    enabled: false,
  },
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  hooks: {
    // Guard the plugin's checkout endpoints: one license per account, and the
    // payment is linked to the signed-in user server-side (client-supplied
    // metadata can't reassign it).
    before: createAuthMiddleware(async (ctx) => {
      if (!CHECKOUT_PATHS.includes(ctx.path)) return;

      const session = await getSessionFromCtx(ctx);
      if (!session) return; // checkout() already rejects unauthenticated users

      const slug = typeof ctx.body?.slug === "string" ? ctx.body.slug : undefined;
      const productId = typeof ctx.body?.productId === "string" ? ctx.body.productId : undefined;
      const isTeam =
        slug === STROKE_TEAM_SLUG ||
        (Boolean(env.DODO_TEAM_PRODUCT_ID) && productId === env.DODO_TEAM_PRODUCT_ID);

      if (isTeam) {
        // Team covers everyone on the buyer's email domain, so it must be a
        // company domain and can't already be covered.
        const domain = domainFromEmail(session.user.email);
        if (!domain || isPublicEmailDomain(domain)) {
          throw new APIError("BAD_REQUEST", {
            message:
              "The Team plan needs a company email. Sign in with your work address and one purchase covers everyone on your domain.",
          });
        }
        const existing = await getEnterpriseDomain(domain);
        if (existing && existing.status === "active") {
          throw new APIError("CONFLICT", {
            message: `${domain} already has a Stroke Team license — everyone on your domain is covered, so there's nothing more to buy.`,
          });
        }
      } else if (await userHasActiveLicense(session.user.id)) {
        // Personal (Pro) checkout: one license per account.
        throw new APIError("CONFLICT", {
          message:
            "You already own a Stroke license. It's tied to your account, so there's nothing more to buy.",
        });
      }

      return {
        context: {
          ...ctx,
          body: {
            ...ctx.body,
            referenceId: session.user.id,
            metadata: {
              ...(ctx.body?.metadata ?? {}),
              userId: session.user.id,
              plan: isTeam ? TEAM_PLAN : "pro",
            },
          },
        },
      };
    }),
  },

  // https://www.better-auth.com/docs/integrations/tanstack#usage-tips
  plugins: [
    tanstackStartCookies(),
    dodopayments({
      client: dodoClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: checkoutProducts,
          successUrl: "/app/billing?success=true",
          authenticatedUsersOnly: true,
        }),
        portal(),
        webhooks({
          webhookKey: env.DODO_WEBHOOK_KEY,
          onPaymentSucceeded: async (payload) => {
            await handleBillingEvent({
              type: "payment.succeeded",
              raw: payload,
              data: {
                paymentId: payload.data.payment_id,
                customerId: payload.data.customer.customer_id,
                amount: payload.data.total_amount,
                currency: payload.data.currency,
                userId: metadataUserId(payload.data.metadata),
                plan: metadataPlan(payload.data.metadata),
                email: payload.data.customer.email,
              },
            });
          },
          onPaymentFailed: async (payload) => {
            await handleBillingEvent({
              type: "payment.failed",
              raw: payload,
              data: {
                paymentId: payload.data.payment_id,
                customerId: payload.data.customer.customer_id,
                userId: metadataUserId(payload.data.metadata),
              },
            });
          },
          onRefundSucceeded: async (payload) => {
            await handleBillingEvent({
              type: "refund.succeeded",
              raw: payload,
              data: {
                paymentId: payload.data.payment_id ?? undefined,
                amount: payload.data.amount ?? undefined,
                userId: metadataUserId(payload.data.metadata ?? undefined),
              },
            });
          },
        }),
      ],
    }),
  ],

  // https://www.better-auth.com/docs/concepts/session-management#session-caching
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // https://www.better-auth.com/docs/concepts/oauth
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID!,
      clientSecret: env.GITHUB_CLIENT_SECRET!,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
    },
  },

  emailAndPassword: {
    enabled: false,
  },

  experimental: {
    // https://www.better-auth.com/docs/adapters/drizzle#joins-experimental
    joins: true,
  },
});
