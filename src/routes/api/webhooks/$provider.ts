import { createFileRoute } from "@tanstack/react-router";

import { getProvider } from "#/lib/billing";
import { handleBillingEvent } from "#/lib/billing/service";

export const Route = createFileRoute("/api/webhooks/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const rawBody = await request.text();
        const headers = Object.fromEntries(request.headers.entries());

        let provider;
        try {
          provider = getProvider(params.provider);
        } catch {
          return new Response("Unknown provider", { status: 404 });
        }

        let event;
        try {
          event = provider.verifyWebhook(rawBody, headers);
        } catch (err) {
          console.error(`[webhook/${params.provider}] signature verification failed:`, err);
          return new Response("Invalid signature", { status: 401 });
        }

        try {
          await handleBillingEvent(event);
        } catch (err) {
          // Return 200 so the provider doesn't retry — log and investigate separately
          console.error(`[webhook/${params.provider}] event handler error:`, event.type, err);
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
