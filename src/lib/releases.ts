import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export const REPO_SLUG = "broisnischal/stroke";
export const RELEASES_URL = `https://github.com/${REPO_SLUG}/releases`;
// Server-side proxy (src/routes/api/releases.ts) — cached, and immune to
// GitHub's per-visitor rate limits.
const RELEASES_API = "/api/releases";

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  assets: GitHubAsset[];
}

async function fetchReleases(): Promise<GitHubRelease[]> {
  const res = await fetch(RELEASES_API);
  // A failed response carries an error object, not release data — surface it
  // as a query error instead of rendering garbage.
  if (!res.ok) throw new Error(`Releases API responded with ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data)) throw new Error("Unexpected releases payload");
  return data as GitHubRelease[];
}

const releasesQuery = {
  queryKey: ["github-releases"],
  queryFn: fetchReleases,
  staleTime: 1000 * 60 * 30,
  gcTime: 1000 * 60 * 60,
  retry: 1,
} as const;

export function useReleases() {
  return useQuery(releasesQuery);
}

export function useLatestRelease() {
  return useQuery({
    ...releasesQuery,
    select: (releases) => releases.find((r) => !r.draft && !r.prerelease) ?? releases[0] ?? null,
  });
}

export type OS = "windows" | "macos" | "linux";
export type Arch = "x64" | "arm64";

export interface Platform {
  os: OS;
  arch: Arch;
  label: string;
}

interface NavigatorUAData {
  platform: string;
  getHighEntropyValues(hints: string[]): Promise<{ architecture: string }>;
}

/**
 * Detects OS + arch using Web APIs. Run client-side only.
 * On macOS we assume Apple Silicon unless the browser tells us it's x86 —
 * nearly every Mac in use today is arm64.
 */
export async function detectPlatform(): Promise<Platform | null> {
  const ua = navigator.userAgent;

  if (/windows/i.test(ua)) {
    return { os: "windows", arch: "x64", label: "Windows" };
  }

  if (/macintosh|mac os x/i.test(ua)) {
    let arch: Arch = "arm64";
    // User-Agent Client Hints (Chrome/Edge) can identify an Intel Mac exactly
    const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
    if (uaData) {
      try {
        const high = await uaData.getHighEntropyValues(["architecture"]);
        if (high.architecture === "x86") arch = "x64";
      } catch {
        // keep the arm64 default
      }
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

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  useEffect(() => {
    detectPlatform().then(setPlatform);
  }, []);
  return platform;
}

/** One downloadable artifact on the /download page. */
export interface DownloadTarget {
  key: string;
  os: OS;
  arch: Arch | null;
  label: string;
  match: (asset: GitHubAsset) => boolean;
}

export const DOWNLOAD_TARGETS: DownloadTarget[] = [
  {
    key: "mac-arm",
    os: "macos",
    arch: "arm64",
    label: "Apple Silicon",
    match: (a) => a.name.endsWith(".dmg") && a.name.includes("aarch64"),
  },
  {
    key: "mac-intel",
    os: "macos",
    arch: "x64",
    label: "Intel",
    match: (a) => a.name.endsWith(".dmg") && a.name.includes("x64"),
  },
  {
    key: "win-exe",
    os: "windows",
    arch: "x64",
    label: "EXE",
    match: (a) => a.name.endsWith(".exe"),
  },
  {
    key: "win-msi",
    os: "windows",
    arch: null,
    label: "MSI",
    match: (a) => a.name.endsWith(".msi"),
  },
  {
    key: "linux-appimage",
    os: "linux",
    arch: "x64",
    label: "AppImage",
    match: (a) => a.name.endsWith(".AppImage"),
  },
  {
    key: "linux-deb",
    os: "linux",
    arch: null,
    label: ".deb",
    match: (a) => a.name.endsWith(".deb"),
  },
  {
    key: "linux-rpm",
    os: "linux",
    arch: null,
    label: ".rpm",
    match: (a) => a.name.endsWith(".rpm"),
  },
];

export function findAsset(assets: GitHubAsset[], target: DownloadTarget): GitHubAsset | null {
  if (!Array.isArray(assets)) return null;
  return assets.find(target.match) ?? null;
}

/** The single best asset for a detected platform (used by the smart button). */
export function getDownloadAsset(assets: GitHubAsset[], os: OS, arch: Arch): GitHubAsset | null {
  if (!Array.isArray(assets)) return null;
  switch (os) {
    case "macos": {
      const wanted = arch === "arm64" ? "aarch64" : "x64";
      return assets.find((a) => a.name.endsWith(".dmg") && a.name.includes(wanted)) ?? null;
    }
    case "windows":
      return (
        assets.find((a) => a.name.includes("setup") && a.name.endsWith(".exe")) ??
        assets.find((a) => a.name.endsWith(".exe")) ??
        null
      );
    case "linux":
      return (
        assets.find((a) => a.name.endsWith(".AppImage")) ??
        assets.find((a) => a.name.endsWith(".deb")) ??
        null
      );
  }
}

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

export function formatReleaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
