import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "#/components/landing-page";
import { approvedReviewsQueryOptions } from "#/lib/reviews/functions";
import { seo, SITE_URL } from "#/lib/seo";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Stroke",
  operatingSystem: "macOS, Windows, Linux",
  applicationCategory: "DeveloperApplication",
  description:
    "A modern, minimal desktop database client for PostgreSQL, MySQL, SQLite, SQL Server, ClickHouse, DuckDB, and more. Built in Rust and Tauri, with a built-in MCP server so AI agents can query your database.",
  url: SITE_URL,
  downloadUrl: `${SITE_URL}/download`,
  offers: {
    "@type": "Offer",
    price: "9.99",
    priceCurrency: "USD",
  },
};

export const Route = createFileRoute("/")({
  // Await so approved reviews are in the SSR HTML (SEO + no layout shift),
  // not just the client-hydrated cache.
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(approvedReviewsQueryOptions());
  },
  head: () => ({
    ...seo({
      title: "Stroke · The database studio for agents and humans",
      description:
        "A modern, minimal database client for PostgreSQL, MySQL, SQLite, SQL Server, ClickHouse, DuckDB, and more. Browse schemas, edit data, and write SQL, while your AI agents query the same database through the built-in MCP server. Built in Rust and Tauri. Free to try, $9.99 to own it forever.",
      path: "/",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(STRUCTURED_DATA),
      },
    ],
  }),
  component: LandingPage,
});
