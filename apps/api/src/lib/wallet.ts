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
 * Debit usage from the wallet. Never overdraws: the balance is clamped at 0
 * and the ledger records the ACTUAL amount deducted.
 */
export async function debitWallet(params: DebitParams): Promise<{
  balancePaise: number;
  deductedPaise: number;
  transactionId: string | null;
  deduped: boolean;
}> {
  const amount = Math.max(0, Math.round(params.amountPaise));
  const db = await getDb();
  if (amount === 0) {
    return { balancePaise: await getBalance(params.userId), deductedPaise: 0, transactionId: null, deduped: false };
  }
  const res = await db.transaction(async (tx: any) => {
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
    const before = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
    const oldBalance: number = before[0]?.balancePaise ?? 0;
    const deducted = Math.min(amount, Math.max(0, oldBalance));
    const [row] = await tx
      .update(wallets)
      .set({ balancePaise: sql`GREATEST(${wallets.balancePaise} - ${amount}, 0)`, updatedAt: new Date() })
      .where(eq(wallets.userId, params.userId))
      .returning();
    const balance = row.balancePaise;
    if (deducted === 0) return { balancePaise: balance, deductedPaise: 0, transactionId: null, deduped: false };
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
  });

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
    const w = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
    const balance = w[0]?.balancePaise ?? 0;

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
      .onConflictDoUpdate({
        target: walletReservations.requestId,
        set: { amountPaise: amount, status: "active", expiresAt, updatedAt: new Date() },
      })
      .returning();

    eventHub.publish(params.userId, "wallet.reservation.created", {
      requestId: params.requestId,
      reservedPaise: amount,
      availablePaise: available - amount,
    });

    return { reservationId: res.id, availablePaise: available - amount };
  });
}

/**
 * Settle a reservation upon LLM request completion.
 * Atomically marks the reservation settled, debits the actual cost, and releases any surplus.
 */
export async function settleReservation(params: {
  userId: string;
  requestId: string;
  actualAmountPaise: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ balancePaise: number; deductedPaise: number; transactionId: string | null }> {
  const db = await getDb();
  const actual = Math.max(0, Math.round(params.actualAmountPaise));

  const result = await db.transaction(async (tx: any) => {
    // 1. Mark reservation as settled
    await tx
      .update(walletReservations)
      .set({
        status: "settled",
        settledPaise: actual,
        updatedAt: new Date(),
      })
      .where(eq(walletReservations.requestId, params.requestId));

    // 2. Perform actual debit
    const before = await tx.select().from(wallets).where(eq(wallets.userId, params.userId));
    const oldBalance: number = before[0]?.balancePaise ?? 0;
    const deducted = Math.min(actual, Math.max(0, oldBalance));

    const [row] = await tx
      .update(wallets)
      .set({ balancePaise: sql`GREATEST(${wallets.balancePaise} - ${actual}, 0)`, updatedAt: new Date() })
      .where(eq(wallets.userId, params.userId))
      .returning();

    const balance = row.balancePaise;
    let txId: string | null = null;

    if (deducted > 0) {
      const [txRow] = await tx
        .insert(walletTransactions)
        .values({
          userId: params.userId,
          type: "usage",
          amountPaise: -deducted,
          balanceAfterPaise: balance,
          reference: params.reference ?? params.requestId,
          idempotencyKey: `usage:${params.requestId}`,
          metadata: { ...(params.metadata ?? {}), requested: actual, shortfall: actual - deducted },
        })
        .onConflictDoNothing()
        .returning();
      txId = txRow?.id ?? null;
    }

    return { balancePaise: balance, deductedPaise: deducted, transactionId: txId };
  });

  // Broadcast real-time balance update
  eventHub.publish(params.userId, "wallet.balance.updated", {
    balancePaise: result.balancePaise,
    balanceFormatted: formatMoney(result.balancePaise),
    currency: "INR",
  });

  return result;
}

/**
 * Release an active reservation without debit (e.g. if provider fails or request aborted).
 */
export async function releaseReservation(params: { userId: string; requestId: string }): Promise<void> {
  const db = await getDb();
  await db
    .update(walletReservations)
    .set({
      status: "released",
      updatedAt: new Date(),
    })
    .where(eq(walletReservations.requestId, params.requestId));

  const available = await getAvailableBalance(params.userId);
  eventHub.publish(params.userId, "wallet.reservation.released", {
    requestId: params.requestId,
    availablePaise: available,
  });
}
