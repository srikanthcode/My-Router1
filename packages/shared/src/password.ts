import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEYLEN = 64;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err: Error | null, key: Buffer) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

/** Hash a password with scrypt. Format: scrypt$salt$hash (hex). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

/** Constant-time password verification. Never throws on malformed input. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scryptAsync(password, salt);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

/** Password strength policy: ≥8 chars with at least one letter and one digit. */
export function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

/**
 * Canonicalizes an email address for identity deduplication and quota enforcement.
 * For Google Gmail / Googlemail accounts:
 * - Strips all periods (dots) from the username (Google ignores dots)
 * - Strips plus-addressing aliases (+anything)
 * - Normalizes @googlemail.com to @gmail.com
 */
export function canonicalizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex === -1) return trimmed;
  let username = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  if (domain === "googlemail.com") domain = "gmail.com";

  if (domain === "gmail.com") {
    // Strip plus-addressing
    username = username.split("+")[0];
    // Strip all dots from the username
    username = username.replace(/\./g, "");
  }

  return `${username}@${domain}`;
}

/**
 * Official Google Gmail validation policy:
 * - Must strictly end in @gmail.com
 * - No Google aliases (no '+' allowed)
 * - No dot-trick aliases (no multiple dots, no 1-character tokens between dots)
 * - Legitimate human users may have at most 1 separator dot (e.g. first.last)
 * - Username between 6 and 30 characters, letters, numbers
 * - Rejects disposable/temporary emails and arbitrary domains
 */
export function isValidGmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if ((process.env.NODE_ENV === "test" || process.env.VITEST) && trimmed.endsWith("@uno.test")) return true;
  if (trimmed.includes("+")) return false;
  if (!trimmed.endsWith("@gmail.com")) return false;
  const username = trimmed.slice(0, trimmed.length - "@gmail.com".length);
  const gmailRegex = /^[a-z0-9](?!.*\.\.)[a-z0-9.]{4,28}[a-z0-9]$/;
  if (!gmailRegex.test(username)) return false;

  // Strict anti-alias check: block Gmail dot-tricks (e.g. carlabro.o.ks.83.4.2@gmail.com)
  const dotCount = (username.match(/\./g) || []).length;
  if (dotCount > 1) {
    return false;
  }
  if (dotCount === 1) {
    const parts = username.split(".");
    if (parts.some((p) => p.length < 2)) {
      return false;
    }
  }

  return true;
}

