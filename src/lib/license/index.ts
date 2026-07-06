import "@tanstack/react-start/server-only";
import { createPrivateKey, sign as cryptoSign } from "node:crypto";

import { eq } from "drizzle-orm";

import { env } from "#/env/server";
import { getCoveringDomain } from "#/lib/billing/enterprise";
import { db } from "#/lib/db";
import { licenses } from "#/lib/db/schema";

const DEFAULT_MAX_DEVICES = 2;

function fromHex(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

function toBase64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function buildPrivKey(hexStr: string) {
  const seed = fromHex(hexStr);
  if (seed.length !== 32) throw new Error("Private key must be 32 bytes");
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
  return { key: der, format: "der" as const, type: "pkcs8" as const };
}

const TEST_EXPIRY_DAYS = 7;

/**
 * Issue a new Ed25519-signed license key string.
 * In test_mode the key expires in 7 days; in live_mode it is lifetime (exp=0).
 */
export function issueLicenseKey(
  email: string,
  plan = "pro",
): { key: string; expiresAt: Date | null } {
  const iat = Math.floor(Date.now() / 1000);
  const isTest = env.DODO_ENVIRONMENT === "test_mode";
  const exp = isTest ? iat + TEST_EXPIRY_DAYS * 24 * 60 * 60 : 0;
  const message = `v1:${email}:${plan}:${iat}:${exp}`;
  const msgBuf = Buffer.from(message, "utf8");
  const privKey = createPrivateKey(buildPrivKey(env.LICENSE_PRIVATE_KEY_HEX));
  const sig = cryptoSign(null, msgBuf, privKey);
  const key = `${toBase64url(msgBuf)}.${toBase64url(sig)}`;
  const expiresAt = exp > 0 ? new Date(exp * 1000) : null;
  return { key, expiresAt };
}

interface IssueOptions {
  plan?: string;
  maxDevices?: number;
}

/** Get existing license for user, or issue one and store it. */
export async function getOrIssueLicense(userId: string, email: string, opts: IssueOptions = {}) {
  const plan = opts.plan ?? "pro";
  const maxDevices = opts.maxDevices ?? DEFAULT_MAX_DEVICES;

  const existing = await db.select().from(licenses).where(eq(licenses.userId, userId)).limit(1);

  if (existing.length > 0) {
    return upgradeToLifetimeIfTestKey(existing[0], email);
  }

  const { key, expiresAt } = issueLicenseKey(email, plan);
  const now = new Date();

  await db.insert(licenses).values({
    id: crypto.randomUUID(),
    userId,
    licenseKey: key,
    plan,
    maxDevices,
    issuedAt: now,
    expiresAt,
  });

  const rows = await db.select().from(licenses).where(eq(licenses.userId, userId)).limit(1);
  return rows[0]!;
}

/**
 * Resolve the license a user is entitled to, issuing one if needed.
 *
 * Members of a company covered by a Team purchase never pay directly and get
 * no webhook, so their per-member license is minted lazily the first time they
 * ask for it (e.g. on the billing page). The key carries their own email, so
 * the desktop app treats it like any other license.
 *
 * Returns null when the user neither owns a license nor is covered by a domain.
 */
export async function resolveLicense(userId: string, email: string) {
  const existing = await getLicense(userId, email);
  if (existing) return existing;

  const covering = await getCoveringDomain(email);
  if (!covering) return null;

  return getOrIssueLicense(userId, email, { plan: covering.plan });
}

type LicenseRow = typeof licenses.$inferSelect;

/**
 * A license issued during test_mode carries a 7-day expiry. Now that we're
 * in live_mode, replace it with a lifetime key on the next read. Devices
 * activated with the old key need to re-activate with the new one.
 */
async function upgradeToLifetimeIfTestKey(license: LicenseRow, email: string) {
  const needsUpgrade =
    license.expiresAt !== null && !license.revokedAt && env.DODO_ENVIRONMENT === "live_mode";
  if (!needsUpgrade) return license;

  const { key, expiresAt } = issueLicenseKey(email, license.plan);
  await db
    .update(licenses)
    .set({ licenseKey: key, expiresAt, issuedAt: new Date() })
    .where(eq(licenses.id, license.id));
  const refreshed = await db.select().from(licenses).where(eq(licenses.id, license.id)).limit(1);
  return refreshed[0]!;
}

/**
 * Get the user's license, or null. When email is provided, an expiring
 * test-mode key is transparently upgraded to a lifetime key.
 */
export async function getLicense(userId: string, email?: string) {
  const rows = await db.select().from(licenses).where(eq(licenses.userId, userId)).limit(1);
  const license = rows[0] ?? null;
  if (license && email) {
    return upgradeToLifetimeIfTestKey(license, email);
  }
  return license;
}
