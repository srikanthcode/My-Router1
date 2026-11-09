import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDb, walletReservations, wallets, walletTransactions } from "@pro/database";
import { ApiError, formatMoney } from "@pro/shared";
import { eventHub } from "./events.js";

export interface CreditParams {
  userId: string;
  amountPaise: number;
  type: "topup" | "refund" | "promotional" | "gift" | "adjustment";
  reference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

async function ensureWallet(tx: any, userId: string) {
  await tx.insert(wallets).values({ userId, balancePaise: 0 }).onConflictDoNothing({ target: wallets.userId });
}

/**
 * Credit a wallet inside a DB transaction with an immutable ledger entry (§48).
 * Idempotency-Key prevents double-crediting (§55).
 * Automatically broadcasts real-time wallet updates.
 */
export async function creditWallet(
  params: CreditParams,
): Promise<{ balancePaise: number; transactionId: string; deduped: boolean }> {
  if (params.amountPaise <= 0) throw new ApiError("invalid_request", "Credit amount must be positive");
  const db = await getDb();
  const res = await db.transaction(async (tx: any) => {
    if (params.idempotencyKey) {
      const existing = await tx
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.idempotencyKey, params.idempotencyKey));
      if (existing.length > 0) {
        const w = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
        return { balancePaise: w[0]?.balancePaise ?? 0, transactionId: existing[0].id, deduped: true };
      }
    }
    await ensureWallet(tx, params.userId);
    const [row] = await tx
      .update(wallets)
      .set({ balancePaise: sql`${wallets.balancePaise} + ${params.amountPaise}`, updatedAt: new Date() })
      .where(eq(wallets.userId, params.userId))
      .returning();
    const balance = row.balancePaise;
    const [txRow] = await tx
      .insert(walletTransactions)
      .values({
        userId: params.userId,
        type: params.type,
        amountPaise: params.amountPaise,
        balanceAfterPaise: balance,
        reference: params.reference,
        idempotencyKey: params.idempotencyKey,
        metadata: params.metadata ?? {},
      })
      .returning();
    return { balancePaise: balance, transactionId: txRow.id, deduped: false };
  });

  if (!res.deduped) {
    eventHub.publish(params.userId, "wallet.balance.updated", {
      balancePaise: res.balancePaise,
      balanceFormatted: formatMoney(res.balancePaise),
      currency: "INR",
    });
    eventHub.publish(params.userId, "ledger.entry.created", {
      type: params.type,
      amountPaise: params.amountPaise,
      balanceAfterPaise: res.balancePaise,
      reference: params.reference,
    });
  }

  return res;
}

export interface DebitParams {
  userId: string;
  amountPaise: number;
  reference?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Debit usage inside an existing transaction. The wallet row is locked so the
 * recorded deduction always matches the actual balance change, even under
 * concurrent requests.
 */
async function debitWithinTx(
  tx: any,
  params: DebitParams,
): Promise<{
  balancePaise: number;
  deductedPaise: number;
  transactionId: string | null;
  deduped: boolean;
}> {
  const amount = Math.max(0, Math.round(params.amountPaise));
  if (amount === 0) {
    const rows = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
    return { balancePaise: rows[0]?.balancePaise ?? 0, deductedPaise: 0, transactionId: null, deduped: false };
  }
  if (params.idempotencyKey) {
    const existing = await tx
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.idempotencyKey, params.idempotencyKey));
    if (existing.length > 0) {
      const w = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
      return {
        balancePaise: w[0]?.balancePaise ?? 0,
        deductedPaise: Math.max(0, -existing[0].amountPaise),
        transactionId: existing[0].id,
        deduped: true,
      };
    }
  }
  await ensureWallet(tx, params.userId);
  const locked = await tx
    .select()
    .from(wallets)
    .where(eq(wallets.userId, params.userId))
    .for("update");
  const oldBalance: number = locked[0]?.balancePaise ?? 0;
  const deducted = Math.min(amount, Math.max(0, oldBalance));
  if (deducted === 0) {
    return { balancePaise: oldBalance, deductedPaise: 0, transactionId: null, deduped: false };
  }
  const balance = oldBalance - deducted;
  await tx
    .update(wallets)
    .set({ balancePaise: balance, updatedAt: new Date() })
    .where(eq(wallets.userId, params.userId));
  const [txRow] = await tx
    .insert(walletTransactions)
    .values({
      userId: params.userId,
      type: "usage",
      amountPaise: -deducted,
      balanceAfterPaise: balance,
      reference: params.reference,
      idempotencyKey: params.idempotencyKey,
      metadata: { ...(params.metadata ?? {}), requested: amount, shortfall: amount - deducted },
    })
    .returning();
  return { balancePaise: balance, deductedPaise: deducted, transactionId: txRow.id, deduped: false };
}

/**
 * Debit usage from the wallet. Never overdraws: the balance is clamped at 0
 * and the ledger records the ACTUAL amount deducted.
 */
export async function debitWallet(params: DebitParams): Promise<{
  balancePaise: number;
  deductedPaise: number;
  transactionId: string | null;
  deduped: boolean;
}> {
  const db = await getDb();
  const res = await db.transaction((tx: any) => debitWithinTx(tx, params));

  if (!res.deduped && res.deductedPaise > 0) {
    eventHub.publish(params.userId, "wallet.balance.updated", {
      balancePaise: res.balancePaise,
      balanceFormatted: formatMoney(res.balancePaise),
      currency: "INR",
    });
  }

  return res;
}

export async function getBalance(userId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId));
  return rows[0]?.balancePaise ?? 0;
}

/**
 * Returns sum of active unexpired reservations.
 */
export async function getActiveReservedPaise(userId: string): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const rows = await db
    .select({ amount: walletReservations.amountPaise })
    .from(walletReservations)
    .where(
      and(
        eq(walletReservations.userId, userId),
        eq(walletReservations.status, "active"),
        gt(walletReservations.expiresAt, now),
      )
    );
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

/**
 * Available balance = current wallet balance minus all active reservations.
 */
export async function getAvailableBalance(userId: string): Promise<number> {
  const [totalBalance, reserved] = await Promise.all([
    getBalance(userId),
    getActiveReservedPaise(userId),
  ]);
  return Math.max(0, totalBalance - reserved);
}

/**
 * Server-side affordability pre-check.
 */
export async function assertAffordable(userId: string, estimatedPaise: number): Promise<number> {
  const available = await getAvailableBalance(userId);
  if (available < estimatedPaise) {
    throw new ApiError("insufficient_balance", "Your ProRouter wallet balance is insufficient for this request.");
  }
  return available;
}

/**
 * Atomically reserve funds for an in-flight LLM inference request (§54).
 */
export async function reserveBalance(params: {
  userId: string;
  requestId: string;
  amountPaise: number;
  timeoutMs?: number;
}): Promise<{ reservationId: string; availablePaise: number }> {
  const db = await getDb();
  const amount = Math.max(0, Math.round(params.amountPaise));
  const timeoutMs = params.timeoutMs ?? 5 * 60 * 1000; // 5 min TTL
  const expiresAt = new Date(Date.now() + timeoutMs);

  return db.transaction(async (tx: any) => {
    await ensureWallet(tx, params.userId);
    const locked = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, params.userId))
      .for("update");
    const balance = locked[0]?.balancePaise ?? 0;

    const activeRows = await tx
      .select({ amount: walletReservations.amountPaise })
      .from(walletReservations)
      .where(
        and(
          eq(walletReservations.userId, params.userId),
          eq(walletReservations.status, "active"),
          gt(walletReservations.expiresAt, new Date()),
        )
      );
    const currentReserved = activeRows.reduce((sum: number, r: { amount: number }) => sum + r.amount, 0);
    const available = balance - currentReserved;

    if (available < amount) {
      throw new ApiError(
        "insufficient_balance",
        `Insufficient available balance. Available: ${formatMoney(available)}, Required: ${formatMoney(amount)}`
      );
    }

    const [res] = await tx
      .insert(walletReservations)
      .values({
        userId: params.userId,
        requestId: params.requestId,
        amountPaise: amount,
        status: "active",
        expiresAt,
      })
      .onConflictDoNothing({ target: walletReservations.requestId })
      .returning();

    if (!res) {
      const [existing] = await tx
        .select()
        .from(walletReservations)
        .where(eq(walletReservations.requestId, params.requestId));
      if (!existing) {
        throw new ApiError("invalid_request", "Could not create the wallet reservation.");
      }
      if (existing.userId !== params.userId) {
        throw new ApiError("forbidden", "This reservation belongs to another account.");
      }
      if (existing.status !== "active") {
        throw new ApiError("invalid_request", "This request id has already been settled or released.");
      }
      return { reservationId: existing.id, availablePaise: Math.max(0, available) };
    }

    eventHub.publish(params.userId, "wallet.reservation.created", {
      requestId: params.requestId,
      reservedPaise: amount,
      availablePaise: available - amount,
    });

    return { reservationId: res.id, availablePaise: available - amount };
  });
}

function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

/**
 * Settle a reservation upon LLM request completion.
 * The reservation is locked and checked for ownership before any money moves;
 * the ledger insert is unique-keyed so a retry can never debit twice.
 */
export async function settleReservation(params: {
  userId: string;
  requestId: string;
  actualAmountPaise: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balancePaise: number; deductedPaise: number; transactionId: string | null; deduped: boolean }> {
  const db = await getDb();
  const actual = Math.max(0, Math.round(params.actualAmountPaise));
  const idempotencyKey = `usage:${params.requestId}`;

  const settle = async () =>
    db.transaction(async (tx: any) => {
      const lockedReservations = await tx
        .select()
        .from(walletReservations)
        .where(eq(walletReservations.requestId, params.requestId))
        .for("update");
      const reservation = lockedReservations[0];
      if (reservation && reservation.userId !== params.userId) {
        throw new ApiError("forbidden", "This reservation belongs to another account.");
      }

      const existingRows = await tx
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.idempotencyKey, idempotencyKey));
      const existing = existingRows[0];
      const walletRows = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
      const currentBalance: number = walletRows[0]?.balancePaise ?? 0;

      if (existing) {
        if (reservation && reservation.status === "active") {
          await tx
            .update(walletReservations)
            .set({ status: "settled", settledPaise: Math.max(0, -existing.amountPaise), updatedAt: new Date() })
            .where(
              and(
                eq(walletReservations.requestId, params.requestId),
                eq(walletReservations.userId, params.userId),
                eq(walletReservations.status, "active"),
              )
            );
        }
        return {
          balancePaise: currentBalance,
          deductedPaise: Math.max(0, -existing.amountPaise),
          transactionId: existing.id,
          deduped: true,
        };
      }

      const debit = await debitWithinTx(tx, {
        userId: params.userId,
        amountPaise: actual,
        reference: params.reference ?? params.requestId,
        idempotencyKey,
        metadata: params.metadata,
      });

      if (reservation && reservation.status === "active") {
        await tx
          .update(walletReservations)
          .set({ status: "settled", settledPaise: actual, updatedAt: new Date() })
          .where(
            and(
              eq(walletReservations.requestId, params.requestId),
              eq(walletReservations.userId, params.userId),
              eq(walletReservations.status, "active"),
            )
          );
      }

      return debit;
    });

  let result: Awaited<ReturnType<typeof settle>>;
  try {
    result = await settle();
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
    // A concurrent settle won the ledger insert; the retry observes it and
    // returns the already-recorded deduction without moving money again.
    result = await settle();
  }

  if (!result.deduped && result.deductedPaise > 0) {
    eventHub.publish(params.userId, "wallet.balance.updated", {
      balancePaise: result.balancePaise,
      balanceFormatted: formatMoney(result.balancePaise),
      currency: "INR",
    });
  }

  return result;
}

/**
 * Release an active reservation without debit (e.g. if provider fails or request aborted).
 */
export async function releaseReservation(params: { userId: string; requestId: string }): Promise<void> {
  const db = await getDb();
  const released = await db.transaction(async (tx: any) => {
    const rows = await tx
      .update(walletReservations)
      .set({
        status: "released",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(walletReservations.requestId, params.requestId),
          eq(walletReservations.userId, params.userId),
          eq(walletReservations.status, "active"),
        )
      )
      .returning({ id: walletReservations.id });
    return rows.length > 0;
  });

  if (!released) return;

  const available = await getAvailableBalance(params.userId);
  eventHub.publish(params.userId, "wallet.reservation.released", {
    requestId: params.requestId,
    availablePaise: available,
  });
}
