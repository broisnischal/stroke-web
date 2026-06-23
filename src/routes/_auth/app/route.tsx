import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useMatchRoute, useRouter } from "@tanstack/react-router";
import { DownloadIcon, HelpCircleIcon, LayoutDashboardIcon, LogOutIcon } from "lucide-react";

import { StrokeIcon } from "#/components/stroke-icon";
import { ThemeToggle } from "#/components/theme-toggle";
import { authClient } from "#/lib/auth/auth-client";
import { useAuth } from "#/lib/auth/hooks";
import { authQueryOptions } from "#/lib/auth/queries";

export const Route = createFileRoute("/_auth/app")({
  component: AppLayout,
});

const NAV_ITEMS = [
  { to: "/app" as const, label: "Dashboard", icon: LayoutDashboardIcon, exact: true },
  { to: "/app/downloads" as const, label: "Downloads", icon: DownloadIcon, exact: false },
  { to: "/app/support" as const, label: "Support", icon: HelpCircleIcon, exact: false },
];

function NavLink({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: "/app" | "/app/downloads" | "/app/support";
  label: string;
  icon: React.ElementType;
  exact: boolean;
}) {
  const matchRoute = useMatchRoute();
  const isActive = exact ? !!matchRoute({ to, fuzzy: false }) : !!matchRoute({ to, fuzzy: true });

  return (
    <Link
      to={to}
      className={[
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-foreground/8 font-medium text-foreground"
          : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
      ].join(" ")}
    >
      <Icon className="size-3.5 shrink-0" />
      {label}
    </Link>
  );
}

function SidebarSignOut() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut({
          fetchOptions: {
            onResponse: async () => {
              queryClient.setQueryData(authQueryOptions().queryKey, null);
              await router.invalidate();
            },
          },
        });
      }}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
    >
      <LogOutIcon className="size-3.5 shrink-0" />
      Sign out
    </button>
  );
}

function AppLayout() {
  const { user } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex min-h-svh bg-background">
      {/* Sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-border/40 md:flex">
        <div className="flex h-11 items-center gap-2 border-b border-border/40 px-4">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <StrokeIcon className="size-4" />
            <span className="text-sm font-semibold tracking-tight">Stroke</span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="border-t border-border/40 p-2">
          <div className="mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-2">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-[10px] font-semibold text-muted-foreground uppercase ring-1 ring-border/60">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs leading-tight font-medium">{user?.name}</p>
              <p className="truncate text-[10px] leading-tight text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
          <SidebarSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border/40 px-5">
          <div className="flex items-center gap-2 md:hidden">
            <StrokeIcon className="size-4" />
            <span className="text-sm font-semibold">Stroke</span>
          </div>
          <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <Link to="/" className="transition-colors hover:text-foreground">
              stroke.click
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-foreground">app</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
