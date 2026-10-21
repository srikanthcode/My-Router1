/**
 * Multi-level rate limiting (§44). In-memory sliding windows by default;
 * swap in Redis via REDIS_URL without changing call sites.
 * Always returns proper 429 semantics with Retry-After seconds.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so memory stays bounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.timestamps.length === 0 || now - b.timestamps[b.timestamps.length - 1] > 3_600_000) {
      buckets.delete(key);
    }
  }
}, 60_000).unref?.();

/**
 * Check a fixed-window-in-sliding-window limit.
 * @param key   e.g. "apikey:<id>:60" or "ip:<ip>:1"
 * @param limit max requests per window
 * @param windowSeconds window size in seconds
 */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  if (limit <= 0) return { allowed: false, remaining: 0, retryAfterSec: windowSeconds };
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const fullKey = `${key}:${windowSeconds}`;
  let bucket = buckets.get(fullKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(fullKey, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0]!;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterSec: 0 };
}

/** Peek without consuming — used to show quota state in dashboards. */
export function peekRateLimit(key: string, limit: number, windowSeconds: number): { used: number; remaining: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const bucket = buckets.get(`${key}:${windowSeconds}`);
  const used = bucket ? bucket.timestamps.filter((t) => now - t < windowMs).length : 0;
  return { used, remaining: Math.max(0, limit - used) };
}