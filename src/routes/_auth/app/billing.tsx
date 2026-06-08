import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import {
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  KeyRoundIcon,
  Loader2Icon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import {
  $createCheckoutSession,
  billingQueryOptions,
  licenseQueryOptions,
} from "#/lib/billing/functions";

export const Route = createFileRoute("/_auth/app/billing")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(billingQueryOptions());
    context.queryClient.prefetchQuery(licenseQueryOptions());
  },
  component: BillingPage,
});

const LICENSE_PERKS = [
  "All databases & AI features unlocked",
  "Built-in MCP server for Claude & Cursor",
  "Use on macOS, Windows, and Linux",
  "Lifetime license with free updates",
];

function BillingPage() {
  const location = useLocation();
  const success = new URLSearchParams(location.search).get("success") === "true";
  const queryClient = useQueryClient();

  // Use plain useQuery (not suspense) so refetch doesn't remount the whole page
  const { data: subscription } = useQuery(billingQueryOptions());
  const { data: license } = useQuery(licenseQueryOptions());

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);

  const isActive = subscription?.status === "active";

  // When redirected after payment, poll every 2 s (up to 30 s) until the
  // webhook has fired and the license row is created.
  useEffect(() => {
    if (!success || license) return;

    let attempts = 0;
    const MAX = 15; // 15 × 2 s = 30 s

    const id = setInterval(async () => {
      attempts++;
      await queryClient.invalidateQueries({ queryKey: ["billing"] });
      if (attempts >= MAX) {
        clearInterval(id);
        setPollExpired(true);
      }
    }, 2000);

    return () => clearInterval(id);
  }, [success, license, queryClient]);

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { checkoutUrl } = await $createCheckoutSession();
      window.location.href = checkoutUrl;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  }

  async function copyKey() {
    if (!license?.licenseKey) return;
    await navigator.clipboard.writeText(license.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const stillWaiting = success && !license && !pollExpired;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CreditCardIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">License &amp; Billing</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Manage your Stroke Pro license and purchase details.
          </p>
        </div>
      </div>

      {/* Post-payment success banner */}
      {success && (
        <div
          className={[
            "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
            license
              ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              : pollExpired
                ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                : "border-primary/30 bg-primary/5 text-foreground",
          ].join(" ")}
        >
          {license ? (
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-green-500" />
          ) : (
            <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
          )}
          <span>
            {license
              ? "Payment confirmed — your license key is ready below."
              : pollExpired
                ? "Still processing — your key will appear here once confirmed. Try refreshing in a moment."
                : "Payment received! Generating your license key…"}
          </span>
        </div>
      )}

      {isActive && license ? (
        /* Active license — prominent key card */
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-border/50">
          <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-card px-6 py-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Your license key</h2>
              <p className="text-xs text-muted-foreground">
                Valid for up to {license.maxDevices} devices
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircleIcon className="size-3" />
              Active
            </span>
          </div>

          <div className="space-y-4 p-6">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3">
              <code className="flex-1 truncate font-mono text-sm tracking-tight">
                {license.licenseKey}
              </code>
              <button
                type="button"
                onClick={copyKey}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {copied ? (
                  <>
                    <CheckCircleIcon className="size-3.5 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="size-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter this key in{" "}
              <strong className="text-foreground">Stroke → Settings → License</strong> to activate
              your devices.
            </p>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              <span>
                Issued {license.issuedAt ? new Date(license.issuedAt).toLocaleDateString() : "—"}
              </span>
              <span className="text-border">·</span>
              <span>
                {license.expiresAt
                  ? `Test license — expires ${new Date(license.expiresAt).toLocaleDateString()}`
                  : "Lifetime, no expiry"}
              </span>
            </p>
          </div>
        </section>
      ) : stillWaiting ? (
        /* Awaiting webhook confirmation */
        <section className="rounded-2xl border border-border bg-card p-6 ring-1 ring-border/50">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin text-primary" />
            Your license key is being generated…
          </div>
        </section>
      ) : (
        /* Upsell — no active license */
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm ring-1 ring-border/50">
          <div className="flex items-center gap-3 border-b border-border/60 bg-gradient-to-br from-primary/10 via-card to-card px-6 py-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRoundIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Unlock Stroke Pro</h2>
              <p className="text-xs text-muted-foreground">
                One-time purchase · key valid for up to 2 devices
              </p>
            </div>
            <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <XCircleIcon className="size-3" />
              No license
            </span>
          </div>

          <div className="space-y-5 p-6">
            <ul className="grid gap-3 sm:grid-cols-2">
              {LICENSE_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-border/60 pt-5">
              <Button
                onClick={handleUpgrade}
                disabled={loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                <KeyRoundIcon className="size-4" />
                {loading ? "Redirecting…" : "Buy Pro license"}
              </Button>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheckIcon className="size-3.5 shrink-0" />
                Secure checkout via Dodo Payments.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Purchase details */}
      <section className="rounded-2xl border border-border bg-card ring-1 ring-border/50">
        <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CreditCardIcon className="size-4" />
          </div>
          <h2 className="font-semibold">Purchase details</h2>
        </div>

        <div className="p-6">
          {subscription ? (
            <dl className="divide-y divide-border/60 text-sm">
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium capitalize">{subscription.plan}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <span
                    className={
                      subscription.status === "active"
                        ? "font-medium text-green-600 dark:text-green-400"
                        : subscription.status === "cancelled"
                          ? "font-medium text-red-500"
                          : "font-medium text-yellow-600"
                    }
                  >
                    {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                  </span>
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">Provider</dt>
                <dd className="capitalize">{subscription.provider}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{subscription.currentPeriodEnd ? "Subscription" : "Lifetime"}</dd>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-muted-foreground">
                    {subscription.status === "cancelled" ? "Access until" : "Renews"}
                  </dt>
                  <dd>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</dd>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <dt className="text-muted-foreground">Since</dt>
                <dd>
                  {subscription.createdAt
                    ? new Date(subscription.createdAt).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No purchase found for this account.</p>
          )}
        </div>
      </section>
    </div>
  );
}
