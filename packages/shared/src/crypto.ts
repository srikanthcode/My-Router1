import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { env } from "./env.js";

/** SHA-256 hash for API keys and session tokens (raw values are never stored). */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Generate a new API key: pro_sk_live_<24 bytes base64url>. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString("base64url");
  const key = `pro_sk_live_${raw}`;
  const prefix = key.slice(0, 16);
  return { key, prefix, hash: hashToken(key) };
}

/** Generate an opaque session token; only its hash is persisted. */
export function generateSessionToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

function getKey(): Buffer {
  const material = env.encryptionKey || env.authSecret;
  if (!env.encryptionKey && env.isProd) {
    throw new Error("ENCRYPTION_KEY must be set in production");
  }
  // Derive a stable 32-byte key from the configured secret.
  return createHash("sha256").update(material).digest();
}

/**
 * Encrypt provider credentials at rest with AES-256-GCM (§42).
 * Returns base64 ciphertext/iv/authTag.
 */
export function encryptSecret(plain: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(ciphertext: string, iv: string, authTag: string): string {
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}

/** URL-safe random code, e.g. A7K9X2. */
export function randomCode(length = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}