import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "#/components/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stroke — A fast, modern desktop database client" },
      {
        name: "description",
        content:
          "Connect to PostgreSQL, MySQL, SQLite, Turso/LibSQL, and Cloudflare D1. Browse schemas, edit data inline, write SQL, visualize, and let AI talk to your database via MCP.",
      },
    ],
  }),
  component: LandingPage,
});
