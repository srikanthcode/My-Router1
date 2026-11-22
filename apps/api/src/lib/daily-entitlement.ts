import { and, eq, sql } from "drizzle-orm";
import { dailyFreeTokenUsage, getDb } from "@pro/database";
import {
  DAILY_FREE_ALLOWANCE_TOKENS,
  getTodayUtcKey,
  getNextUtcResetTime,
} from "@pro/shared";
import { getNumber } from "./settings.js";

export async function getDailyAllowanceLimit(): Promise<number> {
  return await getNumber("DAILY_FREE_TOKENS_ENTITLEMENT", DAILY_FREE_ALLOWANCE_TOKENS);
}

export interface DailyQuotaStatus {
  dailyLimit: number;
  tokensConsumed: number;
  tokensReserved: number;
  tokensRemaining: number;
  dayKey: string;
  nextResetAt: string;
}

/**
 * Reads current daily quota status for the user without making reservations.
 */
export async function getDailyFreeQuota(userId: string): Promise<DailyQuotaStatus> {
  const db = await getDb();
  const dayKey = getTodayUtcKey();
  const dailyLimit = await getDailyAllowanceLimit();

  const rows = await db
    .select()
    .from(dailyFreeTokenUsage)
    .where(and(eq(dailyFreeTokenUsage.userId, userId), eq(dailyFreeTokenUsage.dayKey, dayKey)));

  const consumed = rows[0]?.tokensConsumed ?? 0;
  const reserved = rows[0]?.tokensReserved ?? 0;
  const tokensRemaining = Math.max(0, dailyLimit - consumed - reserved);

  return {
    dailyLimit,
    tokensConsumed: consumed,
    tokensReserved: reserved,
    tokensRemaining,
    dayKey,
    nextResetAt: getNextUtcResetTime().toISOString(),
  };
}

/**
 * Atomically reserve free tokens from the daily quota pool.
 * If estimated tokens exceed remaining quota, returns the reserved amount and the spillover
 * that must be covered by the user's wallet.
 */
export async function reserveDailyFreeTokens(params: {
  userId: string;
  estimatedTokens: number;
}): Promise<{
  reservedTokens: number;
  spilloverTokens: number;
  tokensRemaining: number;
}> {
  const db = await getDb();
  const dayKey = getTodayUtcKey();
  const dailyLimit = await getDailyAllowanceLimit();

  // First ensure row exists atomically
  await db.execute(sql`
    INSERT INTO daily_free_token_usage (user_id, day_key, tokens_consumed, tokens_reserved, updated_at)
    VALUES (${params.userId}, ${dayKey}, 0, 0, now())
    ON CONFLICT (user_id, day_key) DO NOTHING
  `);

  // Read current reservation state before incrementing
  const currentRows = await db
    .select({
      consumed: dailyFreeTokenUsage.tokensConsumed,
      reserved: dailyFreeTokenUsage.tokensReserved,
    })
    .from(dailyFreeTokenUsage)
    .where(and(eq(dailyFreeTokenUsage.userId, params.userId), eq(dailyFreeTokenUsage.dayKey, dayKey)));

  const consumedBefore = currentRows[0]?.consumed ?? 0;
  const reservedBefore = currentRows[0]?.reserved ?? 0;
  const remainingBefore = Math.max(0, dailyLimit - consumedBefore - reservedBefore);
  const actualToReserve = Math.min(remainingBefore, params.estimatedTokens);

  if (actualToReserve > 0) {
    await db.execute(sql`
      UPDATE daily_free_token_usage
      SET 
        tokens_reserved = tokens_reserved + ${actualToReserve},
        updated_at = now()
      WHERE user_id = ${params.userId} AND day_key = ${dayKey}
    `);
  }

  const spilloverTokens = Math.max(0, params.estimatedTokens - actualToReserve);
  const tokensRemaining = Math.max(0, remainingBefore - actualToReserve);

  return {
    reservedTokens: actualToReserve,
    spilloverTokens,
    tokensRemaining,
  };
}

/**
 * Settles a reservation against actual token usage from the upstream provider.
 * Moves actual free tokens to `tokens_consumed` and releases the reservation.
 * Any actual tokens beyond the reserved free quota become `spilloverPaidTokens`.
 */
export async function settleDailyFreeTokens(params: {
  userId: string;
  reservedTokens: number;
  actualTokens: number;
}): Promise<{
  freeTokensSettled: number;
  spilloverPaidTokens: number;
}> {
  const db = await getDb();
  const dayKey = getTodayUtcKey();

  const freeTokensSettled = Math.min(params.reservedTokens, params.actualTokens);
  const spilloverPaidTokens = Math.max(0, params.actualTokens - freeTokensSettled);

  await db.execute(sql`
    UPDATE daily_free_token_usage
    SET 
      tokens_consumed = tokens_consumed + ${freeTokensSettled},
      tokens_reserved = GREATEST(tokens_reserved - ${params.reservedTokens}, 0),
      updated_at = now()
    WHERE user_id = ${params.userId} AND day_key = ${dayKey}
  `);

  return {
    freeTokensSettled,
    spilloverPaidTokens,
  };
}

/**
 * Releases reserved free tokens when a request fails or aborts before completion.
 */
export async function releaseDailyFreeTokens(params: {
  userId: string;
  reservedTokens: number;
}): Promise<void> {
  if (params.reservedTokens <= 0) return;
  const db = await getDb();
  const dayKey = getTodayUtcKey();

  await db.execute(sql`
    UPDATE daily_free_token_usage
    SET 
      tokens_reserved = GREATEST(tokens_reserved - ${params.reservedTokens}, 0),
      updated_at = now()
    WHERE user_id = ${params.userId} AND day_key = ${dayKey}
  `).catch(() => {});
}
