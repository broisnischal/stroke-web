import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, BotIcon, DatabaseIcon, DownloadIcon, KeyRoundIcon } from "lucide-react";

import { SmartDownloadButton } from "#/components/download-button";
import { BrushStroke, REPO_URL, SiteFooter, SiteHeader } from "#/components/site-chrome";
import { buttonVariants } from "#/components/ui/button";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/docs/")({
  head: () =>
    seo({
      title: "Getting started · Stroke docs",
      description:
        "Install Stroke, activate your license, connect your first database, and let your AI agents query it through the built-in MCP server.",
      path: "/docs",
    }),
  component: DocsPage,
});

interface Step {
  icon: React.ElementType;
  title: string;
  body: React.ReactNode;
}

const STEPS: Step[] = [
  {
    icon: DownloadIcon,
    title: "Download and install",
    body: (
      <>
        <p>
          Stroke runs natively on macOS, Windows, and Linux. Grab the build for your platform and
          open it. The full app is free to try, with no account required.
        </p>
        <div className="mt-3">
          <SmartDownloadButton size="sm" />
        </div>
      </>
    ),
  },
  {
    icon: DatabaseIcon,
    title: "Connect your first database",
    body: (
      <p>
        Hit <strong>New connection</strong>, pick an engine, and paste a connection string or fill
        in the host, port, and credentials. Everything connects directly from your machine. Your
        credentials, queries, and results never touch our servers.
      </p>
    ),
  },
  {
    icon: KeyRoundIcon,
    title: "Activate your license",
    body: (
      <>
        <p>
          When you decide to keep Stroke, buy a license and paste the key into{" "}
          <strong>Settings → License</strong>. One purchase covers two devices, with every future
          update included.
        </p>
        <div className="mt-3">
          <Link to="/app/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Get your license key
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </>
    ),
  },
  {
    icon: BotIcon,
    title: "Let your agents in",
    body: (
      <>
        <p>
          Stroke ships an MCP server, so Claude, Cursor, and other agents can read your schema and
          run queries in one click. The same schema-aware AI chat lives inside the app.
        </p>
        <div className="mt-3">
          <Link to="/docs/mcp" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Set up MCP for agents
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      </>
    ),
  },
];

function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-6 py-16 md:py-20">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Docs</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Getting started</h1>
        <BrushStroke className="mt-4 h-2 w-20" />
        <p className="mt-6 text-[15px] leading-[1.75] text-pretty text-muted-foreground">
          Four steps from download to a database your agents can query. It takes about a minute.
        </p>

        <ol className="mt-12 space-y-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-5">
              <div className="flex shrink-0 flex-col items-center">
                <span className="flex size-9 items-center justify-center rounded-full border border-border/60 font-mono text-sm text-copper">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && <span className="mt-2 w-px flex-1 bg-border/50" />}
              </div>
              <div className="pb-2">
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
                  <step.icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
                  {step.title}
                </h2>
                <div className="mt-2 text-sm leading-[1.75] text-pretty text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
                  {step.body}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-lg border border-border/50 p-5">
          <h2 className="text-sm font-semibold">Keep exploring</h2>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link to="/features" className="transition-colors hover:text-foreground">
              All features →
            </Link>
            <Link to="/docs/mcp" className="transition-colors hover:text-foreground">
              MCP for agents →
            </Link>
            <Link to="/roadmap" className="transition-colors hover:text-foreground">
              Roadmap →
            </Link>
            <Link to="/changelog" className="transition-colors hover:text-foreground">
              Changelog →
            </Link>
            <a
              href={`${REPO_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Report an issue →
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
