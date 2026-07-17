import { SiApple, SiLinux } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AppWindowIcon,
  ArrowRightIcon,
  BoxIcon,
  CheckIcon,
  CopyIcon,
  CpuIcon,
  MicrochipIcon,
  PackageIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import {
  DOWNLOAD_TARGETS,
  type DownloadTarget,
  findAsset,
  formatBytes,
  formatReleaseDate,
  type GitHubRelease,
  type OS,
  type Platform,
  RELEASES_URL,
  useLatestRelease,
  usePlatform,
} from "#/lib/releases";
import { seo } from "#/lib/seo";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/download")({
  head: () =>
    seo({
      title: "Download Stroke for macOS, Windows & Linux",
      description:
        "Download Stroke for macOS (Apple Silicon and Intel), Windows, and Linux, or install it with Homebrew or Scoop. Free to try, $9.99 to own it forever.",
      path: "/download",
    }),
  component: DownloadPage,
});

function WindowsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M0 3.45 9.75 2.1v9.45H0zm10.95-1.5L24 0v11.55H10.95zM0 12.45h9.75v9.45L0 20.55zm10.95 0H24V24l-13.05-1.95z" />
    </svg>
  );
}

const OS_ROWS: { os: OS; name: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { os: "macos", name: "macOS", Icon: SiApple },
  { os: "windows", name: "Windows", Icon: WindowsLogo },
  { os: "linux", name: "Linux", Icon: SiLinux },
];

const TARGET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "mac-arm": CpuIcon,
  "mac-intel": MicrochipIcon,
  "win-exe": AppWindowIcon,
  "win-msi": PackageIcon,
  "linux-appimage": BoxIcon,
  "linux-deb": PackageIcon,
  "linux-rpm": PackageIcon,
};

function DownloadPage() {
  const { data: release } = useLatestRelease();
  const platform = usePlatform();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Download
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Download Stroke</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Native builds for macOS, Windows, and Linux. Free to try, no account needed.
        </p>

        {/* Version row */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Version{" "}
            {release ? (
              <span className="font-mono text-foreground">{release.tag_name}</span>
            ) : (
              <span className="inline-block h-4 w-14 animate-pulse rounded bg-muted align-middle" />
            )}
            {release?.published_at && (
              <span className="ml-2 text-xs">
                released {formatReleaseDate(release.published_at)}
              </span>
            )}
          </p>
          <Link to="/changelog" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View changelog
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        {/* Platform rows */}
        <div className="mt-4 divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50">
          {OS_ROWS.map((row) => (
            <PlatformRow key={row.os} row={row} release={release} platform={platform} />
          ))}
        </div>

        {/* Package managers */}
        <section className="mt-10">
          <h2 className="text-sm font-semibold">Prefer a package manager?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These installs skip the security warnings below and update in place.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CommandCard
              label="macOS · Homebrew"
              command="brew install --cask broisnischal/tap/stroke"
            />
            <CommandCard
              label="Windows · Scoop"
              command={
                "scoop bucket add stroke https://github.com/broisnischal/stroke\nscoop install stroke"
              }
            />
          </div>
        </section>

        {/* Unsigned notice */}
        <section className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <TriangleAlertIcon className="size-4 text-amber-500" />
            Unsigned application
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Direct downloads are not code-signed yet, so your OS will warn you on first launch:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="font-medium text-foreground">macOS:</strong> right-click the app
              and choose "Open", or allow it under System Settings → Privacy &amp; Security.
            </li>
            <li>
              <strong className="font-medium text-foreground">Windows:</strong> click "More info",
              then "Run anyway" in the SmartScreen dialog.
            </li>
          </ul>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Older versions and checksums live on{" "}
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            the releases page
          </a>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function CommandCard({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy ${label} command`}
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-copper" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
      <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-relaxed">
        <code>{command}</code>
      </pre>
    </div>
  );
}

function PlatformRow({
  row,
  release,
  platform,
}: {
  row: (typeof OS_ROWS)[number];
  release: GitHubRelease | null | undefined;
  platform: Platform | null;
}) {
  const targets = DOWNLOAD_TARGETS.filter((t) => t.os === row.os);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <row.Icon className="size-4.5 text-muted-foreground/70" />
        <span className="text-sm font-medium">{row.name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {release
          ? targets.map((target) => (
              <TargetButton
                key={target.key}
                target={target}
                release={release}
                detected={
                  platform !== null &&
                  platform.os === target.os &&
                  (target.arch === null || platform.arch === target.arch)
                }
              />
            ))
          : targets.map((target) => (
              <span
                key={target.key}
                className="h-7 w-24 animate-pulse rounded-2xl bg-muted"
                aria-hidden="true"
              />
            ))}
      </div>
    </div>
  );
}

function TargetButton({
  target,
  release,
  detected,
}: {
  target: DownloadTarget;
  release: GitHubRelease;
  detected: boolean;
}) {
  const asset = findAsset(release.assets, target);
  if (!asset) return null;

  const Icon = TARGET_ICONS[target.key];

  return (
    <a
      href={asset.browser_download_url}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        detected && "border-copper/60 text-foreground",
      )}
      title={asset.name}
    >
      {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      {target.label}
      <span className="text-[11px] text-muted-foreground">{formatBytes(asset.size)}</span>
      {detected && (
        <span className="font-mono text-[10px] tracking-wide text-copper uppercase">for you</span>
      )}
    </a>
  );
}
