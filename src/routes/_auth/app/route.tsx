import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useMatchRoute, useRouter } from "@tanstack/react-router";
import { DatabaseIcon, HomeIcon, KeyRoundIcon, LogOutIcon } from "lucide-react";

import { ThemeToggle } from "#/components/theme-toggle";
import { authClient } from "#/lib/auth/auth-client";
import { useAuth } from "#/lib/auth/hooks";
import { authQueryOptions } from "#/lib/auth/queries";

export const Route = createFileRoute("/_auth/app")({
  component: AppLayout,
});

const NAV_ITEMS = [
  { to: "/app" as const, label: "Overview", icon: HomeIcon, exact: true },
  { to: "/app/billing" as const, label: "License & Billing", icon: KeyRoundIcon, exact: false },
];

function NavLink({
  to,
  label,
  icon: Icon,
  exact,
}: {
  to: "/app" | "/app/billing";
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
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      ].join(" ")}
    >
      <Icon className="size-4 shrink-0" />
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
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <LogOutIcon className="size-3.5 shrink-0" />
      Sign out
    </button>
  );
}

function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-svh bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border/60 md:flex md:flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border/60 px-4">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <DatabaseIcon className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Stroke</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-border/60 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
              {user?.name?.[0] ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <SidebarSignOut />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/60 px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <DatabaseIcon className="size-4" />
            </span>
            <span className="text-sm font-semibold">Stroke</span>
          </div>
          <div className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span className="mx-1">/</span>
            <span className="text-foreground">App</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
