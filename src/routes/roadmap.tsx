import { SiPlanetscale, SiPrisma, SiSupabase, SiTurso } from "@icons-pack/react-simple-icons";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { REPO_URL, SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import { seo } from "#/lib/seo";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/roadmap")({
  head: () =>
    seo({
      title: "Roadmap · Stroke",
      description:
        "What's being built in Stroke right now, what's planned next, and what's still taking shape, including provider adapters for Neon, Prisma, Supabase, and more.",
      path: "/roadmap",
    }),
  component: RoadmapPage,
});

interface RoadmapItem {
  title: string;
  body: string;
  extra?: React.ReactNode;
}

const PROVIDER_ICONS = [
  { name: "Neon", Icon: null },
  { name: "Prisma Postgres", Icon: SiPrisma },
  { name: "Supabase", Icon: SiSupabase },
  { name: "PlanetScale", Icon: SiPlanetscale },
  { name: "Turso", Icon: SiTurso },
];

const IN_PROGRESS: RoadmapItem[] = [
  {
    title: "Provider adapters",
    body: "Sign in to your database provider from inside Stroke, see every database on your account, and connect with one click. No hunting through dashboards for connection strings. Starting with:",
    extra: (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PROVIDER_ICONS.map((p) => (
          <span
            key={p.name}
            className="flex items-center gap-1.5 rounded-md border border-border/50 px-2.5 py-1 text-xs text-muted-foreground"
          >
            {p.Icon && <p.Icon className="size-3" />}
            {p.name}
          </span>
        ))}
        <span className="text-xs text-muted-foreground">and more</span>
      </div>
    ),
  },
  {
    title: "BigQuery support",
    body: 'Already in the app\'s connection picker behind a "soon" tag. It ships once it holds up against real analytics workloads.',
  },
  {
    title: "Signed builds",
    body: "Code signing and notarization for macOS and Windows, so the first launch stops needing a security workaround.",
  },
];

const PLANNED: RoadmapItem[] = [
  {
    title: "More dialects",
    body: "New engines land regularly. MariaDB and CockroachDB arrived recently, and BigQuery is close. Open an issue to vote on which one comes next.",
  },
  {
    title: "SSH tunnels",
    body: "Connect to databases behind a bastion host without leaving the app.",
  },
  {
    title: "Auto-update",
    body: "Stroke updates itself in place. No re-downloading installers for every release.",
  },
  {
    title: "Saved queries on both devices",
    body: "Your query library follows your license, so both of your machines stay in sync.",
  },
  {
    title: "More export formats",
    body: "Parquet and JSONL export from any grid or query result, next to the existing CSV and JSON.",
  },
];

const EXPLORING: RoadmapItem[] = [
  {
    title: "Extension API",
    body: "The Extensions panel is in the app today. An API for community-built panels and dialect plugins is under design.",
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

const SECTIONS = [
  {
    label: "In progress",
    note: "Being built now",
    items: IN_PROGRESS,
    dot: "bg-copper",
  },
  {
    label: "Planned",
    note: "Next in line",
    items: PLANNED,
    dot: "bg-foreground/40",
  },
  {
    label: "Exploring",
    note: "Taking shape",
    items: EXPLORING,
    dot: "border border-muted-foreground/60 bg-transparent",
  },
];

function RoadmapPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Roadmap</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Where Stroke is headed
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          What's being built now, what's next, and what's still taking shape. The order comes from
          what users ask for, so if something you need is missing,{" "}
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

        <div className="mt-12 space-y-14">
          {SECTIONS.map((section) => (
            <section key={section.label}>
              <div className="flex items-baseline gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
                  <span className={cn("size-2 rounded-full", section.dot)} aria-hidden="true" />
                  {section.label}
                </h2>
                <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                  {section.note}
                </span>
              </div>
              <div className="mt-4 divide-y divide-border/40 border-t border-border/40">
                {section.items.map((item) => (
                  <div key={item.title} className="py-5">
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                    {item.extra}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <Link to="/changelog" className={buttonVariants({ variant: "outline", size: "sm" })}>
            See what already shipped
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
