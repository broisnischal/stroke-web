import { createFileRoute } from "@tanstack/react-router";

import { env } from "#/env/server";

/**
 * OAuth token-exchange proxy for the Stroke desktop app.
 *
 * Neon, Supabase, and PlanetScale are *confidential* OAuth clients: their token
 * endpoints require a client_secret that must never ship inside the distributed
 * desktop binary. The desktop app does the PKCE dance in the browser, then POSTs
 * the {provider, code, code_verifier, client_id, redirect_uri} here. We inject
 * the matching client_secret (a Cloudflare secret, server-side only) and forward
 * to the real provider token endpoint, passing the response straight back.
 *
 * `auth`: "basic" = client_id/secret via HTTP Basic; "post" = client_secret in the form body.
 */
type ProviderCfg = { tokenUrl: string; secret: string | undefined; auth: "basic" | "post" };

function providerConfig(key: string): ProviderCfg | null {
  switch (key) {
    case "supabase":
      return {
        tokenUrl: "https://api.supabase.com/v1/oauth/token",
        secret: env.SUPABASE_CLIENT_SECRET,
        auth: "basic",
      };
    case "neon":
      return {
        tokenUrl: "https://oauth2.neon.tech/oauth2/token",
        secret: env.NEON_CLIENT_SECRET,
        auth: "basic",
      };
    case "planetscale":
      return {
        tokenUrl: "https://auth.planetscale.com/oauth/token",
        secret: env.PLANETSCALE_CLIENT_SECRET,
        auth: "post",
      };
    case "prisma":
      return {
        tokenUrl: "https://auth.prisma.io/token",
        secret: env.PRISMA_CLIENT_SECRET,
        auth: "post",
      };
    default:
      return null;
  }
}

export const Route = createFileRoute("/api/oauth/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = new URLSearchParams(await request.text());
        const providerKey = form.get("provider") ?? "";
        const cfg = providerConfig(providerKey);
        if (!cfg) {
          return Response.json({ error: "unknown_provider" }, { status: 400 });
        }
        if (!cfg.secret) {
          return Response.json(
            {
              error: "server_misconfigured",
              detail: `missing ${providerKey.toUpperCase()}_CLIENT_SECRET`,
            },
            { status: 500 },
          );
        }

        // Forward everything except our routing key; never trust an inbound secret.
        const out = new URLSearchParams();
        for (const [k, v] of form) {
          if (k === "provider" || k === "client_secret") continue;
          out.set(k, v);
        }

        const headers: Record<string, string> = {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        };
        const clientId = form.get("client_id") ?? "";
        if (cfg.auth === "basic") {
          headers.authorization = `Basic ${btoa(`${clientId}:${cfg.secret}`)}`;
        } else {
          out.set("client_secret", cfg.secret);
        }

        const resp = await fetch(cfg.tokenUrl, { method: "POST", headers, body: out.toString() });
        const body = await resp.text();
        // Pass the provider's response straight through (status + JSON body).
        return new Response(body, {
          status: resp.status,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
