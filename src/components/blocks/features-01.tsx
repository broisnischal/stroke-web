import { DatabaseIcon, PlugIcon, ZapIcon } from "lucide-react";

const features = [
  {
    icon: DatabaseIcon,
    title: "Every database, one studio",
    description:
      "PostgreSQL, MySQL, SQLite, Turso/LibSQL, and Cloudflare D1 — connect once and pick up where you left off.",
  },
  {
    icon: PlugIcon,
    title: "AI that talks to your data",
    description:
      "A built-in MCP server lets Claude, Cursor, and other clients query your database with one-click config.",
  },
  {
    icon: ZapIcon,
    title: "Native speed, zero bloat",
    description:
      "A Rust-based desktop client that opens instantly and stays responsive on tables of any size.",
  },
];

export default function Features01() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <div className="mb-14 max-w-xl">
          <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
            Why Stroke
          </span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything your data needs, nothing it doesn&apos;t.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-4">
              <div className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10">
                <Icon className="size-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
