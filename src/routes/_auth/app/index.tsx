import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  MonitorIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SmartDownloadButton } from "#/components/download-button";
import { buttonVariants } from "#/components/ui/button";
import { useAuth } from "#/lib/auth/hooks";
import { billingQueryOptions, licenseQueryOptions } from "#/lib/billing/functions";

const RELEASES_URL = "https://github.com/broisnischal/stroke/releases";

export const Route = createFileRoute("/_auth/app/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(billingQueryOptions());
    context.queryClient.prefetchQuery(licenseQueryOptions());
  },
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: subscription } = useQuery(billingQueryOptions());
  const { data: license } = useQuery(licenseQueryOptions());
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPro = subscription?.status === "active";

  async function copyKey() {
    if (!license?.licenseKey) return;
    await navigator.clipboard.writeText(license.licenseKey);
    setCopied(true);
    toast.success("License key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-xl space-y-9">
      {/* Account header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-semibold tracking-tight">{user?.name}</h1>
          {isPro ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-500 uppercase">
              <ZapIcon className="size-2.5" />
              Pro
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-border/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              Free
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{user?.email}</p>
      </div>

      {/* ── LICENSE KEY ── */}
      <section className="space-y-2.5">
        <SectionLabel>License key</SectionLabel>

        {isPro && license ? (
          <div className="overflow-hidden rounded-md border border-border/40">
            {/* header */}
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

            {/* key + eye + copy */}
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

            {/* hint */}
            <div className="border-t border-border/30 px-4 py-3 text-xs text-muted-foreground">
              <p>
                Open <strong className="font-medium text-foreground">Stroke</strong> →{" "}
                <strong className="font-medium text-foreground">Settings → License</strong> and
                paste your key to activate.
              </p>
              <p className="mt-1.5 flex items-center gap-1.5">
                <MonitorIcon className="size-3 shrink-0" />
                {license.expiresAt
                  ? `Test license · expires ${new Date(license.expiresAt).toLocaleDateString()}`
                  : "Lifetime — no expiry, no renewals"}
              </p>
            </div>
          </div>
        ) : (
          /* upsell */
          <div className="overflow-hidden rounded-md border border-border/40">
            <div className="px-4 py-4">
              <p className="text-sm font-medium">Stroke Pro · Lifetime</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                One-time purchase. All features, all platforms, free updates forever.
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-border/30 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheckIcon className="size-3.5 shrink-0" />
                Secure checkout via Dodo Payments
              </p>
              <Link to="/app/billing" className={buttonVariants({ size: "sm" })}>
                <KeyRoundIcon className="size-3.5" />
                Buy license
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ── PLAN — rendered as a DB result row ── */}
      {subscription && (
        <section className="space-y-2.5">
          <SectionLabel>Plan</SectionLabel>
          <div className="overflow-hidden rounded-md border border-border/40">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30 bg-foreground/[0.02]">
                  {["plan", "status", "type", "since"].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-2 text-left font-mono text-[9px] font-normal tracking-widest text-muted-foreground/60 uppercase"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium capitalize">{subscription.plan}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        subscription.status === "active"
                          ? "text-emerald-500"
                          : subscription.status === "cancelled"
                            ? "text-red-400"
                            : "text-amber-400"
                      }
                    >
                      {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground/70">
                    {subscription.currentPeriodEnd ? "Subscription" : "Lifetime"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {subscription.createdAt
                      ? new Date(subscription.createdAt).toLocaleDateString("en-CA")
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── DOWNLOAD ── */}
      <section className="space-y-2.5">
        <SectionLabel>Download</SectionLabel>
        <div className="flex items-center justify-between rounded-md border border-border/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium">Stroke Desktop</p>
            <p className="mt-0.5 text-xs text-muted-foreground">macOS · Windows · Linux</p>
          </div>
          <div className="flex items-center gap-2">
            <SmartDownloadButton size="sm" />
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <DownloadIcon className="size-3.5" />
              All releases
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
      {children}
    </p>
  );
}
