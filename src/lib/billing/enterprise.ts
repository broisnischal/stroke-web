import "@tanstack/react-start/server-only";
import { and, eq, like, sql } from "drizzle-orm";

import { db } from "#/lib/db";
import { enterpriseDomains, licenses, user } from "#/lib/db/schema";

export { STROKE_TEAM_SLUG, TEAM_PLAN, TEAM_PRICE_USD } from "./plans";

/**
 * Free/consumer email providers. The Team plan grants a license to everyone on
 * a domain, so it must never be sold for one of these; otherwise a single $99
 * purchase would cover every gmail.com (etc.) account. Checkout is rejected
 * when the buyer's email domain is in this set.
 */
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "hey.com",
  "duck.com",
  "example.com",
  "test.com",
]);

/**
 * Extract the lowercased domain from an email address, or null if it doesn't
 * look like an address with a domain part.
 */
export function domainFromEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  const domain = email
    .slice(at + 1)
    .trim()
    .toLowerCase();
  return domain.includes(".") ? domain : null;
}

/** True when a domain is a consumer email provider and can't back a Team plan. */
export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/** The active enterprise domain covering this email, or null. */
export async function getCoveringDomain(email: string) {
  const domain = domainFromEmail(email);
  if (!domain || isPublicEmailDomain(domain)) return null;

  const rows = await db
    .select()
    .from(enterpriseDomains)
    .where(and(eq(enterpriseDomains.domain, domain), eq(enterpriseDomains.status, "active")))
    .limit(1);
  return rows[0] ?? null;
}

/** The enterprise domain row for a domain regardless of status, or null. */
export async function getEnterpriseDomain(domain: string) {
  const rows = await db
    .select()
    .from(enterpriseDomains)
    .where(eq(enterpriseDomains.domain, domain.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

/** The enterprise domain owned by this user (the buyer), or null. */
export async function getOwnedEnterpriseDomain(userId: string) {
  const rows = await db
    .select()
    .from(enterpriseDomains)
    .where(eq(enterpriseDomains.ownerUserId, userId))
    .limit(1);
  return rows[0] ?? null;
}

/** How many users on a domain have been issued a license (owner included). */
export async function countCoveredMembers(domain: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`count(*)` })
    .from(licenses)
    .innerJoin(user, eq(licenses.userId, user.id))
    .where(like(user.email, `%@${domain.toLowerCase()}`));
  return Number(rows[0]?.total ?? 0);
}
