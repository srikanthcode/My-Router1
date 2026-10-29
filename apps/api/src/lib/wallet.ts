import { eq, sql } from "drizzle-orm";
import { getDb, wallets, walletTransactions } from "@pro/database";
import { ApiError } from "@pro/shared";

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
 */
export async function creditWallet(
  params: CreditParams,
): Promise<{ balancePaise: number; transactionId: string; deduped: boolean }> {
  if (params.amountPaise <= 0) throw new ApiError("invalid_request", "Credit amount must be positive");
  const db = await getDb();
  return db.transaction(async (tx: any) => {
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
 * and the ledger records the ACTUAL amount deducted. Idempotency-Key prevents
 * double-charging when a request is retried (§55).
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
  return db.transaction(async (tx: any) => {
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
}

export async function getBalance(userId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select().from(wallets).where(eq(wallets.userId, userId));
  return rows[0]?.balancePaise ?? 0;
}

/** Server-side affordability pre-check before any paid provider call (§54). */
export async function assertAffordable(userId: string, estimatedPaise: number): Promise<number> {
  const balance = await getBalance(userId);
  if (balance < estimatedPaise) {
    throw new ApiError("insufficient_balance", "Your ProRouter wallet balance is insufficient.");
  }
  return balance;
}