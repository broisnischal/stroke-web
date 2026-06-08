import "@tanstack/react-start/server-only";
import { createPrivateKey, createPublicKey, verify as cryptoVerify } from "node:crypto";

import { env } from "#/env/server";

function buildPrivKey(hexStr: string) {
  const seed = Buffer.from(hexStr, "hex");
  if (seed.length !== 32) throw new Error("Private key must be 32 bytes");
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]);
  return { key: der, format: "der" as const, type: "pkcs8" as const };
}

export function getPublicKeyHex(): string {
  const privKey = createPrivateKey(buildPrivKey(env.LICENSE_PRIVATE_KEY_HEX));
  const pubKey = createPublicKey(privKey);
  const jwk = pubKey.export({ format: "jwk" }) as { x: string };
  return Buffer.from(jwk.x, "base64url").toString("hex");
}

export type ParsedKey = {
  email: string;
  plan: string;
  iat: number;
  exp: number;
};

export type VerifyResult =
  | { valid: true; parsed: ParsedKey }
  | { valid: false; error: "malformed" | "bad_signature" | "expired" };

export function verifyLicenseKey(key: string): VerifyResult {
  const dotIdx = key.lastIndexOf(".");
  if (dotIdx === -1) return { valid: false, error: "malformed" };

  const msgB64 = key.slice(0, dotIdx);
  const sigB64 = key.slice(dotIdx + 1);

  let msgBuf: Buffer;
  let sigBuf: Buffer;
  try {
    msgBuf = Buffer.from(msgB64, "base64url");
    sigBuf = Buffer.from(sigB64, "base64url");
  } catch {
    return { valid: false, error: "malformed" };
  }

  const privKey = createPrivateKey(buildPrivKey(env.LICENSE_PRIVATE_KEY_HEX));
  const pubKey = createPublicKey(privKey);

  let ok: boolean;
  try {
    ok = cryptoVerify(null, msgBuf, pubKey, sigBuf);
  } catch {
    return { valid: false, error: "bad_signature" };
  }

  if (!ok) return { valid: false, error: "bad_signature" };

  const message = msgBuf.toString("utf8");
  const parts = message.split(":");
  if (parts.length !== 5 || parts[0] !== "v1") return { valid: false, error: "malformed" };

  const [, email, plan, iatStr, expStr] = parts as [string, string, string, string, string];
  const iat = parseInt(iatStr, 10);
  const exp = parseInt(expStr, 10);

  if (isNaN(iat) || isNaN(exp)) return { valid: false, error: "malformed" };

  const nowSec = Math.floor(Date.now() / 1000);
  if (exp > 0 && nowSec > exp) return { valid: false, error: "expired" };

  return { valid: true, parsed: { email, plan, iat, exp } };
}
