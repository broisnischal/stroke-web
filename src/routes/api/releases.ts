import { createFileRoute } from "@tanstack/react-router";

import { env } from "#/env/server";

const GITHUB_API = "https://api.github.com/repos/broisnischal/stroke/releases?per_page=20";
const CACHE_SECONDS = 300;

/**
 * Proxies GitHub release listings so visitors never hit GitHub's
 * 60-requests/hour unauthenticated rate limit. Responses are cached at the
 * edge, and GITHUB_TOKEN (optional) authenticates the upstream call.
 */
export const Route = createFileRoute("/api/releases")({
  server: {
    handlers: {
      GET: async () => {
        const upstream = await fetch(GITHUB_API, {
          headers: {
            Accept: "application/vnd.github+json",
            // GitHub rejects requests without a User-Agent
            "User-Agent": "stroke-web (stroke.click)",
            ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
          },
        });

        if (!upstream.ok) {
          return Response.json(
            { error: `GitHub responded with ${upstream.status}` },
            { status: 502 },
          );
        }

        const releases = await upstream.json();
        if (!Array.isArray(releases)) {
          return Response.json({ error: "Unexpected GitHub response" }, { status: 502 });
        }

        return Response.json(releases, {
          headers: {
            "Cache-Control": `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
          },
        });
      },
    },
  },
});
