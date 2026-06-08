import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircleIcon, CopyIcon, DownloadIcon, KeyRoundIcon, MonitorIcon } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "#/components/ui/button";
import { useAuthSuspense } from "#/lib/auth/hooks";
import { billingQueryOptions, licenseQueryOptions } from "#/lib/billing/functions";

const RELEASES_URL = "https://github.com/broisnischal/stroke/releases";

export const Route = createFileRoute("/_auth/app/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(billingQueryOptions());
    context.queryClient.prefetchQuery(licenseQueryOptions());
  },
  component: AppIndex,
});

function AppIndex() {
  const { user } = useAuthSuspense();
  const { data: subscription } = useQuery(billingQueryOptions());
  const { data: license } = useQuery(licenseQueryOptions());

  const isPro = subscription?.status === "active";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isPro ? "Your Stroke Pro license is active." : "Upgrade to unlock all features."}
        </p>
      </div>

      {/* Status banner */}
      {!isPro && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 px-5 py-4">
          <div>
            <p className="text-sm font-medium">No active license</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Purchase a lifetime Pro license to unlock all features.
            </p>
          </div>
          <Link to="/app/billing" className={buttonVariants({ size: "sm" })}>
            <KeyRoundIcon className="size-3.5" />
            Buy license
          </Link>
        </div>
      )}

      {/* License key card */}
      {isPro && license ? (
        <LicenseCard licenseKey={license.licenseKey} maxDevices={license.maxDevices} />
      ) : isPro ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Generating your license key…
        </div>
      ) : null}

      {/* Download card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <DownloadIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-semibold">Download Stroke</h2>
            <p className="text-xs text-muted-foreground">macOS, Windows, and Linux</p>
          </div>
        </div>
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <DownloadIcon className="size-3.5" />
          View all releases
        </a>
      </div>

      {/* Plan summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Plan" value={isPro ? "Pro" : "Free"} highlight={isPro} />
        <StatCard label="License type" value="Lifetime" />
        <StatCard label="Devices allowed" value={license ? `${license.maxDevices}` : "—"} />
      </div>
    </div>
  );
}

function LicenseCard({ licenseKey, maxDevices }: { licenseKey: string; maxDevices: number }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Truncate for display: show first 40 chars + ellipsis
  const display = licenseKey.length > 48 ? `${licenseKey.slice(0, 48)}…` : licenseKey;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
            <KeyRoundIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-semibold">Your license key</h2>
            <p className="text-xs text-muted-foreground">
              Use on up to {maxDevices} devices — enter in the app to activate
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
          <CheckCircleIcon className="size-3" />
          Active
        </span>
      </div>

      {/* Key display */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <code className="flex-1 truncate font-mono text-xs text-foreground">{display}</code>
        <button
          type="button"
          onClick={copy}
          title="Copy license key"
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

      {/* Instructions */}
      <ol className="mt-4 space-y-1.5 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            1
          </span>
          Download and open Stroke on your machine.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            2
          </span>
          Go to <strong>Settings → License</strong> and paste your key.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            3
          </span>
          Repeat on up to {maxDevices} devices.
        </li>
      </ol>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <MonitorIcon className="size-3.5 shrink-0" />
        This key is tied to your account. Do not share it publicly.
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={[
          "mt-1 text-lg font-semibold",
          highlight ? "text-primary" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}
