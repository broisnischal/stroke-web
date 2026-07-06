import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "#/components/landing-page";
import { seo, SITE_URL } from "#/lib/seo";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Stroke",
  operatingSystem: "macOS, Windows, Linux",
  applicationCategory: "DeveloperApplication",
  description:
    "A fast, native desktop database client for PostgreSQL, MySQL, SQLite, SQL Server, ClickHouse, DuckDB, and more, with a built-in MCP server for AI tools.",
  url: SITE_URL,
  downloadUrl: `${SITE_URL}/download`,
  offers: {
    "@type": "Offer",
    price: "9.99",
    priceCurrency: "USD",
  },
};

export const Route = createFileRoute("/")({
  head: () => ({
    ...seo({
      title: "Stroke — One studio for every database you run",
      description:
        "A fast database GUI for PostgreSQL, MySQL, SQLite, SQL Server, ClickHouse, DuckDB, and more. Browse schemas, edit data, write SQL, and let AI query your database via MCP. Free to try, $9.99 to own it forever.",
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
