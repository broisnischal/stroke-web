import { useQuery } from "@tanstack/react-query";

import { REPO_SLUG } from "./releases";

/** Human-facing link to the changelog source on GitHub. */
export const CHANGELOG_URL = `https://github.com/${REPO_SLUG}/blob/main/CHANGELOG.md`;
// Server-side proxy (src/routes/api/changelog.ts), cached, avoids rate limits.
const CHANGELOG_API = "/api/changelog";

export interface ChangelogEntry {
  /** e.g. "1.0.0" */
  version: string;
  /** raw date string from the header (e.g. "2026-07-01"), or null */
  date: string | null;
  /** markdown body between this version header and the next */
  body: string;
}

// Matches a version heading like "## [1.0.0] - 2026-07-01". Requires exactly
// two hashes, so "###"/"####" section headings inside an entry are left alone.
const VERSION_HEADER = /^##\s+\[?([^\]\s]+)\]?\s*(?:[-–—]\s*(.+))?$/;

/**
 * Split a CHANGELOG.md into per-version entries, newest first (source order).
 * Anything before the first version heading (title, intro) is ignored.
 */
export function parseChangelog(markdown: string): ChangelogEntry[] {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.body = buffer.join("\n").trim();
      entries.push(current);
    }
    buffer = [];
  };

  for (const line of lines) {
    const m = VERSION_HEADER.exec(line);
    if (m) {
      flush();
      current = { version: m[1], date: m[2]?.trim() ?? null, body: "" };
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();

  return entries;
}

async function fetchChangelog(): Promise<ChangelogEntry[]> {
  const res = await fetch(CHANGELOG_API);
  // A failed response carries an error object, not markdown, so surface it as a
  // query error instead of rendering the raw JSON.
  if (!res.ok) throw new Error(`Changelog API responded with ${res.status}`);
  const text = await res.text();
  return parseChangelog(text);
}

export function useChangelog() {
  return useQuery({
    queryKey: ["changelog"],
    queryFn: fetchChangelog,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}
