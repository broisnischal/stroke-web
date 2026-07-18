import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BotIcon,
  FileDownIcon,
  KeyboardIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PencilLineIcon,
  PlugIcon,
  SearchIcon,
  TablePropertiesIcon,
  TerminalIcon,
  ZapIcon,
} from "lucide-react";

import { SmartDownloadButton } from "#/components/download-button";
import { BrushStroke, SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/features")({
  head: () =>
    seo({
      title: "Features · Stroke",
      description:
        "Everything in Stroke: schema explorer, a fast data grid, inline editing, a schema-aware SQL console, diagrams, dashboards, an AI chat, and a built-in MCP server for agents.",
      path: "/features",
    }),
  component: FeaturesPage,
});

interface Feature {
  icon: React.ElementType;
  title: string;
  desc: string;
}

interface Group {
  label: string;
  features: Feature[];
}

const GROUPS: Group[] = [
  {
    label: "Explore",
    features: [
      {
        icon: TablePropertiesIcon,
        title: "Schema explorer",
        desc: "Browse tables, views, materialized views, foreign tables, indexes, and enums with live row counts, all in one tree.",
      },
      {
        icon: SearchIcon,
        title: "Powerful data grid",
        desc: "Paginated browsing, resizable columns, multi-column sort, full-text search, and a visual filter builder that writes the WHERE clause for you.",
      },
      {
        icon: PencilLineIcon,
        title: "Inline editing",
        desc: "Type-aware editors for text, numbers, booleans, enums, dates, UUIDs, and JSON, with changes staged until you commit them.",
      },
    ],
  },
  {
    label: "Query",
    features: [
      {
        icon: TerminalIcon,
        title: "SQL console",
        desc: "A Monaco editor with schema-aware autocomplete, formatting, execution time, and one keystroke to run. Built for real work, not a toy input box.",
      },
      {
        icon: FileDownIcon,
        title: "Export anywhere",
        desc: "Send any grid or query result straight to CSV or JSON, with Parquet and JSONL on the roadmap.",
      },
    ],
  },
  {
    label: "Visualize",
    features: [
      {
        icon: NetworkIcon,
        title: "Schema diagrams",
        desc: "Auto-generated ERDs of your tables and relationships, with foreign-key navigation so you can trace how everything connects.",
      },
      {
        icon: LayoutDashboardIcon,
        title: "Charts and dashboards",
        desc: "Turn query results into charts and pin them to a dashboard you can revisit any time.",
      },
    ],
  },
  {
    label: "AI and agents",
    features: [
      {
        icon: BotIcon,
        title: "AI chat, built in",
        desc: "A schema-aware assistant with direct database access that runs queries, explains schemas, and drafts SQL, right inside the app.",
      },
      {
        icon: PlugIcon,
        title: "Built-in MCP server",
        desc: "Expose a connection to Claude, Cursor, or any MCP client in one click, so your agents work against the live schema.",
      },
    ],
  },
  {
    label: "Everywhere",
    features: [
      {
        icon: KeyboardIcon,
        title: "Command palette",
        desc: "Press Cmd/Ctrl+K to jump anywhere. Every core view has a shortcut, so your hands stay on the keyboard.",
      },
      {
        icon: ZapIcon,
        title: "Native and fast",
        desc: "Built in Rust and Tauri, not another Electron app. It launches instantly and stays light no matter how large your tables get.",
      },
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Features
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Everything you need to work with data
        </h1>
        <BrushStroke className="mt-4 h-2 w-20" />
        <p className="mt-6 max-w-xl text-[15px] leading-[1.75] text-pretty text-muted-foreground">
          One studio for exploring, querying, and visualizing every database you run, with an AI
          chat and an MCP server so your agents can work alongside you.
        </p>

        <div className="mt-14 space-y-14">
          {GROUPS.map((group) => (
            <section key={group.label}>
              <h2 className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                {group.label}
              </h2>
              <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border/50 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
                {group.features.map((f) => (
                  <div key={f.title} className="flex flex-col gap-2 bg-background p-5">
                    <f.icon className="size-4 text-copper" strokeWidth={1.5} />
                    <h3 className="text-sm font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center gap-3">
          <SmartDownloadButton size="default" />
          <Link to="/docs" className={buttonVariants({ variant: "outline", size: "default" })}>
            Read the docs
          </Link>
          <a href="/#pricing" className={buttonVariants({ variant: "ghost", size: "default" })}>
            $9.99 · Own it forever
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
