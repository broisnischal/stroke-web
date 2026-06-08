import "@tanstack/react-start/server-only";
import { createPrivateKey, sign as cryptoSign } from "node:crypto";

import { eq } from "drizzle-orm";

import { env } from "#/env/server";
import { db } from "#/lib/db";
import { licenses } from "#/lib/db/schema";

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

/** Get existing license for user, or issue one and store it. */
export async function getOrIssueLicense(userId: string, email: string) {
  const existing = await db.select().from(licenses).where(eq(licenses.userId, userId)).limit(1);

  if (existing.length > 0) return existing[0];

  const { key, expiresAt } = issueLicenseKey(email);
  const now = new Date();

  await db.insert(licenses).values({
    id: crypto.randomUUID(),
    userId,
    licenseKey: key,
    plan: "pro",
    maxDevices: 2,
    issuedAt: now,
    expiresAt,
  });

  const rows = await db.select().from(licenses).where(eq(licenses.userId, userId)).limit(1);
  return rows[0]!;
}

export async function getLicense(userId: string) {
  const rows = await db.select().from(licenses).where(eq(licenses.userId, userId)).limit(1);
  return rows[0] ?? null;
}
