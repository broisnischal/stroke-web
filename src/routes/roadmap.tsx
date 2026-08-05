import { SiPlanetscale, SiPrisma, SiSupabase } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, CheckIcon } from "lucide-react";

import { BrushStroke, REPO_URL, SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import { seo } from "#/lib/seo";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    seo({
      title: "Roadmap · Stroke",
      description:
        "What has shipped in Stroke, what's being built now, and what's planned next, from database engines and provider sign-in to the built-in MCP server.",
      path: "/roadmap",
    }),
  component: RoadmapPage,
});

type ItemState = "done" | "active" | "todo";

interface RoadmapItem {
  title: string;
  body: string;
  extra?: React.ReactNode;
}

const PROVIDERS = [
  { name: "Neon", Icon: null },
  { name: "Supabase", Icon: SiSupabase },
  { name: "PlanetScale", Icon: SiPlanetscale },
  { name: "Prisma Postgres", Icon: SiPrisma },
];

// Completed items are drawn from the changelog (stroke.click/changelog).
const SHIPPED: RoadmapItem[] = [
  {
    title: "Ten database engines",
    body: "PostgreSQL, MySQL, MariaDB, SQLite, DuckDB, SQL Server, ClickHouse, CockroachDB, Turso / LibSQL, and Cloudflare D1.",
  },
  {
    title: "Provider sign-in",
    body: "Authorize once, see every database on your account, and connect in one click. No hunting for connection strings.",
    extra: (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PROVIDERS.map((p) => (
          <span
            key={p.name}
            className="flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 text-xs text-muted-foreground"
          >
            {p.Icon && <p.Icon className="size-3" />}
            {p.name}
          </span>
        ))}
      </div>
    ),
  },
  {
    title: "Built-in MCP server",
    body: "Expose a connection to Claude, Cursor, and other agents in one click, so they work against the live schema.",
  },
  {
    title: "AI chat, built in",
    body: "A schema-aware assistant that runs queries, explains schemas, and drafts SQL right inside the app.",
  },
  {
    title: "Charts and dashboards",
    body: "Turn query results into bar, line, pie, and scatter charts and pin them to a dashboard.",
  },
  {
    title: "Schema diagrams",
    body: "Auto-generated ERDs of your tables and relationships, with foreign-key navigation.",
  },
  {
    title: "Backup and restore",
    body: "Export and restore whole databases or a subset, with per-statement savepoints so one bad row can't abort the job.",
  },
  {
    title: "Signed and notarized builds",
    body: "Code signing on macOS (Developer ID + notarization) and Windows, so the first launch is clean.",
  },
  {
    title: "Auto-update",
    body: "Stroke updates itself in place through the built-in updater. No re-downloading installers.",
  },
  {
    title: "OS keychain storage",
    body: "AI keys and provider tokens live in the OS keychain (Keychain, Credential Manager, Secret Service).",
  },
  {
    title: "Command palette and shortcuts",
    body: "Cmd/Ctrl+K to jump anywhere, plus a deep set of keyboard shortcuts for tabs, search, and navigation.",
  },
];

const IN_PROGRESS: RoadmapItem[] = [
  {
    title: "Redesigned connection experience",
    body: "A two-pane connect screen: pick your type, driver, and saved connections on the left while editing details in a focused pane on the right.",
  },
  {
    title: "Redis support",
    body: "A Redis client, already in the connection picker behind a “soon” tag. It ships once it holds up against real workloads.",
  },
];

const PLANNED: RoadmapItem[] = [
  {
    title: "SSH tunnels",
    body: "Connect to databases behind a bastion host without leaving the app.",
  },
  {
    title: "More export formats",
    body: "Parquet and JSONL export from any grid or query result, alongside the existing CSV and JSON.",
  },
  {
    title: "Saved queries on both devices",
    body: "Your query library follows your license, so both of your machines stay in sync.",
  },
  {
    title: "More engines",
    body: "New dialects land regularly, decided by what users ask for. BigQuery and others are in the queue.",
  },
];

const EXPLORING: RoadmapItem[] = [
  {
    title: "Extension API",
    body: "The Extensions panel is in the app today. A public API for community-built panels and dialect plugins is under design.",
  },
  {
    title: "Shared workspaces",
    body: "Connections, saved queries, and dashboards shared across a team.",
  },
  {
    title: "Local AI models",
    body: "Point the AI assistant at a model running on your own machine, so schema and data never leave it.",
  },
];

const GROUPS: { label: string; note: string; state: ItemState; items: RoadmapItem[] }[] = [
  { label: "Shipped", note: "Done and in your hands", state: "done", items: SHIPPED },
  { label: "In progress", note: "Being built now", state: "active", items: IN_PROGRESS },
  { label: "Planned", note: "Next in line", state: "todo", items: PLANNED },
  { label: "Exploring", note: "Taking shape", state: "todo", items: EXPLORING },
];

function Checkbox({ state }: { state: ItemState }) {
  if (state === "done") {
    return (
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-copper text-background">
        <CheckIcon className="size-3.5" strokeWidth={2.75} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-copper/70">
        <span className="size-1.5 rounded-full bg-copper" />
      </span>
    );
  }
  return <span className="mt-0.5 size-5 shrink-0 rounded-md border border-border" />;
}

function RoadmapPage() {
  const shippedCount = SHIPPED.length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Roadmap</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Where Stroke is headed
        </h1>
        <BrushStroke className="mt-4 h-2 w-20" />
        <p className="mt-6 text-[15px] leading-[1.75] text-pretty text-muted-foreground">
          What has already shipped, what's being built now, and what's next. The order comes from
          what people ask for, so if something you need is missing,{" "}
          <a
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            open an issue
          </a>
          .
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/changelog" className={buttonVariants({ variant: "outline", size: "sm" })}>
            See every release
            <ArrowRightIcon className="size-3.5" />
          </Link>
          <span className="text-xs text-muted-foreground">
            {shippedCount} milestones shipped and counting
          </span>
        </div>

        <div className="mt-14 space-y-14">
          {GROUPS.map((group) => (
            <section key={group.label}>
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-semibold tracking-tight">{group.label}</h2>
                <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                  {group.note}
                </span>
              </div>
              <ul className="mt-5 space-y-5">
                {group.items.map((item) => (
                  <li key={item.title} className="flex gap-3.5">
                    <Checkbox state={group.state} />
                    <div>
                      <h3
                        className={cn(
                          "text-sm font-semibold",
                          group.state === "done" && "text-foreground",
                        )}
                      >
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">
                        {item.body}
                      </p>
                      {item.extra}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-3 border-t border-border/40 pt-8">
          <Link to="/changelog" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Read the changelog
            <ArrowRightIcon className="size-3.5" />
          </Link>
          <a
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Request a feature
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
