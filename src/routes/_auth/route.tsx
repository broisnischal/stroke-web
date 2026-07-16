import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import posthog from "posthog-js";
import { useEffect } from "react";

import { authQueryOptions } from "#/lib/auth/queries";
import { noIndex } from "#/lib/seo";

/**
 * This is the _auth layout, which enables 'protected routes'
 * for all child routes under _auth (e.g. _auth/app/*)
 *
 * The returned context from beforeLoad is also available to all child routes & loaders.
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context }) => {
    /**
     * beforeLoad runs on every navigation and prefetch, so we use TanStack Query
     * for client-side caching to speed up navigation, reducing client-to-server calls.
     *
     * Better Auth's cookieCache is also enabled in `/lib/auth/auth.ts`,
     * which can further reduce server-to-database calls.
     *
     * Both cache layers help for faster UX and page load/navigation.
     *
     * But this is NOT a server-side security guarantee.
     * Consider authMiddleware for data fetching operations & mutations
     * where auth is required, e.g. for API routes and server functions.
     * see `/lib/auth/middleware.ts`
     */
    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });
    if (!user) {
      throw redirect({ to: "/login" });
    }

    // return context for use in child routes & loaders
    return { user };
  },
  component: AuthLayout,
  head: noIndex,
});

function AuthLayout() {
  const { user } = Route.useRouteContext();

  useEffect(() => {
    if (!user) return;
    posthog.identify(user.id, { email: user.email, name: user.name });
  }, [user]);

  return <Outlet />;
}
