import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  Loader2Icon,
  MonitorIcon,
  XCircleIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SmartDownloadButton } from "#/components/download-button";
import { buttonVariants } from "#/components/ui/button";
import { authClient } from "#/lib/auth/auth-client";
import {
  $recoverLicense,
  billingQueryOptions,
  enterpriseQueryOptions,
  licenseQueryOptions,
} from "#/lib/billing/functions";
import { STROKE_TEAM_SLUG, TEAM_PRICE_USD } from "#/lib/billing/plans";

export const Route = createFileRoute("/_auth/app/billing")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(billingQueryOptions());
    context.queryClient.prefetchQuery(licenseQueryOptions());
    context.queryClient.prefetchQuery(enterpriseQueryOptions());
  },
  component: BillingPage,
});

function BillingPage() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  // Dodo appends its own status to our return URL — success=true only means
  // "came back from checkout", not "the payment went through".
  const returnedStatus = search.get("status");
  const paymentFailed = returnedStatus === "failed" || returnedStatus === "cancelled";
  const success = search.get("success") === "true" && !paymentFailed;
  const queryClient = useQueryClient();

  const { data: license } = useQuery(licenseQueryOptions());
  const { data: enterprise } = useQuery(enterpriseQueryOptions());

  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [pollExpired, setPollExpired] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!success || license) return;

    let attempts = 0;

    const id = setInterval(async () => {
      attempts++;
      await queryClient.refetchQueries({ queryKey: ["billing"] });

      if (attempts === 1 || attempts === 5 || attempts === 10) {
        try {
          await $recoverLicense({ data: {} });
          await queryClient.refetchQueries({ queryKey: ["billing"] });
        } catch {
          // keep polling
        }
      }

      if (attempts >= 15) {
        clearInterval(id);
        setPollExpired(true);
      }
    }, 2000);

    return () => clearInterval(id);
  }, [success, license, queryClient]);

  async function handleManualRefresh() {
    setRecovering(true);
    try {
      await $recoverLicense({ data: {} });
      await queryClient.refetchQueries({ queryKey: ["billing"] });
      setPollExpired(false);
    } catch {
      // ignore
    } finally {
      setRecovering(false);
    }
  }

  async function handleUpgrade() {
    setLoading(true);
    const { data, error } = await authClient.dodopayments.checkoutSession({
      slug: "stroke-license",
    });
    if (error || !data?.url) {
      toast.error(error?.message ?? "Failed to start checkout. Please try again.");
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  async function handleUpgradeTeam() {
    setTeamLoading(true);
    const { data, error } = await authClient.dodopayments.checkoutSession({
      slug: STROKE_TEAM_SLUG,
    });
    if (error || !data?.url) {
      toast.error(error?.message ?? "Failed to start checkout. Please try again.");
      setTeamLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  async function copyKey() {
    if (!license?.licenseKey) return;
    await navigator.clipboard.writeText(license.licenseKey);
    setCopied(true);
    toast.success("License key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Failed or cancelled payment ───────────────────────────────────────────
  if (paymentFailed) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-4">
        <div className="flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <XCircleIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">
              {returnedStatus === "cancelled" ? "Payment cancelled" : "Payment failed"}
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              {returnedStatus === "cancelled"
                ? "You cancelled the checkout before it completed."
                : "Your bank or card declined the payment."}{" "}
              You haven't been charged and no license was issued.
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          You can try again whenever you're ready — the app keeps working free in the meantime. If
          the problem repeats, a different card usually resolves it, or reach us through the support
          page.
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            className={buttonVariants({ size: "sm" })}
          >
            <KeyRoundIcon className="size-3.5" />
            {loading ? "Redirecting…" : "Try again"}
          </button>
          <Link to="/app/billing" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Back to billing
          </Link>
        </div>
      </div>
    );
  }

  // ── Post-payment activation flow ──────────────────────────────────────────
  if (success) {
    return (
      <div className="mx-auto max-w-md space-y-8 pt-4">
        {/* Status banner */}
        <div
          className={[
            "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
            license
              ? "border-emerald-500/20 bg-emerald-500/6 text-emerald-500"
              : pollExpired
                ? "border-amber-500/20 bg-amber-500/6 text-amber-500"
                : "border-border/40 text-muted-foreground",
          ].join(" ")}
        >
          {license ? (
            <CheckIcon className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin" />
          )}
          <div>
            {license ? (
              <>
                <p className="font-medium">Payment confirmed</p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  Your license is ready. Activate it in Stroke → Settings → License.
                </p>
              </>
            ) : pollExpired ? (
              <>
                <p className="font-medium">Still processing</p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  This can take a moment.{" "}
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={recovering}
                    className="underline underline-offset-2 transition-opacity hover:opacity-70 disabled:opacity-40"
                  >
                    {recovering ? "Checking…" : "Refresh now"}
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="font-medium">Generating your license…</p>
                <p className="mt-0.5 text-[11px] opacity-70">Usually takes a few seconds.</p>
              </>
            )}
          </div>
        </div>

        {/* License key */}
        {license ? (
          <section className="space-y-2.5">
            <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
              Your license key
            </p>
            <div className="overflow-hidden rounded-md border border-border/40">
              <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <KeyRoundIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium capitalize">{license.plan} license</span>
                  <span className="text-xs text-muted-foreground">
                    · {license.maxDevices} seats
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-foreground/[0.025] px-4 py-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide text-foreground/80">
                  {showKey ? license.licenseKey : license.licenseKey.slice(0, 6) + "•".repeat(42)}
                </code>
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  title={showKey ? "Hide key" : "Reveal key"}
                  className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  {showKey ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={copyKey}
                  className="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3.5 text-emerald-500" />
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

              <div className="border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <MonitorIcon className="size-3 shrink-0" />
                  {license.expiresAt
                    ? `Test license · expires ${new Date(license.expiresAt).toLocaleDateString()}`
                    : "Lifetime license · no expiry, no renewals"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Activation steps */}
        {license && (
          <section className="space-y-2.5">
            <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
              Activate in 3 steps
            </p>
            <ol className="space-y-2">
              {[
                {
                  step: "Download Stroke if you haven't already",
                  action: <SmartDownloadButton size="sm" />,
                },
                { step: "Open Stroke → Settings → License", action: null },
                { step: "Paste your key and press Activate", action: null },
              ].map(({ step, action }, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/30 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground/60">{i + 1}</span>
                    <span className="text-sm">{step}</span>
                  </div>
                  {action}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* CTA */}
        <div className="flex items-center gap-3 pt-1">
          <Link
            to="/app"
            className={buttonVariants({ variant: license ? "default" : "outline", size: "sm" })}
          >
            Go to dashboard
            <ArrowRightIcon className="size-3.5" />
          </Link>
          {!license && (
            <span className="text-xs text-muted-foreground">
              Your key will appear here once confirmed
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Default billing page (no ?success=true) ───────────────────────────────
  const subtitle = license
    ? enterprise?.role === "member"
      ? `Covered by your team (${enterprise.domain}).`
      : "Your license is active."
    : "Get lifetime access to Stroke.";

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-base font-semibold tracking-tight">License &amp; Billing</h1>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>

      {/* Team owner summary */}
      {enterprise?.role === "owner" && (
        <div className="flex items-start gap-3 rounded-md border border-border/40 px-4 py-3">
          <Building2Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="text-xs">
            <p className="font-medium text-foreground">Team plan · {enterprise.domain}</p>
            <p className="mt-0.5 text-muted-foreground">
              Everyone with an{" "}
              <strong className="font-medium text-foreground">@{enterprise.domain}</strong> email is
              licensed automatically when they sign in.
              {typeof enterprise.members === "number" &&
                ` ${enterprise.members} ${enterprise.members === 1 ? "member" : "members"} licensed so far.`}
            </p>
          </div>
        </div>
      )}

      {/* Covered member note */}
      {enterprise?.role === "member" && license && (
        <div className="flex items-start gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/6 px-4 py-3 text-emerald-500">
          <Building2Icon className="mt-0.5 size-4 shrink-0" />
          <div className="text-xs">
            <p className="font-medium">Covered by your team</p>
            <p className="mt-0.5 opacity-80">
              Your {enterprise.domain} organization has a Stroke Team license, so the key below is
              yours at no cost.
            </p>
          </div>
        </div>
      )}

      {/* License key — personal, team owner, or covered member */}
      {license && (
        <section className="space-y-2.5">
          <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
            License key
          </p>
          <div className="overflow-hidden rounded-md border border-border/40">
            <div className="flex items-center justify-between border-b border-border/30 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <KeyRoundIcon className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-medium capitalize">{license.plan} license</span>
                <span className="text-xs text-muted-foreground">· {license.maxDevices} seats</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-foreground/[0.025] px-4 py-2.5">
              <code className="min-w-0 flex-1 truncate font-mono text-xs tracking-wide text-foreground/80">
                {showKey ? license.licenseKey : license.licenseKey.slice(0, 6) + "•".repeat(42)}
              </code>
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                title={showKey ? "Hide key" : "Reveal key"}
                className="flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
              >
                {showKey ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={copyKey}
                className="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
              >
                {copied ? (
                  <>
                    <CheckIcon className="size-3.5 text-emerald-500" />
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
            <div className="border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
              <p>
                Open <strong className="font-medium text-foreground">Stroke</strong> →{" "}
                <strong className="font-medium text-foreground">Settings → License</strong> and
                paste your key to activate.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Personal (Pro) purchase — only when the user has no license at all */}
      {!license && (
        <section className="space-y-2.5">
          <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
            Stroke Pro · Lifetime
          </p>
          <div className="overflow-hidden rounded-md border border-border/40">
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-muted-foreground">
                One-time purchase. All features, all platforms, free updates forever.
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {[
                  "All ten engines, from Postgres to DuckDB",
                  "Built-in MCP server for Claude & Cursor",
                  "macOS, Windows & Linux, 2 devices at once",
                  "One-time payment · every update included",
                ].map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-px font-mono text-muted-foreground/50">—</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Secure checkout via Dodo Payments</p>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className={buttonVariants({ size: "sm" })}
              >
                <KeyRoundIcon className="size-3.5" />
                {loading ? "Redirecting…" : "Buy license"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Team purchase — when configured and the user isn't already on a team */}
      {enterprise?.available && enterprise.role === "none" && (
        <section className="space-y-2.5">
          <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
            Stroke Team · Whole company
          </p>
          <div className="overflow-hidden rounded-md border border-border/40">
            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-muted-foreground">
                One ${TEAM_PRICE_USD} purchase licenses everyone on your company's email domain — no
                seats to manage, no per-user fees.
              </p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {[
                  "Every teammate on your domain, licensed automatically",
                  "Each member gets their own key · 2 devices each",
                  "All engines & the MCP server, same as Pro",
                  "One-time payment · every update included",
                ].map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <span className="mt-px font-mono text-muted-foreground/50">—</span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <p className="text-xs text-muted-foreground">Requires a company email</p>
              <button
                type="button"
                onClick={handleUpgradeTeam}
                disabled={teamLoading}
                className={buttonVariants({ variant: license ? "outline" : "default", size: "sm" })}
              >
                <Building2Icon className="size-3.5" />
                {teamLoading ? "Redirecting…" : `Buy Team · $${TEAM_PRICE_USD}`}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
