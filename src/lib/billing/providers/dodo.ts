import "@tanstack/react-start/server-only";
import DodoPayments from "dodopayments";
import { Webhook } from "standardwebhooks";

import type { BillingEvent, BillingProvider, CheckoutParams } from "./types";

export function createDodoProvider(config: {
  apiKey: string;
  webhookKey: string;
  productId: string;
  environment: "live_mode" | "test_mode";
}): BillingProvider {
  const client = new DodoPayments({
    bearerToken: config.apiKey,
    environment: config.environment,
  });

  const webhook = new Webhook(config.webhookKey);

  return {
    name: "dodo",

    async createCheckoutSession(params: CheckoutParams): Promise<string> {
      const session = await client.checkoutSessions.create({
        product_cart: [
          {
            product_id: params.productId,
            quantity: params.quantity ?? 1,
          },
        ],
        customer: {
          email: params.customer.email,
          name: params.customer.name,
        },
        metadata: params.metadata,
        return_url: params.returnUrl,
      } as Parameters<typeof client.checkoutSessions.create>[0]);

      return (session as { checkout_url: string }).checkout_url;
    },

    verifyWebhook(rawBody: string, headers: Record<string, string>): BillingEvent {
      const payload = webhook.verify(rawBody, {
        "webhook-id": headers["webhook-id"] ?? "",
        "webhook-signature": headers["webhook-signature"] ?? "",
        "webhook-timestamp": headers["webhook-timestamp"] ?? "",
      }) as { type: string; data: Record<string, unknown> };

      const { type, data } = payload;
      const meta = (data?.metadata ?? {}) as Record<string, string>;

      switch (type) {
        case "payment.succeeded":
          return {
            type: "payment.succeeded",
            raw: payload,
            data: {
              paymentId: data.payment_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              amount: data.amount as number | undefined,
              currency: data.currency as string | undefined,
              userId: meta.userId,
              email: (data.customer as { email?: string } | undefined)?.email,
            },
          };

        case "payment.failed":
          return {
            type: "payment.failed",
            raw: payload,
            data: {
              paymentId: data.payment_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              userId: meta.userId,
            },
          };

        case "subscription.active":
          return {
            type: "subscription.active",
            raw: payload,
            data: {
              subscriptionId: data.subscription_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              plan: (data.plan ?? "pro") as string,
              periodEnd: data.current_period_end
                ? new Date((data.current_period_end as number) * 1000)
                : undefined,
              userId: meta.userId,
            },
          };

        case "subscription.updated":
          return {
            type: "subscription.updated",
            raw: payload,
            data: {
              subscriptionId: data.subscription_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              plan: data.plan as string | undefined,
              status: data.status as string | undefined,
              userId: meta.userId,
            },
          };

        case "subscription.renewed":
          return {
            type: "subscription.renewed",
            raw: payload,
            data: {
              subscriptionId: data.subscription_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              periodEnd: data.current_period_end
                ? new Date((data.current_period_end as number) * 1000)
                : undefined,
              userId: meta.userId,
            },
          };

        case "subscription.on_hold":
          return {
            type: "subscription.on_hold",
            raw: payload,
            data: {
              subscriptionId: data.subscription_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              userId: meta.userId,
            },
          };

        case "subscription.cancelled":
          return {
            type: "subscription.cancelled",
            raw: payload,
            data: {
              subscriptionId: data.subscription_id as string | undefined,
              customerId: data.customer_id as string | undefined,
              userId: meta.userId,
            },
          };

        case "refund.succeeded":
          return {
            type: "refund.succeeded",
            raw: payload,
            data: {
              paymentId: data.payment_id as string | undefined,
              amount: data.amount as number | undefined,
              currency: data.currency as string | undefined,
              userId: meta.userId,
            },
          };

        default:
          return { type: "unknown", raw: payload, data: {} };
      }
    },
  };
}
