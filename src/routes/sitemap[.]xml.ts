import { createFileRoute } from "@tanstack/react-router";

import { SITE_URL } from "#/lib/seo";

/** Public, indexable pages. Add new marketing pages here. */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/features", priority: "0.8", changefreq: "monthly" },
  { path: "/docs", priority: "0.8", changefreq: "monthly" },
  { path: "/docs/mcp", priority: "0.7", changefreq: "monthly" },
  { path: "/download", priority: "0.9", changefreq: "weekly" },
  { path: "/changelog", priority: "0.7", changefreq: "weekly" },
  { path: "/roadmap", priority: "0.7", changefreq: "monthly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const lastmod = new Date().toISOString().slice(0, 10);
        const urls = PAGES.map(
          (p) => `  <url>
    <loc>${SITE_URL}${p.path === "/" ? "" : p.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
        ).join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
