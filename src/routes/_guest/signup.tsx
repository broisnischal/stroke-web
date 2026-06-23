import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_guest/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
  component: () => null,
});
