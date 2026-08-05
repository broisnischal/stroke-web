import { createFileRoute } from "@tanstack/react-router";

import { env } from "#/env/server";
import { _getUser } from "#/lib/auth/functions";
import { billing } from "#/lib/billing";

export const Route = createFileRoute("/api/billing/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await _getUser();
        if (!user) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const { checkoutUrl, sessionId } = await billing.createCheckoutSession({
            productId: env.DODO_PRODUCT_ID,
            customer: {
              email: user.email,
              name: user.name,
            },
            metadata: {
              userId: user.id,
            },
            returnUrl: `${env.VITE_BASE_URL}/app/billing?success=true`,
          });

          return Response.json({ checkoutUrl, sessionId });
        } catch (err) {
          console.error("[billing/checkout]", err);
          return new Response("Failed to create checkout session", { status: 500 });
        }
      },
    },
  },
});
