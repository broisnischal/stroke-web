export const SITE_URL = "https://stroke.click";
export const SITE_NAME = "Stroke";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;

interface SeoOptions {
  title: string;
  description: string;
  /** Route path used for the canonical URL and og:url, e.g. "/download" */
  path: string;
  image?: string;
}

/**
 * Standard head tags for a public page: title, description, canonical, and
 * Open Graph / Twitter cards. Spread the result into a route's head():
 *
 *   head: () => seo({ title, description, path: "/download" })
 */
export function seo({ title, description, path, image = DEFAULT_OG_IMAGE }: SeoOptions) {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Head tags for private or auth pages that should stay out of search results. */
export function noIndex() {
  return {
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  };
}
