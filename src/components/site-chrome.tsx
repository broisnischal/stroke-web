import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { StrokeIcon } from "#/components/stroke-icon";
import { ThemeToggle } from "#/components/theme-toggle";
import { Button } from "#/components/ui/button";
import { useAuth } from "#/lib/auth/hooks";
import { changelogQueryOptions } from "#/lib/changelog";
import { cn } from "#/lib/utils";

export const REPO_URL = "https://github.com/broisnischal/stroke";

/**
 * The signature motif: a hand-drawn brush stroke, used under the hero
 * headline and echoed at smaller sizes across the site.
 */
export function BrushStroke({
  className,
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 12"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={cn("text-copper", className)}
    >
      <path
        d="M4 8.5C42 3.5 96 2.5 133 4.5c30 1.6 55 3 83 2"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        pathLength="1"
        className={animate ? "stroke-draw" : undefined}
      />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Changelog", href: "/changelog" },
  { label: "Download", href: "/download" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Warm the changelog cache on hover/focus so the page opens instantly.
  const prefetchChangelog = () => {
    void queryClient.prefetchQuery(changelogQueryOptions());
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-13 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" aria-label="Stroke home" className="flex items-center gap-2">
            <StrokeIcon className="size-5" />
            <span className="text-sm font-semibold tracking-tight">Stroke</span>
          </Link>

          <nav className="hidden items-center gap-5 sm:flex" aria-label="Main">
            {NAV_LINKS.map((link) => {
              const prefetch = link.href === "/changelog" ? prefetchChangelog : undefined;
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onMouseEnter={prefetch}
                  onFocus={prefetch}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

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

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col justify-between gap-10 sm:flex-row">
          <div className="max-w-xs">
            <span className="flex items-center gap-2">
              <StrokeIcon className="size-5" />
              <span className="text-sm font-semibold tracking-tight">Stroke</span>
            </span>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              A fast, native database studio for PostgreSQL, MySQL, ClickHouse, DuckDB, and more.
              Built in Rust and Tauri, for agents and humans.
            </p>
            <BrushStroke className="mt-4 h-1.5 w-16" />
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div>
              <p className="text-xs font-medium tracking-wide text-foreground">Product</p>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                <li>
                  <a href="/#pricing" className="transition-colors hover:text-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to="/download" className="transition-colors hover:text-foreground">
                    Download
                  </Link>
                </li>
                <li>
                  <Link to="/roadmap" className="transition-colors hover:text-foreground">
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link to="/changelog" className="transition-colors hover:text-foreground">
                    Changelog
                  </Link>
                </li>
                <li>
                  <a
                    href={`${REPO_URL}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    Report an issue
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-foreground">Legal</p>
              <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
                <li>
                  <Link to="/terms" className="transition-colors hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="transition-colors hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-5 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Stroke</span>
          <span className="font-mono text-[11px]">stroke.click</span>
        </div>
      </div>
    </footer>
  );
}
