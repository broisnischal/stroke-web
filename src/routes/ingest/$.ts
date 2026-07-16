import { createFileRoute } from "@tanstack/react-router";

/**
 * PostHog reverse proxy.
 *
 * Serving analytics from our own origin (`stroke.click/ingest/*`) instead of
 * `*.i.posthog.com` stops ad/tracker blockers from dropping events. The
 * client is pointed here via `VITE_POSTHOG_HOST` + `ui_host`.
 *
 * PostHog splits traffic across two upstreams:
 *   - `/ingest/static/*` → asset host (the posthog-js bundle, recorder, etc.)
 *   - everything else     → API host (capture, /decide, flags, session replay)
 *
 * Region: US cloud. For EU, swap to `eu.i.posthog.com` / `eu-assets.i.posthog.com`.
 */
const API_HOST = "us.i.posthog.com";
const ASSETS_HOST = "us-assets.i.posthog.com";

async function proxy(request: Request, splat: string) {
  const search = new URL(request.url).search;
  const host = splat.startsWith("static/") ? ASSETS_HOST : API_HOST;
  const target = `https://${host}/${splat}${search}`;

  const headers = new Headers(request.headers);
  // Let fetch derive Host from the target URL; forwarding our own would 404.
  headers.delete("host");
  headers.set("accept-encoding", "gzip");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  // Strip hop-by-hop / encoding headers that no longer match the buffered body.
  const respHeaders = new Headers(upstream.headers);
  respHeaders.delete("content-encoding");
  respHeaders.delete("content-length");
  respHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}

const handler = ({ request, params }: { request: Request; params: { _splat?: string } }) =>
  proxy(request, params._splat ?? "");

export const Route = createFileRoute("/ingest/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      OPTIONS: handler,
    },
  },
});
