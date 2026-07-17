import { Link } from "@tanstack/react-router";
import posthog from "posthog-js";

import { buttonVariants } from "#/components/ui/button";
import { setConsent, useShowConsentBanner } from "#/lib/consent";
import { cn } from "#/lib/utils";

/**
 * Opt-in analytics consent banner. PostHog is initialized opted-out by default
 * (see posthog-provider.tsx); nothing is captured and no analytics cookie is
 * set until the visitor accepts here.
 */
export function CookieConsent() {
  const show = useShowConsentBanner();
  if (!show) return null;

  function accept() {
    setConsent("accepted");
    posthog.opt_in_capturing();
    // Record the pageview we skipped while awaiting consent.
    posthog.capture("$pageview", { $current_url: window.location.href });
  }

  function decline() {
    setConsent("declined");
    posthog.opt_out_capturing();
  }

  return (
    <section
      aria-label="Cookie consent"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border border-border/60 bg-background/95 p-4 shadow-lg backdrop-blur-sm sm:inset-x-auto sm:left-4"
    >
      <p className="text-sm font-medium">Analytics cookies</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        We'd like to use privacy-friendly analytics to see which pages are useful. No ads, no data
        selling. The site works fully either way — see our{" "}
        <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={accept} className={buttonVariants({ size: "sm" })}>
          Accept
        </button>
        <button
          type="button"
          onClick={decline}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Decline
        </button>
      </div>
    </section>
  );
}
