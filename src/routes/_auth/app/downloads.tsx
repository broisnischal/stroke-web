import { createFileRoute } from "@tanstack/react-router";
import {
  DownloadIcon,
  ExternalLinkIcon,
  MonitorIcon,
  ServerIcon,
  TerminalIcon,
} from "lucide-react";

import { buttonVariants } from "#/components/ui/button";
import {
  type Arch,
  type GitHubAsset,
  type OS,
  RELEASES_URL,
  useLatestRelease,
  usePlatform,
} from "#/lib/releases";

export const Route = createFileRoute("/_auth/app/downloads")({
  component: DownloadsPage,
});

const PLATFORM_GROUPS: {
  icon: React.ElementType;
  os: OS;
  label: string;
  packages: { arch: Arch; ext: string; label: string; matcher: (a: GitHubAsset) => boolean }[];
}[] = [
  {
    icon: MonitorIcon,
    os: "macos",
    label: "macOS",
    packages: [
      {
        arch: "arm64",
        ext: ".dmg",
        label: "Apple Silicon (arm64)",
        matcher: (a) => a.name.includes("aarch64") && a.name.endsWith(".dmg"),
      },
      {
        arch: "x64",
        ext: ".dmg",
        label: "Intel (x64)",
        matcher: (a) => a.name.includes("x64") && a.name.endsWith(".dmg"),
      },
    ],
  },
  {
    icon: ServerIcon,
    os: "windows",
    label: "Windows",
    packages: [
      {
        arch: "x64",
        ext: ".exe",
        label: "x64 installer",
        matcher: (a) => a.name.includes("x64-setup") && a.name.endsWith(".exe"),
      },
      {
        arch: "x64",
        ext: ".msi",
        label: "MSI package",
        matcher: (a) => a.name.endsWith(".msi"),
      },
    ],
  },
  {
    icon: TerminalIcon,
    os: "linux",
    label: "Linux",
    packages: [
      {
        arch: "x64",
        ext: ".AppImage",
        label: "AppImage (x64)",
        matcher: (a) => a.name.endsWith(".AppImage") && !a.name.includes("arm"),
      },
      {
        arch: "x64",
        ext: ".deb",
        label: "Debian / Ubuntu (.deb)",
        matcher: (a) => a.name.endsWith(".deb") && !a.name.includes("arm"),
      },
      {
        arch: "x64",
        ext: ".rpm",
        label: "Fedora / RHEL (.rpm)",
        matcher: (a) => a.name.endsWith(".rpm") && !a.name.includes("arm"),
      },
      {
        arch: "arm64",
        ext: ".AppImage",
        label: "AppImage (arm64)",
        matcher: (a) =>
          a.name.endsWith(".AppImage") && (a.name.includes("arm") || a.name.includes("aarch64")),
      },
    ],
  },
];

function formatBytes(b: number) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadsPage() {
  const { data: release, isLoading } = useLatestRelease();
  const currentPlatform = usePlatform();

  return (
    <div className="mx-auto max-w-xl space-y-9">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Downloads</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isLoading
              ? "Fetching latest release…"
              : release
                ? `Latest: ${release.tag_name} · ${new Date(release.published_at).toLocaleDateString("en-CA")}`
                : "Stroke Desktop — macOS, Windows, Linux"}
          </p>
        </div>
        {release && (
          <a
            href={release.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLinkIcon className="size-3.5" />
            Release notes
          </a>
        )}
      </div>

      {/* Platform groups */}
      {PLATFORM_GROUPS.map(({ icon: Icon, os, label, packages }) => {
        const available = release
          ? packages.map((p) => ({ ...p, asset: release.assets.find(p.matcher) ?? null }))
          : packages.map((p) => ({ ...p, asset: null }));

        const hasAny = available.some((p) => p.asset !== null);

        return (
          <section key={os} className="space-y-2.5">
            <div className="flex items-center gap-2">
              <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
                {label}
              </p>
              {currentPlatform?.os === os && (
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-medium tracking-widest text-emerald-500 uppercase">
                  Your platform
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-md border border-border/40">
              {isLoading ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">Loading…</div>
              ) : !hasAny ? (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No packages available yet for this platform in the latest release.
                </div>
              ) : (
                available
                  .filter((p) => p.asset !== null)
                  .map(({ asset, label: pkgLabel, arch }, i, arr) => {
                    const isRecommended =
                      currentPlatform?.os === os && currentPlatform.arch === arch;
                    return (
                      <a
                        key={pkgLabel}
                        href={asset!.browser_download_url}
                        className={[
                          "flex items-center justify-between px-4 py-3 transition-colors hover:bg-foreground/[0.025]",
                          i < arr.length - 1 ? "border-b border-border/30" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{pkgLabel}</span>
                              {isRecommended && (
                                <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-muted-foreground uppercase">
                                  recommended
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              {asset!.name} · {formatBytes(asset!.size)}
                            </p>
                          </div>
                        </div>
                        <DownloadIcon className="size-4 shrink-0 text-muted-foreground" />
                      </a>
                    );
                  })
              )}
            </div>
          </section>
        );
      })}

      {/* All releases link */}
      <div className="flex items-center justify-between rounded-md border border-border/30 bg-foreground/[0.02] px-4 py-3">
        <p className="text-xs text-muted-foreground">Older versions and pre-releases</p>
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          All releases
          <ExternalLinkIcon className="size-3" />
        </a>
      </div>
    </div>
  );
}
