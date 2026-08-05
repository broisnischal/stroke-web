import { cn } from "#/lib/utils";

/**
 * The Stroke desktop app in the hero, a real screenshot inside a framed
 * card with a warm ambient glow.
 */
export function AppWindow({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      {/* Warm ambient glow behind the window */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-6 -top-10 -bottom-8 -z-10 bg-[radial-gradient(60%_70%_at_50%_20%,--alpha(var(--color-copper)/14%),transparent_70%)]"
      />

      {/* Premium hairline frame: gradient edge, brighter along the top */}
      <div className="rounded-xl bg-linear-to-b from-foreground/20 via-border/70 to-border/40 p-px dark:from-foreground/25">
        <div className="overflow-hidden rounded-[calc(var(--radius)*1.4-1px)]">
          <img
            src="/app-screenshot.png"
            width={2208}
            height={1371}
            loading="eager"
            alt="The Stroke app connected to a Postgres database, showing a table sidebar with row counts, bulk table actions, and quick access to SQL, dashboards, AI, schema, diagrams, and the MCP server"
            className="block w-full"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * A YouTube demo of the Stroke app, framed to match {@link AppWindow}, the
 * same warm glow and hairline frame, wrapping a 16:9 embed.
 */
export function VideoDemo({
  videoId,
  title,
  className,
}: {
  videoId: string;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {/* Warm ambient glow behind the window */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-6 -top-10 -bottom-8 -z-10 bg-[radial-gradient(60%_70%_at_50%_20%,--alpha(var(--color-copper)/14%),transparent_70%)]"
      />

      {/* Premium hairline frame: gradient edge, brighter along the top */}
      <div className="rounded-xl bg-linear-to-b from-foreground/20 via-border/70 to-border/40 p-px dark:from-foreground/25">
        <div className="aspect-video overflow-hidden rounded-[calc(var(--radius)*1.4-1px)] bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="block h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
