import { Link } from "@tanstack/react-router";
import { DownloadIcon, MonitorIcon } from "lucide-react";
import posthog from "posthog-js";

import { buttonVariants } from "#/components/ui/button";
import {
  type Arch,
  formatBytes,
  getDownloadAsset,
  type GitHubRelease,
  type Platform,
  useLatestRelease,
  usePlatform,
} from "#/lib/releases";

interface DownloadButtonProps {
  size?: "lg" | "default" | "sm";
  variant?: "default" | "outline";
  className?: string;
}

export function SmartDownloadButton({
  size = "lg",
  variant = "outline",
  className,
}: DownloadButtonProps) {
  const platform = usePlatform();
  const { data: release } = useLatestRelease();

  const asset =
    platform && release ? getDownloadAsset(release.assets, platform.os, platform.arch) : null;

  const version = release?.tag_name;

  return (
    <div className="flex flex-col items-start gap-2">
      {platform && asset ? (
        <a
          href={asset.browser_download_url}
          onClick={() =>
            posthog.capture("download_clicked", {
              os: platform.os,
              arch: platform.arch,
              version,
              asset: asset.name,
            })
          }
          className={buttonVariants({ variant, size, className })}
        >
          <DownloadIcon className="size-4" />
          Download for {platform.label}
          {version && <span className="ml-1 text-xs opacity-70">{version}</span>}
        </a>
      ) : (
        // No detection yet or no matching asset, so send them to the download page
        <Link to="/download" className={buttonVariants({ variant, size, className })}>
          <DownloadIcon className="size-4" />
          Download
          {version && <span className="ml-1 text-xs opacity-70">{version}</span>}
        </Link>
      )}
      {/* Reserved line so the layout doesn't jump when the alternate link appears */}
      <div className="min-h-4">
        {platform && release && <AlternateDownloadLink platform={platform} release={release} />}
      </div>
    </div>
  );
}

function AlternateDownloadLink({
  platform,
  release,
}: {
  platform: Platform;
  release: GitHubRelease;
}) {
  if (platform.os === "macos") {
    const altArch: Arch = platform.arch === "arm64" ? "x64" : "arm64";
    const altAsset = getDownloadAsset(release.assets, "macos", altArch);
    if (!altAsset) return null;
    return (
      <a
        href={altAsset.browser_download_url}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <MonitorIcon className="size-3" />
        Download for macOS ({altArch === "arm64" ? "Apple Silicon" : "Intel"}) instead
      </a>
    );
  }

  if (platform.os === "linux") {
    const deb = release.assets.find((a) => a.name.endsWith(".deb"));
    const rpm = release.assets.find((a) => a.name.endsWith(".rpm"));
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {deb && (
          <a href={deb.browser_download_url} className="transition-colors hover:text-foreground">
            .deb ({formatBytes(deb.size)})
          </a>
        )}
        {rpm && (
          <a href={rpm.browser_download_url} className="transition-colors hover:text-foreground">
            .rpm ({formatBytes(rpm.size)})
          </a>
        )}
        <Link to="/download" className="transition-colors hover:text-foreground">
          All downloads
        </Link>
      </div>
    );
  }

  return (
    <Link
      to="/download"
      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      All platforms and formats
    </Link>
  );
}
