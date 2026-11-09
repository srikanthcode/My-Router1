import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";

/**
 * Regression tests for the money path (§48, §54, §55).
 * A settle retry, a stale balance read, or a cross-account request must never
 * change a wallet twice or charge the wrong user.
 */

const TEST_DB = ".data/wallet-atomicity-db";
process.env.DATABASE_DIR = TEST_DB;
process.env.DATABASE_URL = "";

type DatabaseModule = typeof import("@pro/database");
type WalletModule = typeof import("../apps/api/src/lib/wallet.js");

let database: DatabaseModule;
let db: Awaited<ReturnType<DatabaseModule["getDb"]>>;
let wallet: WalletModule;
const userIds: Record<string, string> = {};

beforeAll(async () => {
  fs.rmSync(path.resolve(TEST_DB), { recursive: true, force: true });
  database = await import("@pro/database");
  await database.runMigrations();
  db = await database.getDb();
  wallet = await import("../apps/api/src/lib/wallet.js");

  for (const name of ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]) {
    const [row] = await db
      .insert(database.users)
      .values({
        email: `${name}-${Date.now()}@wallet.test`,
        passwordHash: "not-used-in-this-suite",
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

describe("Wallet atomicity and idempotency", () => {
  it("settles a reservation exactly once even when finalize retries", async () => {
    const uid = userIds.alpha;
    await wallet.creditWallet({ userId: uid, amountPaise: 100_000, type: "topup" });
    await wallet.reserveBalance({ userId: uid, requestId: "req_settle_once", amountPaise: 50_000 });

    const first = await wallet.settleReservation({
      userId: uid,
      requestId: "req_settle_once",
      actualAmountPaise: 1_000,
    });
    expect(first.deduped).toBe(false);
    expect(first.deductedPaise).toBe(1_000);
    expect(first.balancePaise).toBe(99_000);

    const second = await wallet.settleReservation({
      userId: uid,
      requestId: "req_settle_once",
      actualAmountPaise: 1_000,
    });
    expect(second.deduped).toBe(true);
    expect(second.deductedPaise).toBe(1_000);
    expect(second.balancePaise).toBe(99_000);

    expect(await wallet.getBalance(uid)).toBe(99_000);

    const ledger = await db
      .select()
      .from(database.walletTransactions)
      .where(eq(database.walletTransactions.idempotencyKey, "usage:req_settle_once"));
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amountPaise).toBe(-1_000);

    const [reservation] = await db
      .select()
      .from(database.walletReservations)
      .where(eq(database.walletReservations.requestId, "req_settle_once"));
    expect(reservation.status).toBe("settled");
    expect(reservation.settledPaise).toBe(1_000);
  });

  it("refuses to settle or release another user's reservation", async () => {
    const owner = userIds.beta;
    const attacker = userIds.gamma;
    await wallet.creditWallet({ userId: owner, amountPaise: 100_000, type: "topup" });
    await wallet.creditWallet({ userId: attacker, amountPaise: 100_000, type: "topup" });
    await wallet.reserveBalance({ userId: owner, requestId: "req_owned", amountPaise: 10_000 });

    await expect(
      wallet.settleReservation({ userId: attacker, requestId: "req_owned", actualAmountPaise: 5_000 }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await wallet.releaseReservation({ userId: attacker, requestId: "req_owned" });

    expect(await wallet.getBalance(attacker)).toBe(100_000);
    expect(await wallet.getBalance(owner)).toBe(100_000);

    const [reservation] = await db
      .select()
      .from(database.walletReservations)
      .where(eq(database.walletReservations.requestId, "req_owned"));
    expect(reservation.status).toBe("active");
  });

  it("records the actual deduction when the request exceeds the balance", async () => {
    const uid = userIds.delta;
    await wallet.creditWallet({ userId: uid, amountPaise: 500, type: "topup" });

    const first = await wallet.debitWallet({
      userId: uid,
      amountPaise: 1_000,
      idempotencyKey: "usage:req_overdraft",
    });
    expect(first.deductedPaise).toBe(500);
    expect(first.balancePaise).toBe(0);

    const retry = await wallet.debitWallet({
      userId: uid,
      amountPaise: 1_000,
      idempotencyKey: "usage:req_overdraft",
    });
    expect(retry.deduped).toBe(true);
    expect(retry.deductedPaise).toBe(500);
    expect(await wallet.getBalance(uid)).toBe(0);

    const ledger = await db
      .select()
      .from(database.walletTransactions)
      .where(eq(database.walletTransactions.idempotencyKey, "usage:req_overdraft"));
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amountPaise).toBe(-500);
    expect(ledger[0].metadata.requested).toBe(1_000);
    expect(ledger[0].metadata.shortfall).toBe(500);
  });

  it("keeps reservations unique per request id and rejects over-reservation", async () => {
    const owner = userIds.epsilon;
    const other = userIds.zeta;
    await wallet.creditWallet({ userId: owner, amountPaise: 10_000, type: "topup" });
    await wallet.creditWallet({ userId: other, amountPaise: 10_000, type: "topup" });

    const first = await wallet.reserveBalance({ userId: owner, requestId: "req_shared", amountPaise: 1_000 });
    const again = await wallet.reserveBalance({ userId: owner, requestId: "req_shared", amountPaise: 1_000 });
    expect(again.reservationId).toBe(first.reservationId);
    expect(again.availablePaise).toBe(9_000);

    await expect(
      wallet.reserveBalance({ userId: other, requestId: "req_shared", amountPaise: 1_000 }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      wallet.reserveBalance({ userId: owner, requestId: "req_too_big", amountPaise: 9_500 }),
    ).rejects.toMatchObject({ code: "insufficient_balance" });

    expect(await wallet.getAvailableBalance(owner)).toBe(9_000);
  });

  it("releases only active reservations owned by the caller", async () => {
    const owner = userIds.alpha;
    await wallet.reserveBalance({ userId: owner, requestId: "req_release", amountPaise: 2_000 });

    await wallet.releaseReservation({ userId: userIds.beta, requestId: "req_release" });
    let [reservation] = await db
      .select()
      .from(database.walletReservations)
      .where(eq(database.walletReservations.requestId, "req_release"));
    expect(reservation.status).toBe("active");

    await wallet.releaseReservation({ userId: owner, requestId: "req_release" });
    [reservation] = await db
      .select()
      .from(database.walletReservations)
      .where(eq(database.walletReservations.requestId, "req_release"));
    expect(reservation.status).toBe("released");

    await expect(
      wallet.releaseReservation({ userId: owner, requestId: "req_release" }),
    ).resolves.toBeUndefined();
  });

  it("still bills usage when the reservation row is missing", async () => {
    const uid = userIds.zeta;
    const settled = await wallet.settleReservation({
      userId: uid,
      requestId: "req_missing_reservation",
      actualAmountPaise: 300,
    });
    expect(settled.deductedPaise).toBe(300);
    expect(await wallet.getBalance(uid)).toBe(9_700);
  });
});
