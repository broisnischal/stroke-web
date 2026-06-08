import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, MonitorIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { buttonVariants } from "#/components/ui/button";

const RELEASES_URL = "https://github.com/broisnischal/stroke/releases";
const GITHUB_API = "https://api.github.com/repos/broisnischal/stroke/releases/latest";

interface NavigatorUAData {
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<{ architecture: string }>;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

type OS = "windows" | "macos" | "linux";
type Arch = "x64" | "arm64";

interface Platform {
  os: OS;
  arch: Arch;
  label: string;
}

function getDownloadAsset(assets: GitHubAsset[], os: OS, arch: Arch): GitHubAsset | null {
  switch (os) {
    case "windows":
      return (
        assets.find((a) => a.name.includes("x64-setup") && a.name.endsWith(".exe")) ??
        assets.find((a) => a.name.endsWith(".exe")) ??
        null
      );
    case "macos":
      if (arch === "arm64") {
        return assets.find((a) => a.name.includes("aarch64") && a.name.endsWith(".dmg")) ?? null;
      }
      return assets.find((a) => a.name.includes("x64") && a.name.endsWith(".dmg")) ?? null;
    case "linux":
      return (
        assets.find((a) => a.name.endsWith(".AppImage") && !a.name.endsWith(".tar.gz")) ??
        assets.find((a) => a.name.endsWith(".deb")) ??
        null
      );
  }
}

/** Detects OS + arch using Web APIs. Run client-side only. */
async function detectPlatform(): Promise<Platform | null> {
  const ua = navigator.userAgent;

  if (/windows/i.test(ua)) {
    return { os: "windows", arch: "x64", label: "Windows" };
  }

  if (/macintosh|mac os x/i.test(ua)) {
    let arch: Arch = "x64";
    // Use User-Agent Client Hints (Chrome/Edge) for accurate arch detection
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
    if (uaData) {
      try {
        const high = await uaData.getHighEntropyValues(["architecture"]);
        if (high.architecture === "arm") arch = "arm64";
      } catch {
        // fallback: heuristic — Safari on M1 includes CPU info in UA string
        if (/arm/i.test(ua)) arch = "arm64";
      }
    } else if (/arm/i.test(ua)) {
      arch = "arm64";
    }
    return {
      os: "macos",
      arch,
      label: `macOS (${arch === "arm64" ? "Apple Silicon" : "Intel"})`,
    };
  }

  if (/linux/i.test(ua)) {
    const arch: Arch = /arm|aarch64/i.test(ua) ? "arm64" : "x64";
    return { os: "linux", arch, label: "Linux" };
  }

  return null;
}

function usePlatform() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  useEffect(() => {
    detectPlatform().then(setPlatform);
  }, []);
  return platform;
}

function useLatestRelease() {
  return useQuery<GitHubRelease>({
    queryKey: ["github-latest-release"],
    queryFn: () => fetch(GITHUB_API).then((r) => r.json() as Promise<GitHubRelease>),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60,
  });
}

interface DownloadButtonProps {
  size?: "lg" | "default" | "sm";
  className?: string;
}

export function SmartDownloadButton({ size = "lg", className }: DownloadButtonProps) {
  const platform = usePlatform();
  const { data: release } = useLatestRelease();

  const asset =
    platform && release ? getDownloadAsset(release.assets, platform.os, platform.arch) : null;

  const version = release?.tag_name;

  if (!platform || !asset) {
    // No detection yet or no matching asset — fall back to releases page
    return (
      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ variant: "outline", size, className })}
      >
        <DownloadIcon className="size-4" />
        Download
        {version && <span className="ml-1 text-xs text-muted-foreground">{version}</span>}
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <a
        href={asset.browser_download_url}
        className={buttonVariants({ variant: "outline", size, className })}
      >
        <DownloadIcon className="size-4" />
        Download for {platform.label}
        {version && <span className="ml-1 text-xs text-muted-foreground">{version}</span>}
      </a>
      {/* Alt download: switch arch on macOS, or go to all releases */}
      <AlternateDownloadLink platform={platform} release={release} />
    </div>
  );
}

function AlternateDownloadLink({
  platform,
  release,
}: {
  platform: Platform;
  release: GitHubRelease | undefined;
}) {
  if (!release) return null;

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
            .deb
          </a>
        )}
        {rpm && (
          <a href={rpm.browser_download_url} className="transition-colors hover:text-foreground">
            .rpm
          </a>
        )}
        <a
          href={RELEASES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          All downloads
        </a>
      </div>
    );
  }

  return null;
}
