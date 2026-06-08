import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import {
  CheckCircleIcon,
  CopyIcon,
  CreditCardIcon,
  KeyRoundIcon,
  Loader2Icon,
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">License & Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your Stroke Pro license and purchase details.
        </p>
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

      {/* License key section */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <KeyRoundIcon className="size-4" />
          </div>
          <h2 className="font-semibold">License Key</h2>
          {stillWaiting ? (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              Waiting for confirmation…
            </span>
          ) : isActive ? (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
              <CheckCircleIcon className="size-3" />
              Active
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              <XCircleIcon className="size-3" />
              No license
            </span>
          )}
        </div>

        <div className="p-5">
          {isActive && license ? (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Valid for up to <strong>{license.maxDevices} devices</strong>. Enter this key in{" "}
                <strong>Stroke → Settings → License</strong> to activate.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                <code className="flex-1 truncate font-mono text-xs">{license.licenseKey}</code>
                <button
                  type="button"
                  onClick={copyKey}
                  className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
              <p className="mt-3 text-xs text-muted-foreground">
                Issued {license.issuedAt
                  ? new Date(license.issuedAt).toLocaleDateString()
                  : "—"} ·{" "}
                {license.expiresAt
                  ? `Test license — expires ${new Date(license.expiresAt).toLocaleDateString()}`
                  : "Lifetime, no expiry"}
              </p>
            </>
          ) : stillWaiting ? (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Your license key is being generated…
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-muted-foreground">
                Purchase a Stroke Pro license to get a key valid for up to 2 devices.
              </p>
              <Button onClick={handleUpgrade} disabled={loading}>
                {loading ? "Redirecting…" : "Buy Pro license"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Subscription details */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCardIcon className="size-4" />
          </div>
          <h2 className="font-semibold">Purchase Details</h2>
        </div>

        <div className="p-5">
          {subscription ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Plan</dt>
              <dd className="font-medium capitalize">{subscription.plan}</dd>
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <span
                  className={
                    subscription.status === "active"
                      ? "text-green-600 dark:text-green-400"
                      : subscription.status === "cancelled"
                        ? "text-red-500"
                        : "text-yellow-600"
                  }
                >
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </dd>
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="capitalize">{subscription.provider}</dd>
              <dt className="text-muted-foreground">Type</dt>
              <dd>{subscription.currentPeriodEnd ? "Subscription" : "Lifetime"}</dd>
              {subscription.currentPeriodEnd && (
                <>
                  <dt className="text-muted-foreground">
                    {subscription.status === "cancelled" ? "Access until" : "Renews"}
                  </dt>
                  <dd>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Since</dt>
              <dd>
                {subscription.createdAt
                  ? new Date(subscription.createdAt).toLocaleDateString()
                  : "—"}
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No purchase found for this account.</p>
          )}
        </div>
      </section>
    </div>
  );
}
