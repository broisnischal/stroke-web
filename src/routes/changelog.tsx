import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Markdown } from "#/components/markdown";
import { SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import { type ChangelogEntry, CHANGELOG_URL, useChangelog } from "#/lib/changelog";
import { formatReleaseDate } from "#/lib/releases";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/changelog")({
  head: () =>
    seo({
      title: "Changelog — Stroke",
      description: "Every update to Stroke: new features, fixes, and changes, release by release.",
      path: "/changelog",
    }),
  component: ChangelogPage,
});

function formatEntryDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : formatReleaseDate(date);
}

function ChangelogPage() {
  const { data: entries, isError } = useChangelog();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Changelog
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          What's new in Stroke
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Every release, straight from the source. Update whenever you like: every version is
          included with your license.
        </p>
        <div className="mt-5">
          <Link to="/download" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Get the latest version
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>

        <div className="mt-12 space-y-0 divide-y divide-border/40">
          {entries?.map((entry) => (
            <ChangelogSection key={entry.version} entry={entry} />
          ))}

          {!entries && !isError && <ChangelogSkeleton />}

          {(isError || entries?.length === 0) && (
            <p className="py-10 text-sm text-muted-foreground">
              Couldn't load the changelog right now. Read it on{" "}
              <a
                href={CHANGELOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                GitHub
              </a>
              .
            </p>
          )}
        </div>

        {entries && entries.length > 0 && (
          <p className="mt-12 text-xs text-muted-foreground">
            Looking for older versions? Read the{" "}
            <a
              href={CHANGELOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              full changelog on GitHub
            </a>
            .
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ChangelogSection({ entry }: { entry: ChangelogEntry }) {
  const date = formatEntryDate(entry.date);

  return (
    <article className="grid grid-cols-1 gap-x-10 gap-y-4 py-10 md:grid-cols-[9rem_1fr]">
      <header>
        <span className="inline-block rounded-md border border-border/60 px-2 py-0.5 font-mono text-xs text-foreground">
          {entry.version}
        </span>
        {date && <p className="mt-2 text-xs text-muted-foreground">{date}</p>}
      </header>

      <div>
        {entry.body ? (
          <Markdown text={entry.body} />
        ) : (
          <p className="text-sm text-muted-foreground italic">No notes for this release.</p>
        )}
      </div>
    </article>
  );
}

function ChangelogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-4 py-10 md:grid-cols-[9rem_1fr]">
      <div className="space-y-2">
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-56 animate-pulse rounded bg-muted" />
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
