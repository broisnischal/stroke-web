import { useRouter } from "@tanstack/react-router";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useRef } from "react";

import { env } from "#/env/client";

let initialized = false;

function initPostHog() {
  if (initialized || typeof window === "undefined" || !env.VITE_POSTHOG_KEY) return;
  posthog.init(env.VITE_POSTHOG_KEY, {
    // Same-origin reverse proxy (src/routes/ingest/$.ts) so ad-blockers
    // don't drop events. ui_host is where "open in PostHog" links point.
    api_host: `${window.location.origin}/ingest`,
    ui_host: "https://us.posthog.com",
    // We send $pageview manually on router navigation (SPA).
    capture_pageview: false,
    capture_pageleave: true,
  });
  initialized = true;
}

export function PostHogProvider({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    initPostHog();
    if (!env.VITE_POSTHOG_KEY) return;

    const capture = () => {
      const path = router.state.location.pathname;
      if (path === lastPath.current) return;
      lastPath.current = path;
      posthog.capture("$pageview", { $current_url: window.location.href });
    };

    capture(); // initial load
    return router.subscribe("onResolved", capture);
  }, [router]);

  if (!env.VITE_POSTHOG_KEY) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
