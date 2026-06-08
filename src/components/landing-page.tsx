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
  CheckIcon,
  DatabaseIcon,
  KeyboardIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  NetworkIcon,
  PencilLineIcon,
  PlugIcon,
  SearchIcon,
  SparklesIcon,
  TablePropertiesIcon,
  TerminalIcon,
} from "lucide-react";
import { useState } from "react";

import { SmartDownloadButton } from "#/components/download-button";
import { ThemeToggle } from "#/components/theme-toggle";
import { Button, buttonVariants } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { env } from "#/env/client";
import { useAuth } from "#/lib/auth/hooks";
import { cn } from "#/lib/utils";

const REPO_URL = "https://github.com/broisnischal/stroke";
const RELEASES_URL = "https://github.com/broisnischal/stroke/releases";
const MIN_PRICE_USD = 10;
const PRESET_AMOUNTS = [10, 25, 50, 100] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Databases />
        <Features />
        <Pricing />
      </main>
      <SiteFooter />
    </div>
  );
}

function StrokeLogo({ className }: { className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <DatabaseIcon className={className ?? "size-4"} />
      </span>
      <span className="text-lg font-semibold tracking-tight">Stroke</span>
    </span>
  );
}

function SiteHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="Stroke home">
          <StrokeLogo />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#databases" className="transition-colors hover:text-foreground">
            Databases
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
          >
            <SiGithub className="size-4" />
            <span className="sr-only">GitHub repository</span>
          </a>
          <ThemeToggle />
          {user ? (
            <Button render={<Link to="/app" />} nativeButton={false} size="lg">
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                render={<Link to="/login" />}
                nativeButton={false}
                variant="ghost"
                size="lg"
                className="hidden sm:inline-flex"
              >
                Log in
              </Button>
              <Button render={<Link to="/signup" />} nativeButton={false} size="lg">
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_85%),transparent)]" />
      <div className="mx-auto max-w-3xl px-4 pt-20 pb-16 text-center md:pt-28">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <SparklesIcon className="size-3.5 text-primary" />
          A Rust-based database studio — fast, agentic, intuitive
        </a>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
          A fast, modern <span className="text-primary">desktop database client</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Connect to PostgreSQL, MySQL, SQLite, Turso/LibSQL, and Cloudflare D1 — browse schemas,
          edit data inline, write SQL, visualize, and let AI tools talk to your database through a
          built-in MCP server.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start">
          <a href="#pricing" className={buttonVariants({ size: "lg" })}>
            <KeyRoundIcon className="size-4" />
            Get the license
          </a>
          <SmartDownloadButton size="lg" />
        </div>
      </div>
    </section>
  );
}

const DATABASES = [
  { name: "PostgreSQL", note: "Schema, enums, sequences, triggers", icon: SiPostgresql },
  { name: "MySQL", note: "Standard host/port connections", icon: SiMysql },
  { name: "SQLite", note: "Local file or in-memory", icon: SiSqlite },
  { name: "Turso / LibSQL", note: "Serverless SQLite at the edge", icon: DatabaseIcon },
  { name: "Cloudflare D1", note: "Connect via OAuth or API token", icon: SiCloudflare },
];

function Databases() {
  return (
    <section id="databases" className="border-y border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            One studio, every database
          </h2>
          <p className="mt-2 text-muted-foreground">
            Connect once and Stroke reopens your last connection on launch.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {DATABASES.map((db) => (
            <div
              key={db.name}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-6 text-center transition-colors hover:border-primary/50"
            >
              <db.icon className="size-8 text-primary" />
              <div>
                <p className="font-medium">{db.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{db.note}</p>
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
    desc: "Tables, views, materialized views, and foreign tables with live row counts and an index browser.",
  },
  {
    icon: SearchIcon,
    title: "Powerful data grid",
    desc: "Paginated browsing, resizable columns, multi-column sort, full-text search, and a visual filter builder.",
  },
  {
    icon: PencilLineIcon,
    title: "Inline editing",
    desc: "Type-aware editors for text, numbers, booleans, enums, dates, UUIDs, and JSON, with smart defaults.",
  },
  {
    icon: TerminalIcon,
    title: "SQL console",
    desc: "Monaco editor with schema-aware autocomplete, formatting, execution time, and CSV/JSON export.",
  },
  {
    icon: NetworkIcon,
    title: "Schema diagrams",
    desc: "Auto-generated ERDs of your tables and relationships, plus foreign-key navigation.",
  },
  {
    icon: LayoutDashboardIcon,
    title: "Charts & dashboards",
    desc: "Turn query results into charts and pin them to a dashboard you can revisit.",
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
    desc: "Hit Cmd/Ctrl+K to jump anywhere instantly, with shortcuts for every core view.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Everything you need to work with data
        </h2>
        <p className="mt-2 text-muted-foreground">
          From quick lookups to AI-assisted exploration — all in one native app.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <feature.icon className="size-5" />
            </div>
            <h3 className="mb-2 font-semibold">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const LICENSE_PERKS = [
  "Lifetime license, one-time payment",
  "All databases & AI features unlocked",
  "Built-in MCP server for Claude & Cursor",
  "Use on macOS, Windows, and Linux",
  "Free updates",
];

function Pricing() {
  const [amount, setAmount] = useState(MIN_PRICE_USD);
  const isValid = Number.isFinite(amount) && amount >= MIN_PRICE_USD;

  return (
    <section id="pricing" className="border-t border-border/60">
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pay what you want</h2>
          <p className="mt-2 text-muted-foreground">
            Minimum ${MIN_PRICE_USD} — pay more to support development. One license, every feature.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card ring-1 ring-border/50 transition-shadow focus-within:ring-ring/30">
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          <div className="space-y-8 p-6 sm:p-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Choose an amount</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={cn(
                        buttonVariants({
                          variant: amount === preset ? "default" : "outline",
                          size: "default",
                        }),
                        "min-w-[4.5rem]",
                      )}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom-amount"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Or enter a custom amount
                </label>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="custom-amount"
                    type="number"
                    min={MIN_PRICE_USD}
                    step={1}
                    value={amount}
                    onChange={(e) => {
                      const next = Number.parseFloat(e.target.value);
                      setAmount(Number.isFinite(next) ? next : 0);
                    }}
                    className="pl-7"
                    aria-invalid={!isValid}
                  />
                </div>
                {!isValid && (
                  <p className="mt-2 text-sm text-destructive">Minimum is ${MIN_PRICE_USD}</p>
                )}
              </div>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {LICENSE_PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3 text-sm">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t border-border/60 pt-6">
              <BuyLicenseButton
                amountUsd={amount}
                disabled={!isValid}
                size="lg"
                className="w-full"
              />
              <p className="text-center text-xs text-muted-foreground">
                Secure checkout via Dodo Payments. You&apos;ll need an account so we can deliver
                your license key.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuyLicenseButton({
  amountUsd,
  disabled,
  size,
  className,
}: {
  amountUsd: number;
  disabled?: boolean;
  size?: "lg" | "default";
  className?: string;
}) {
  const { user } = useAuth();

  const handleBuy = () => {
    const base = env.VITE_DODO_CHECKOUT_URL;
    if (!base) {
      // Checkout link not configured yet — send the user to releases as a safe fallback.
      window.open(RELEASES_URL, "_blank", "noopener,noreferrer");
      return;
    }

    const checkout = new URL(base);
    checkout.searchParams.set("quantity", "1");
    checkout.searchParams.set("paymentAmount", String(Math.round(amountUsd * 100)));
    // redirect to billing page so success=true polling kicks in
    checkout.searchParams.set("redirect_url", `${env.VITE_BASE_URL}/app/billing?success=true`);
    if (user?.email) {
      checkout.searchParams.set("email", user.email);
    }
    if (user?.name) {
      checkout.searchParams.set("fullName", user.name);
    }
    if (user?.id) {
      // Pass userId in metadata so the webhook can tie the payment to this account.
      // Dodo payment links support metadata[key]=value URL params.
      checkout.searchParams.set("metadata[userId]", user.id);
    }
    window.location.href = checkout.toString();
  };

  // Require an account before purchasing so we can tie the license key to the user.
  if (!user) {
    return (
      <Button render={<Link to="/signup" />} nativeButton={false} size={size} className={className}>
        <KeyRoundIcon className="size-4" />
        Get your license
      </Button>
    );
  }

  return (
    <Button onClick={handleBuy} size={size} className={className} disabled={disabled}>
      <KeyRoundIcon className="size-4" />
      Pay ${amountUsd}
    </Button>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 text-sm md:flex-row">
        <StrokeLogo />
        <p className="text-muted-foreground">a rust based database studio — faster, intuitive.</p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <SiGithub className="size-4" />
          GitHub
        </a>
      </div>
    </footer>
  );
}
