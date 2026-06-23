import {
  SiCloudflare,
  SiGithub,
  SiMysql,
  SiPostgresql,
  SiSqlite,
} from "@icons-pack/react-simple-icons";
import { Link } from "@tanstack/react-router";
import {
  BotIcon,
  DatabaseIcon,
  KeyboardIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PencilLineIcon,
  PlugIcon,
  SearchIcon,
  TablePropertiesIcon,
  TerminalIcon,
} from "lucide-react";

import { SmartDownloadButton } from "#/components/download-button";
import { StrokeIcon } from "#/components/stroke-icon";
import { ThemeToggle } from "#/components/theme-toggle";
import { Button, buttonVariants } from "#/components/ui/button";
import { useAuth } from "#/lib/auth/hooks";
import { cn } from "#/lib/utils";

const REPO_URL = "https://github.com/broisnischal/stroke";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Pillars />
        <Databases />
        <Features />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-6">
        <Link to="/" aria-label="Stroke home" className="flex items-center gap-2">
          <StrokeIcon className="size-5" />
          <span className="text-sm font-medium">Stroke</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <Button render={<Link to="/app" />} nativeButton={false} size="sm">
              Dashboard
            </Button>
          ) : (
            <Button render={<Link to="/login" />} nativeButton={false} size="sm">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="max-w-xl">
          <h1 className="text-[2.6rem] leading-[1.12] font-semibold tracking-[-0.03em] sm:text-5xl">
            A fast, open source database client.
          </h1>

          <p className="mt-5 text-[15px] leading-[1.7] text-muted-foreground">
            Stroke connects to{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">
              PostgreSQL
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">
              MySQL
            </code>
            ,{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground">
              SQLite
            </code>
            , Turso/LibSQL, and Cloudflare D1. Browse schemas, edit data, write SQL, visualize, and
            let AI tools talk to your database through a built-in MCP server. Built in Rust.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <SmartDownloadButton size="default" />
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "default" })}
            >
              <SiGithub className="size-3.5" />
              GitHub
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            macOS, Windows &amp; Linux — free to download, pay what you want for a license.
          </p>
        </div>
      </div>
    </section>
  );
}

function Pillars() {
  return (
    <section id="why" className="border-b border-border/40">
      <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-border/40 md:grid-cols-3 md:divide-x md:divide-y-0">
        {[
          {
            num: "01",
            title: "Every database, one studio",
            body: "PostgreSQL, MySQL, SQLite, Turso/LibSQL, and Cloudflare D1 — connect once, pick up where you left off.",
          },
          {
            num: "02",
            title: "AI that talks to your data",
            body: "A built-in MCP server lets Claude, Cursor, and other clients query your database with one-click config.",
          },
          {
            num: "03",
            title: "Native speed, zero bloat",
            body: "Rust-based desktop client. Opens instantly. Stays responsive on tables of any size.",
          },
        ].map((p) => (
          <div key={p.num} className="flex flex-col gap-4 px-6 py-10 md:px-8">
            <span className="font-mono text-xs text-muted-foreground">{p.num}</span>
            <h3 className="text-base font-semibold tracking-tight">{p.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const DATABASES = [
  { name: "PostgreSQL", note: "Schema, enums, sequences, triggers", Icon: SiPostgresql },
  { name: "MySQL", note: "Standard host/port connections", Icon: SiMysql },
  { name: "SQLite", note: "Local file or in-memory", Icon: SiSqlite },
  { name: "Turso / LibSQL", note: "Serverless SQLite at the edge", Icon: DatabaseIcon },
  { name: "Cloudflare D1", note: "OAuth or API token", Icon: SiCloudflare },
];

function Databases() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Supported databases
        </p>
        <div className="mt-6 flex flex-wrap gap-x-0 gap-y-0 overflow-hidden rounded-lg border border-border/50">
          {DATABASES.map((db, i) => (
            <div
              key={db.name}
              className={cn(
                "flex min-w-[160px] flex-1 items-center gap-3 border-border/50 px-5 py-4",
                i < DATABASES.length - 1 ? "border-r" : "",
              )}
            >
              <db.Icon className="size-5 shrink-0 text-muted-foreground/60" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{db.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{db.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: TablePropertiesIcon,
    title: "Schema explorer",
    desc: "Tables, views, materialized views, foreign tables, indexes, and enums — all with live row counts.",
  },
  {
    icon: SearchIcon,
    title: "Powerful data grid",
    desc: "Paginated browsing, resizable columns, multi-column sort, full-text search, and a visual filter builder.",
  },
  {
    icon: PencilLineIcon,
    title: "Inline editing",
    desc: "Type-aware editors for text, numbers, booleans, enums, dates, UUIDs, and JSON.",
  },
  {
    icon: TerminalIcon,
    title: "SQL console",
    desc: "Monaco editor with schema-aware autocomplete, formatting, execution time, and CSV/JSON export.",
  },
  {
    icon: NetworkIcon,
    title: "Schema diagrams",
    desc: "Auto-generated ERDs of your tables and relationships with foreign-key navigation.",
  },
  {
    icon: LayoutDashboardIcon,
    title: "Charts & dashboards",
    desc: "Turn query results into charts and pin them to a dashboard you can revisit any time.",
  },
  {
    icon: BotIcon,
    title: "AI chat",
    desc: "An assistant with direct database access that runs queries, explains schemas, and generates SQL.",
  },
  {
    icon: PlugIcon,
    title: "Built-in MCP server",
    desc: "Expose your database to Claude, Cursor, and other MCP clients with one-click config.",
  },
  {
    icon: KeyboardIcon,
    title: "Command palette",
    desc: "Hit Cmd/Ctrl+K to jump anywhere — shortcuts for every core view.",
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Features
        </p>
        <h2 className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
          Everything you need. Nothing you don't.
        </h2>

        <div className="mt-10 grid grid-cols-1 divide-y divide-border/40 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className={cn(
                "flex flex-col gap-2 py-6 sm:py-0 sm:pb-8",
                i % 3 !== 2 ? "lg:border-r lg:border-border/40 lg:pr-8" : "",
                i % 2 !== 1 ? "sm:border-r sm:border-border/40 sm:pr-8 lg:border-r-0" : "",
                i % 3 === 2 ? "lg:border-r-0 lg:pl-8" : "",
                i % 3 === 1 ? "lg:px-8" : "",
                i >= 3 ? "sm:border-t sm:border-border/40 sm:pt-8" : "",
                i >= 6 ? "lg:border-t lg:border-border/40 lg:pt-8" : "",
              )}
            >
              <f.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <StrokeIcon className="size-4" />
          <span className="font-medium text-foreground">Stroke</span>
          <span>— a Rust-based database studio.</span>
        </span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 transition-colors hover:text-foreground"
        >
          <SiGithub className="size-3.5" />
          Open source
        </a>
      </div>
    </footer>
  );
}
