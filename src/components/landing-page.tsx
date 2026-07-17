import {
  SiClickhouse,
  SiCloudflare,
  SiCockroachlabs,
  SiDuckdb,
  SiGooglebigquery,
  SiMariadb,
  SiMysql,
  SiPostgresql,
  SiSqlite,
  SiTurso,
} from "@icons-pack/react-simple-icons";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BotIcon,
  CheckIcon,
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

import { AppWindow, VideoDemo } from "#/components/app-window";
import { SmartDownloadButton } from "#/components/download-button";
import { BrushStroke, SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import { useAuth } from "#/lib/auth/hooks";
import { approvedReviewsQueryOptions } from "#/lib/reviews/functions";
import { cn } from "#/lib/utils";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Demo />
        <Pillars />
        <Databases />
        <Features />
        <Reviews />
        <Pricing />
        <Faq />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-24">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
            <span className="inline-block h-px w-6 bg-copper" aria-hidden="true" />
            Native app · Built in Rust
          </p>

          <h1 className="mt-6 text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance min-[430px]:text-[2.6rem] sm:text-6xl">
            One studio for{" "}
            <span className="relative inline-block whitespace-nowrap">
              every database
              <BrushStroke
                animate
                className="absolute -bottom-2 left-0 h-2.5 w-full sm:-bottom-3"
              />
            </span>{" "}
            you run.
          </h1>

          <p className="mt-7 max-w-xl text-[15px] leading-[1.7] text-muted-foreground">
            Stroke is a fast desktop client for PostgreSQL, MySQL, SQLite, SQL Server, ClickHouse,
            DuckDB, and more. Browse schemas, edit data inline, write SQL, and let your AI tools
            query the database through the built-in MCP server. Native Rust, under 40 MB of memory.
          </p>

          <div className="mt-8 flex flex-wrap items-start gap-2.5">
            <SmartDownloadButton size="default" variant="default" />
            <a href="#pricing" className={buttonVariants({ variant: "ghost", size: "default" })}>
              $9.99 · Own it forever
            </a>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Runs on macOS, Windows, and Linux. Free to try, no account needed.
          </p>
        </div>

        <AppWindow className="mt-14 md:mt-20" />
      </div>
    </section>
  );
}

function Demo() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          See it in action
        </p>
        <h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
          A quick tour of Stroke
        </h2>
        <VideoDemo
          videoId="xmeVKZShJtQ"
          title="A quick tour of the Stroke database client"
          className="mt-10"
        />
      </div>
    </section>
  );
}

const PILLARS = [
  {
    title: "Under 40 MB of memory",
    body: "Stroke is native Rust, not another Electron app hauling a browser around. It stays under 40 MB of memory no matter how large your tables get, launches instantly, and never makes your fans spin.",
  },
  {
    title: "Works with Claude and Cursor",
    body: "Stroke ships an MCP server. Connect any MCP client with one click and it can inspect your schemas and run queries for you. An AI chat lives inside the app as well.",
  },
  {
    title: "Yours, not rented",
    body: "$9.99 buys the app outright. No subscription, no renewals, no locked features. Try everything free, pay when you decide to keep it.",
  },
];

function Pillars() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto grid max-w-4xl grid-cols-1 divide-y divide-border/40 md:grid-cols-3 md:divide-x md:divide-y-0">
        {PILLARS.map((p) => (
          <div key={p.title} className="flex flex-col gap-3 px-6 py-10 md:px-8">
            <BrushStroke className="h-1.5 w-10" />
            <h3 className="text-base font-semibold tracking-tight">{p.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const DATABASES = [
  { name: "PostgreSQL", Icon: SiPostgresql },
  { name: "MySQL", Icon: SiMysql },
  { name: "MariaDB", Icon: SiMariadb },
  { name: "SQLite", Icon: SiSqlite },
  { name: "DuckDB", Icon: SiDuckdb },
  { name: "SQL Server", Icon: DatabaseIcon },
  { name: "ClickHouse", Icon: SiClickhouse },
  { name: "CockroachDB", Icon: SiCockroachlabs },
  { name: "Turso / LibSQL", Icon: SiTurso },
  { name: "Cloudflare D1", Icon: SiCloudflare },
  { name: "BigQuery", Icon: SiGooglebigquery, soon: true },
] as const;

function Databases() {
  return (
    <section className="border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Supported databases
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Ten engines today, from a local SQLite file to ClickHouse. SQLite and DuckDB also run
          in-memory.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/50 bg-border/50 sm:grid-cols-3 lg:grid-cols-4">
          {DATABASES.map((db) => (
            <div
              key={db.name}
              className={cn(
                "flex items-center gap-2.5 bg-background px-4 py-3.5",
                "soon" in db && db.soon ? "opacity-60" : "",
              )}
            >
              <db.Icon className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="truncate text-sm font-medium">{db.name}</span>
              {"soon" in db && db.soon && (
                <span className="ml-auto font-mono text-[10px] tracking-wide text-copper uppercase">
                  soon
                </span>
              )}
            </div>
          ))}
          <Link
            to="/roadmap"
            className="flex items-center gap-2.5 bg-background px-4 py-3.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            More on the roadmap →
          </Link>
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: TablePropertiesIcon,
    title: "Schema explorer",
    desc: "Tables, views, materialized views, foreign tables, indexes, and enums, all with live row counts.",
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
    desc: "Hit Cmd/Ctrl+K to jump anywhere. Every core view has a shortcut.",
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Features
        </p>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
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

function initialsFrom(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Reviews() {
  const { data: reviews } = useQuery(approvedReviewsQueryOptions());

  // Nothing approved yet → don't render an empty section.
  if (!reviews || reviews.length === 0) return null;

  return (
    <section id="reviews" className="scroll-mt-16 border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Reviews</p>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          What people say about Stroke
        </h2>

        <div className="mt-10 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="mb-4 flex break-inside-avoid flex-col gap-4 rounded-lg border border-border/50 bg-muted/20 p-5"
            >
              <blockquote className="text-sm leading-relaxed text-foreground/90">
                “{r.body}”
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-[10px] font-semibold text-muted-foreground uppercase ring-1 ring-border/60">
                  {initialsFrom(r.authorName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">{r.authorName}</span>
                  {r.title ? (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {r.title}
                    </span>
                  ) : null}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const LICENSE_PERKS = [
  "The app is yours forever, nothing to cancel",
  "A license key for up to 2 of your devices",
  "Every future update included",
  "Priority answers on support and feature requests",
];

function Pricing() {
  const { user } = useAuth();

  return (
    <section id="pricing" className="scroll-mt-16 border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Pricing</p>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          Pay once. Own it forever.
        </h2>
        <div className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Most database clients now charge $100 or more a year, every year. I think a tool you use
            every day should be one you own, so Stroke costs{" "}
            <strong className="font-medium text-foreground">$9.99, once</strong>. That is the lowest
            price I can offer and still keep development going.
          </p>
          <p>
            There are no renewals, no upsells, and nothing to cancel. You buy Stroke and it is yours
            on every platform, with every update included. Take your time deciding: the full app is
            free to try.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-lg border border-border/50 md:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col gap-5 border-b border-border/50 p-7 md:border-r md:border-b-0 md:p-9">
            <div>
              <h3 className="text-sm font-semibold">Try Stroke</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">Take your time deciding.</p>
            </div>
            <p className="text-4xl font-semibold tracking-tight">$0</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {[
                "Every feature unlocked while you evaluate",
                "All ten engines, from Postgres to DuckDB",
                "macOS, Windows & Linux",
                "No account or sign-in required",
              ].map((perk) => (
                <li key={perk} className="flex items-start gap-2.5">
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} />
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <SmartDownloadButton size="default" />
            </div>
          </div>

          {/* License */}
          <div className="flex flex-col gap-5 bg-muted/30 p-7 md:p-9">
            <div>
              <h3 className="text-sm font-semibold">Own Stroke</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">One payment. Yours for good.</p>
            </div>
            <p className="text-4xl font-semibold tracking-tight text-copper">
              $9.99 <span className="text-base font-normal text-muted-foreground">once</span>
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {LICENSE_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5">
                  <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-copper" strokeWidth={2} />
                  {perk}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">
              <Link
                to={user ? "/app/billing" : "/login"}
                className={buttonVariants({ variant: "default", size: "default" })}
              >
                Buy Stroke for $9.99
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                One-time payment. No recurring charges.
              </p>
            </div>
          </div>
        </div>

        {/* Team / Enterprise */}
        <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-lg border border-border/50 p-6 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold">Running a team?</h3>
            <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
              One <strong className="font-medium text-foreground">$99</strong> purchase licenses
              everyone on your company&apos;s email domain. Each teammate gets their own key, with
              no seats to manage and no per-user fees.
            </p>
          </div>
          <Link
            to={user ? "/app/billing" : "/login"}
            className={buttonVariants({ variant: "outline", size: "default" })}
          >
            Buy Team for $99
          </Link>
        </div>
      </div>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "How much does Stroke cost?",
    a: "$9.99, one time. There is no subscription, no yearly renewal, and no paid upgrade later. You can try the full app for free before you buy.",
  },
  {
    q: "Why so cheap?",
    a: "Most database clients rent themselves to you for $100 or more a year. I want owning Stroke to be an easy decision, so the price stays low enough that you never have to think twice about it. If Stroke saves you one afternoon, it has paid for itself.",
  },
  {
    q: "Does Stroke see my database credentials or data?",
    a: "No. Stroke connects to your databases directly from your machine, and connection credentials are stored locally on your device. Query results never pass through our servers. See the Privacy Policy for the full picture.",
  },
  {
    q: "Can I move my license to a new machine?",
    a: "Yes. Your license covers 2 devices at once, and you can deactivate an old device from your dashboard whenever you switch machines. Refunds are covered in the Terms of Service.",
  },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-b border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-14">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">FAQ</p>
        <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q}>
              <h3 className="text-sm font-semibold">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          The fine print lives in the{" "}
          <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section>
      <div className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 py-16 md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          Try Stroke on your own database.
        </h2>
        <p className="-mt-2 text-sm text-muted-foreground">
          Free to download. $9.99 whenever you decide to keep it.
        </p>
        <SmartDownloadButton size="default" />
      </div>
    </section>
  );
}
