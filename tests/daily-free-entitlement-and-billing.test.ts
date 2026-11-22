import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  DAILY_FREE_ALLOWANCE_TOKENS,
  DAILY_FREE_ELIGIBLE_MODELS,
  isDailyFreeEligible,
  resolveDailyFreeEligibleId,
  getTodayUtcKey,
  getNextUtcResetTime,
  calculateTokenPrice,
  calculateModelPricing,
  tokenCost,
  requestCost,
} from "@pro/shared";

const TEST_DB = ".data/daily-entitlement-test-db";
process.env.DATABASE_DIR = TEST_DB;
process.env.DATABASE_URL = "";

type DatabaseModule = typeof import("@pro/database");
type DailyEntitlementModule = typeof import("../apps/api/src/lib/daily-entitlement.js");
type WalletModule = typeof import("../apps/api/src/lib/wallet.js");

let database: DatabaseModule;
let db: Awaited<ReturnType<DatabaseModule["getDb"]>>;
let entitlement: DailyEntitlementModule;
let wallet: WalletModule;
const userIds: Record<string, string> = {};

beforeAll(async () => {
  fs.rmSync(path.resolve(TEST_DB), { recursive: true, force: true });
  database = await import("@pro/database");
  await database.runMigrations();
  db = await database.getDb();
  entitlement = await import("../apps/api/src/lib/daily-entitlement.js");
  wallet = await import("../apps/api/src/lib/wallet.js");

  for (const name of ["alice", "bob", "charlie"]) {
    const [row] = await db
      .insert(database.users)
      .values({
        email: `${name}-${Date.now()}@daily-entitlement.test`,
        passwordHash: "not-used",
        name,
      })
      .returning();
    userIds[name] = row.id;
  }
}, 120_000);

afterAll(async () => {
  await database.closeDb();
  fs.rmSync(path.resolve(TEST_DB), { recursive: true, force: true });
});

describe("Daily Free Token Entitlement Engine", () => {
  it("defines standard 1,000,000 free tokens per day", () => {
    expect(DAILY_FREE_ALLOWANCE_TOKENS).toBe(1_000_000);
  });

  it("qualifies only designated canonical models and their aliases", () => {
    expect(isDailyFreeEligible("deepseek-v4.1-flash")).toBe(true);
    expect(isDailyFreeEligible("qwen3.8-27b")).toBe(true);
    expect(isDailyFreeEligible("qwen3.2-27b")).toBe(true); // Canonical alias
    expect(resolveDailyFreeEligibleId("qwen3.2-27b")).toBe("qwen3.8-27b");

    // Paid models must NEVER be eligible
    expect(isDailyFreeEligible("claude-3-5-sonnet-20241022")).toBe(false);
    expect(isDailyFreeEligible("gpt-4o")).toBe(false);
    expect(isDailyFreeEligible("gemini-1.5-pro")).toBe(false);
    expect(isDailyFreeEligible("kimi-k3")).toBe(false);
    expect(isDailyFreeEligible("minimax-m3.1-flash")).toBe(false);
  });

  it("calculates accurate UTC day key and rollover time", () => {
    const today = getTodayUtcKey();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const resetTime = getNextUtcResetTime();
    expect(resetTime.getTime()).toBeGreaterThan(Date.now());
    expect(resetTime.getUTCHours()).toBe(0);
    expect(resetTime.getUTCMinutes()).toBe(0);
    expect(resetTime.getUTCSeconds()).toBe(0);
  });

  it("initializes fresh 1,000,000 tokens for new registered account", async () => {
    const quota = await entitlement.getDailyFreeQuota(userIds.alice);
    expect(quota.dailyLimit).toBe(1_000_000);
    expect(quota.tokensConsumed).toBe(0);
    expect(quota.tokensRemaining).toBe(1_000_000);
    expect(quota.dayKey).toBe(getTodayUtcKey());
  });

  it("reserves and settles free tokens atomically", async () => {
    const uid = userIds.alice;
    const res = await entitlement.reserveDailyFreeTokens({ userId: uid, estimatedTokens: 200_000 });
    expect(res.reservedTokens).toBe(200_000);
    expect(res.spilloverTokens).toBe(0);

    const quotaAfterReserve = await entitlement.getDailyFreeQuota(uid);
    expect(quotaAfterReserve.tokensRemaining).toBe(800_000);

    const settled = await entitlement.settleDailyFreeTokens({
      userId: uid,
      actualTokens: 150_000,
      reservedTokens: 200_000,
    });
    expect(settled.freeTokensSettled).toBe(150_000);
    expect(settled.spilloverPaidTokens).toBe(0);

    const quotaAfterSettle = await entitlement.getDailyFreeQuota(uid);
    expect(quotaAfterSettle.tokensConsumed).toBe(150_000);
    expect(quotaAfterSettle.tokensRemaining).toBe(850_000);
  });

  it("shares quota between DeepSeek V4.1 Flash and Qwen 27B", async () => {
    const uid = userIds.alice;
    const quotaBefore = await entitlement.getDailyFreeQuota(uid);
    const startRemaining = quotaBefore.tokensRemaining;

    // Simulate DeepSeek consumption
    await entitlement.reserveDailyFreeTokens({ userId: uid, estimatedTokens: 100_000 });
    await entitlement.settleDailyFreeTokens({ userId: uid, actualTokens: 100_000, reservedTokens: 100_000 });

    // Simulate Qwen consumption
    await entitlement.reserveDailyFreeTokens({ userId: uid, estimatedTokens: 150_000 });
    await entitlement.settleDailyFreeTokens({ userId: uid, actualTokens: 150_000, reservedTokens: 150_000 });

    const quotaAfter = await entitlement.getDailyFreeQuota(uid);
    expect(quotaAfter.tokensRemaining).toBe(startRemaining - 250_000);
  });

  it("enforces strict per-account isolation", async () => {
    // Alice has used tokens in previous tests
    const aliceQuota = await entitlement.getDailyFreeQuota(userIds.alice);
    expect(aliceQuota.tokensConsumed).toBeGreaterThan(0);

    // Bob has not made any requests yet
    const bobQuota = await entitlement.getDailyFreeQuota(userIds.bob);
    expect(bobQuota.tokensConsumed).toBe(0);
    expect(bobQuota.tokensRemaining).toBe(1_000_000);
  });

  it("releases reservations cleanly on request failure", async () => {
    const uid = userIds.bob;
    const quotaBefore = await entitlement.getDailyFreeQuota(uid);
    expect(quotaBefore.tokensRemaining).toBe(1_000_000);

    // Reserve 300,000 tokens
    await entitlement.reserveDailyFreeTokens({ userId: uid, estimatedTokens: 300_000 });
    const quotaMid = await entitlement.getDailyFreeQuota(uid);
    expect(quotaMid.tokensRemaining).toBe(700_000);

    // Upstream fails -> release reservation
    await entitlement.releaseDailyFreeTokens({ userId: uid, reservedTokens: 300_000 });
    const quotaAfter = await entitlement.getDailyFreeQuota(uid);
    expect(quotaAfter.tokensRemaining).toBe(1_000_000);
    expect(quotaAfter.tokensConsumed).toBe(0);
  });

  it("handles partial spillover when request exceeds remaining allowance", async () => {
    const uid = userIds.charlie;
    // Consume 950,000 tokens so 50,000 remain
    await entitlement.reserveDailyFreeTokens({ userId: uid, estimatedTokens: 950_000 });
    await entitlement.settleDailyFreeTokens({ userId: uid, actualTokens: 950_000, reservedTokens: 950_000 });

    const quotaBefore = await entitlement.getDailyFreeQuota(uid);
    expect(quotaBefore.tokensRemaining).toBe(50_000);

    // Request requires 150,000 tokens: 50,000 reserved from free quota, 100,000 spillover
    const reservation = await entitlement.reserveDailyFreeTokens({ userId: uid, estimatedTokens: 150_000 });
    expect(reservation.reservedTokens).toBe(50_000); // Only 50,000 available free
    expect(reservation.spilloverTokens).toBe(100_000);

    // Settle with actual 120,000 tokens
    const settled = await entitlement.settleDailyFreeTokens({
      userId: uid,
      actualTokens: 120_000,
      reservedTokens: 50_000,
    });
    expect(settled.freeTokensSettled).toBe(50_000);
    expect(settled.spilloverPaidTokens).toBe(70_000); // 70,000 tokens spill over to paid wallet

    const quotaAfter = await entitlement.getDailyFreeQuota(uid);
    expect(quotaAfter.tokensRemaining).toBe(0);
    expect(quotaAfter.tokensConsumed).toBe(1_000_000);
  });

  it("pricing engine calculates integer paise accurately without floating point drift", () => {
    // 50,000 tokens @ 8000 paise per 1M (₹80/1M) = (50,000 * 8,000) / 1,000,000 = 400 paise
    const cost = tokenCost(50_000, 8000);
    expect(cost).toBe(400);

    // Test ceiling behavior: 1 token @ 8000 paise per 1M = 0.008 -> ceil to 1 paisa (never undercharge)
    expect(tokenCost(1, 8000)).toBe(1);

    // Total request cost: 10,000 input @ 4,000/1M + 2,000 output @ 12,000/1M
    // Input: (10,000 * 4,000)/1,000,000 = 40 paise
    // Output: (2,000 * 12,000)/1,000,000 = 24 paise
    // Total = 64 paise
    const total = requestCost({
      inputTokens: 10_000,
      outputTokens: 2_000,
      inputPricePerMillion: 4_000,
      outputPricePerMillion: 12_000,
    });
    expect(total).toBe(64);
  });

  it("calculates commercial pricing with operational reserve and target margin", () => {
    // Upstream cost: $0.20/1M. With 10% operational reserve and 30% gross margin:
    // (0.20 * 1.10) / (1 - 0.30) = 0.22 / 0.70 = 0.314285...
    const result = calculateTokenPrice(0.20, { operationalReserve: 0.10, targetGrossMargin: 0.30 });
    expect(result.status).toBe("approved");
    expect(result.customerPriceUsdPer1M).toBe(0.3143);
    expect(result.marginPercent).toBeGreaterThanOrEqual(30);
  });
});
