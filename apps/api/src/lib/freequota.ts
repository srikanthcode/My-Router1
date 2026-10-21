import { and, eq, sql } from "drizzle-orm";
import { freeUsage, getDb } from "@uno/database";

export interface QuotaLimits {
  perMinute: number;
  perHour: number;
  perDay: number;
}

export interface QuotaResult {
  allowed: boolean;
  window: "minute" | "hour" | "day" | null;
  used: number;
  limit: number;
  retryAfterSec: number;
}

function bucketKeys(userId: string, now = Date.now()) {
  const minute = Math.floor(now / 60_000);
  const hour = Math.floor(now / 3_600_000);
  const day = Math.floor(now / 86_400_000);
  return [
    { window: "minute" as const, key: `m:${userId}:${minute}` },
    { window: "hour" as const, key: `h:${userId}:${hour}` },
    { window: "day" as const, key: `d:${userId}:${day}` },
  ];
}

class QuotaExceeded extends Error {
  constructor(readonly window: "minute" | "hour" | "day", readonly used: number, readonly limit: number) {
    super(`Free ${window} quota exceeded (${limit})`);
  }
}

/**
 * Atomically consume one unit of free quota across minute/hour/day windows.
 * Uses INSERT … ON CONFLICT DO UPDATE … RETURNING so concurrent requests
 * (multiple tabs/processes) cannot bypass limits (§51).
 */
export async function consumeFreeQuota(userId: string, limits: QuotaLimits): Promise<QuotaResult> {
  const db = await getDb();
  const buckets = bucketKeys(userId);
  const limitsByWindow = { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay };
  const consumed: Array<{ window: string; key: string }> = [];

  try {
    for (const b of buckets) {
      const limit = limitsByWindow[b.window];
      const insertSql = sql`INSERT INTO free_usage (user_id, bucket_key, count, updated_at) VALUES (${userId}, ${b.key}, 1, now()) ON CONFLICT (user_id, bucket_key) DO UPDATE SET count = free_usage.count + 1, updated_at = now() RETURNING count`;
      const rows = await db.execute(insertSql);
      const count = Number((rows.rows?.[0] as { count?: number } | undefined)?.count ?? 1);
      consumed.push(b);
      if (count > limit) throw new QuotaExceeded(b.window, count - 1, limit);
    }
  } catch (err) {
    for (const c of consumed) {
      await db.execute(sql`UPDATE free_usage SET count = GREATEST(count - 1, 0) WHERE user_id = ${userId} AND bucket_key = ${c.key}`);
    }
    if (err instanceof QuotaExceeded) {
      const retryAfter = err.window === "minute" ? 60 : err.window === "hour" ? 3600 : 86400;
      return { allowed: false, window: err.window, used: err.used, limit: err.limit, retryAfterSec: retryAfter };
    }
    throw err;
  }
  return { allowed: true, window: null, used: 0, limit: limits.perMinute, retryAfterSec: 0 };
}

/** Current usage without consuming — for dashboard/queue status displays. */
export async function peekFreeQuota(userId: string, limits: QuotaLimits): Promise<{ minute: number; hour: number; day: number; limits: QuotaLimits }> {
  const db = await getDb();
  const keys = bucketKeys(userId);
  const rows = await db.select().from(freeUsage).where(eq(freeUsage.userId, userId));
  const byKey = new Map(rows.map((r) => [r.bucketKey, r.count]));
  return {
    minute: byKey.get(keys[0].key) ?? 0,
    hour: byKey.get(keys[1].key) ?? 0,
    day: byKey.get(keys[2].key) ?? 0,
    limits,
  };
}