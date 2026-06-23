import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpenIcon,
  BugIcon,
  ExternalLinkIcon,
  MailIcon,
  MessageCircleIcon,
  ZapIcon,
} from "lucide-react";

export const Route = createFileRoute("/_auth/app/support")({
  component: SupportPage,
});

const GITHUB_URL = "https://github.com/broisnischal/stroke";
const DISCORD_URL = "https://discord.gg/stroke";
const EMAIL = "support@stroke.click";
const DOCS_URL = "https://stroke.click/docs";

const FAQ: { q: string; a: string }[] = [
  {
    q: "How do I activate my license?",
    a: "Open Stroke → Settings → License, paste your key, and click Activate. The key is tied to your email so it works across up to 5 devices.",
  },
  {
    q: "Can I use Stroke on multiple machines?",
    a: "Yes. Pro licenses support up to 5 simultaneous activations. Deactivate a device in Settings → License → Manage Activations.",
  },
  {
    q: "What databases does Stroke support?",
    a: "PostgreSQL, MySQL, SQLite, MongoDB, and Redis are fully supported. CockroachDB, PlanetScale, and Turso work via their respective Postgres-compatible drivers.",
  },
  {
    q: "How does the MCP server work?",
    a: "Stroke runs a local MCP server on port 51025 (configurable). Claude, Cursor, and any MCP-compatible AI tool can connect to it to query your database directly.",
  },
  {
    q: "I paid but didn't receive a license key.",
    a: "Go to Dashboard — your key is generated as soon as the payment clears (usually within seconds). If it's still missing after 5 minutes, use the Refresh button on the billing confirmation page or email us.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes. If Stroke doesn't work as described on your platform within 14 days of purchase, we'll issue a full refund — no questions asked.",
  },
];

function SupportPage() {
  return (
    <div className="mx-auto max-w-xl space-y-9">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Support</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Find help, report bugs, or get in touch.
        </p>
      </div>

      {/* Contact channels */}
      <section className="space-y-2.5">
        <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
          Get help
        </p>
        <div className="overflow-hidden rounded-md border border-border/40">
          {[
            {
              icon: BugIcon,
              label: "GitHub Issues",
              description: "Bug reports and feature requests",
              href: `${GITHUB_URL}/issues`,
              cta: "Open issue",
            },
            {
              icon: MessageCircleIcon,
              label: "Discord",
              description: "Community chat and quick answers",
              href: DISCORD_URL,
              cta: "Join",
            },
            {
              icon: MailIcon,
              label: "Email",
              description: "License issues, billing, and private matters",
              href: `mailto:${EMAIL}`,
              cta: EMAIL,
            },
            {
              icon: BookOpenIcon,
              label: "Docs",
              description: "Setup guides, API reference, MCP configuration",
              href: DOCS_URL,
              cta: "Read docs",
            },
          ].map(({ icon: Icon, label, description, href, cta }, i, arr) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className={[
                "flex items-center justify-between px-4 py-3 transition-colors hover:bg-foreground/[0.025]",
                i < arr.length - 1 ? "border-b border-border/30" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                {cta}
                <ExternalLinkIcon className="size-3" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="space-y-2.5">
        <p className="font-mono text-[9px] font-medium tracking-widest text-muted-foreground/60 uppercase">
          FAQ
        </p>
        <div className="overflow-hidden rounded-md border border-border/40">
          {FAQ.map(({ q, a }, i) => (
            <details
              key={i}
              className={[
                "group px-4 py-3",
                i < FAQ.length - 1 ? "border-b border-border/30" : "",
              ].join(" ")}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                {q}
                <span className="shrink-0 font-mono text-xs text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* MCP hint */}
      <section className="flex items-start gap-3 rounded-md border border-border/30 bg-foreground/[0.02] px-4 py-3">
        <ZapIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Using Stroke with AI assistants?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            The built-in MCP server lets Claude, Cursor, and other AI tools query your databases
            directly. See{" "}
            <a
              href={`${DOCS_URL}/mcp`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              the MCP setup guide
            </a>{" "}
            to configure it.
          </p>
        </div>
      </section>
    </div>
  );
}
