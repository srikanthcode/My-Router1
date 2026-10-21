/**
 * DataStore — the dual-backend data-access contract.
 *
 * Every route/lib file talks to this interface instead of Drizzle directly.
 * Two implementations:
 *   - sql-store.ts  — Drizzle over PGlite/Postgres (the existing behavior)
 *   - mongo-store.ts — MongoDB driver (primary when MONGODB_URI is set)
 *
 * Row types are the Drizzle `$inferSelect` shapes (camelCase, `id: string`,
 * Date fields). The Mongo store adapts `_id` ↔ `id` on the boundary.
 *
 * Atomicity (see STORE-PLAN notes): wallets.credit / wallets.debit and the
 * Astra redemption composite run inside backend-owned transactions; freeUsage
 * consume/release are atomic single-document ops; everything else matches the
 * current autocommit SQL semantics.
 */

import type {
  users,
  sessions,
  apiKeys,
  wallets,
  walletTransactions,
  creditPackages,
  plans,
  subscriptions,
  payments,
  paymentWebhooks,
  providers,
  providerCredentials,
  providerHealth,
  models,
  modelPricing,
  modelCapabilities,
  modelProviders,
  modelLimits,
  systemSettings,
  featureFlags,
  auditLogs,
  notifications,
  incidents,
  requests,
  requestAttempts,
  freeUsage,
  astraCampaigns,
  giftCodes,
  giftCodeRedemptions,
  astraEntitlements,
} from "../schema/index.js";

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type WalletRow = typeof wallets.$inferSelect;
export type WalletTxRow = typeof walletTransactions.$inferSelect;
export type CreditPackageRow = typeof creditPackages.$inferSelect;
export type PlanRow = typeof plans.$inferSelect;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;
export type PaymentWebhookRow = typeof paymentWebhooks.$inferSelect;
export type ProviderRow = typeof providers.$inferSelect;
export type ProviderCredentialRow = typeof providerCredentials.$inferSelect;
export type ProviderHealthRow = typeof providerHealth.$inferSelect;
export type ModelRow = typeof models.$inferSelect;
export type ModelPricingRow = typeof modelPricing.$inferSelect;
export type ModelCapabilitiesRow = typeof modelCapabilities.$inferSelect;
export type ModelProviderRow = typeof modelProviders.$inferSelect;
export type ModelLimitsRow = typeof modelLimits.$inferSelect;
export type SystemSettingRow = typeof systemSettings.$inferSelect;
export type FeatureFlagRow = typeof featureFlags.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type IncidentRow = typeof incidents.$inferSelect;
export type RequestRow = typeof requests.$inferSelect;
export type RequestAttemptRow = typeof requestAttempts.$inferSelect;
export type FreeUsageRow = typeof freeUsage.$inferSelect;
export type AstraCampaignRow = typeof astraCampaigns.$inferSelect;
export type GiftCodeRow = typeof giftCodes.$inferSelect;
export type GiftCodeRedemptionRow = typeof giftCodeRedemptions.$inferSelect;
export type AstraEntitlementRow = typeof astraEntitlements.$inferSelect;

export interface DataStore {
  // ── users ──────────────────────────────────────────────────────────
  users: {
    findById(id: string): Promise<UserRow | null>;
    findByEmail(email: string): Promise<UserRow | null>;
    create(v: { email: string; passwordHash: string; name: string; emailVerified: boolean }): Promise<UserRow>;
    updateProfile(id: string, name: string): Promise<void>;
    updatePasswordHash(id: string, passwordHash: string): Promise<void>;
    adminUpdate(id: string, patch: { status?: "active" | "suspended" | "pending"; role?: "user" | "admin" | "support" }): Promise<UserRow | null>;
    adminSearch(q: string | undefined, limit: number): Promise<UserRow[]>;
    countAll(): Promise<number>;
  };

  // ── sessions ───────────────────────────────────────────────────────
  sessions: {
    create(v: { userId: string; tokenHash: string; expiresAt: Date; ip?: string; userAgent?: string }): Promise<void>;
    findValidWithUser(tokenHash: string, now: Date): Promise<{ session: SessionRow; user: UserRow } | null>;
    touch(id: string, at: Date): Promise<void>;
    deleteByTokenHash(tokenHash: string): Promise<void>;
  };

  // ── api keys ───────────────────────────────────────────────────────
  apiKeys: {
    listByUser(userId: string): Promise<ApiKeyRow[]>;
    findById(id: string): Promise<ApiKeyRow | null>;
    findByHash(keyHash: string): Promise<{ key: ApiKeyRow; user: UserRow } | null>;
    countByUser(userId: string): Promise<number>;
    create(v: { userId: string; name: string; prefix: string; keyHash: string; expiresAt: Date | null; spendingLimitPaise: number | null; allowedModels: string[] | null }): Promise<ApiKeyRow>;
    rotate(id: string, v: { keyHash: string; prefix: string }): Promise<ApiKeyRow | null>;
    revoke(id: string): Promise<void>;
    bumpUsage(id: string, costPaise: number): Promise<void>;
    countActiveByUser(userId: string): Promise<number>;
  };

  // ── wallet + ledger ────────────────────────────────────────────────
  wallets: {
    credit(p: { userId: string; amountPaise: number; type: "topup" | "refund" | "promotional" | "gift" | "adjustment"; reference?: string; idempotencyKey?: string; metadata?: Record<string, unknown> }): Promise<{ balancePaise: number; transactionId: string; deduped: boolean }>;
    debit(p: { userId: string; amountPaise: number; reference?: string; metadata?: Record<string, unknown> }): Promise<{ balancePaise: number; deductedPaise: number; transactionId: string | null }>;
    getBalance(userId: string): Promise<number>;
    adminAdjust(userId: string, amountPaise: number, opts: { reference: string; reason: string }): Promise<number>;
    sumAllBalances(): Promise<number>;
  };
  walletTransactions: {
    listByUser(userId: string, limit: number): Promise<WalletTxRow[]>;
    sumUsageOutflow(): Promise<number>;
  };

  // ── payments ───────────────────────────────────────────────────────
  payments: {
    findByIdempotencyKey(key: string): Promise<PaymentRow | null>;
    create(v: { userId: string; packageId: string | null; gateway: string; amountPaise: number; status: "created"; idempotencyKey: string | null; invoiceNumber: string; metadata: Record<string, unknown> }): Promise<PaymentRow>;
    setGatewayOrder(id: string, gatewayOrderId: string): Promise<void>;
    findByGatewayOrder(orderId: string): Promise<PaymentRow | null>;
    markCaptured(id: string, gatewayPaymentId: string | null): Promise<void>;
    listByUser(userId: string, limit: number): Promise<PaymentRow[]>;
    sumCapturedPaise(): Promise<number>;
  };
  paymentWebhooks: {
    findByEventId(eventId: string): Promise<PaymentWebhookRow | null>;
    create(v: { eventId: string; gateway: string; payload: Record<string, unknown>; signatureValid: boolean }): Promise<void>;
  };

  // ── plans / subscriptions / credit packages ────────────────────────
  plans: {
    listActive(): Promise<PlanRow[]>;
    findBySlug(slug: string): Promise<PlanRow | null>;
    listAllAdmin(): Promise<PlanRow[]>;
    adminUpdate(id: string, patch: Partial<Pick<PlanRow, "pricePaise" | "freeRpm" | "freeRph" | "freeRpd" | "concurrency" | "queuePriority" | "active" | "features">>): Promise<PlanRow | null>;
    findUserPlan(userId: string, opts: { requireActive: boolean }): Promise<PlanRow | null>;
  };
  subscriptions: {
    ensure(userId: string, planId: string): Promise<void>;
  };
  creditPackages: {
    listActive(): Promise<CreditPackageRow[]>;
    findBySlug(slug: string): Promise<CreditPackageRow | null>;
    listAllAdmin(): Promise<CreditPackageRow[]>;
    adminUpdate(id: string, patch: Partial<Pick<CreditPackageRow, "name" | "pricePaise" | "bonusPaise" | "active">>): Promise<CreditPackageRow | null>;
  };

  // ── providers ──────────────────────────────────────────────────────
  providers: {
    listAll(): Promise<ProviderRow[]>;
    listByPriority(): Promise<ProviderRow[]>;
    findById(id: string): Promise<ProviderRow | null>;
    findBySlug(slug: string): Promise<ProviderRow | null>;
    create(v: { slug: string; name: string; description: string; region: string; endpointUrl: string; adapterType: string; priority: number; timeoutMs: number; retryCount: number; retentionPolicy: string; capabilities: string[] }): Promise<ProviderRow>;
    update(id: string, patch: Partial<Omit<ProviderRow, "id" | "createdAt">>): Promise<ProviderRow | null>;
    applyHealthResult(id: string, v: { status: string; healthMessage: string | null; lastHealthAt: Date }): Promise<void>;
  };
  providerCredentials: {
    listAll(): Promise<ProviderCredentialRow[]>;
    listByProvider(providerId: string, opts: { activeOnly: boolean }): Promise<ProviderCredentialRow[]>;
    upsert(v: { providerId: string; keyName: string; ciphertext: string; iv: string; authTag: string | null }): Promise<void>;
  };
  providerHealth: {
    insert(v: { providerId: string; available: boolean; latencyMs: number | null; successRateBp: number; errorRateBp: number; message: string | null }): Promise<void>;
    listRecent(limit: number): Promise<ProviderHealthRow[]>;
    latestPerProvider(providerIds: string[]): Promise<ProviderHealthRow[]>;
    latestForProvider(providerId: string): Promise<ProviderHealthRow | null>;
  };

  // ── models + relations ─────────────────────────────────────────────
  models: {
    listActive(): Promise<ModelRow[]>;
    findBySlug(slug: string): Promise<ModelRow | null>;
    listWithPricing(): Promise<Array<{ model: ModelRow; pricing: ModelPricingRow | null }>>;
    listActiveWithCaps(): Promise<Array<{ model: ModelRow; caps: ModelCapabilitiesRow | null }>>;
    create(v: { slug: string; name: string; description: string; isFree: boolean; contextWindow: number; maxOutputTokens: number; rank: number; status: string }): Promise<ModelRow>;
    update(id: string, patch: Partial<Pick<ModelRow, "name" | "description" | "status" | "isFree" | "rank" | "contextWindow">>): Promise<ModelRow | null>;
  };
  modelPricing: {
    findByModelId(modelId: string): Promise<ModelPricingRow | null>;
    create(v: { modelId: string; inputPerMillion: number; outputPerMillion: number; currency: string }): Promise<void>;
    updateByModelId(modelId: string, patch: { inputPerMillion?: number; outputPerMillion?: number }): Promise<void>;
  };
  modelCapabilities: {
    create(v: { modelId: string; reasoning: boolean; toolCalls: boolean; vision: boolean; structuredOutputs: boolean; streaming: boolean; jsonMode: boolean }): Promise<void>;
  };
  modelLimits: {
    findByModelId(modelId: string): Promise<ModelLimitsRow | null>;
    create(v: { modelId: string; perMinute: number; perHour: number; perDay: number; concurrency: number; queuePriority: number }): Promise<void>;
  };
  modelProviders: {
    listAll(): Promise<ModelProviderRow[]>;
    listByModelId(modelId: string): Promise<ModelProviderRow[]>;
    listWithProviders(modelId: string): Promise<Array<{ link: ModelProviderRow; provider: ProviderRow }>>;
    listWithModels(providerId: string): Promise<Array<{ link: ModelProviderRow; model: ModelRow }>>;
    createIfAbsent(v: { modelId: string; providerId: string; providerModelId: string; priority: number; status: string }): Promise<void>;
  };

  // ── catalog listing ────────────────────────────────────────────────
  catalog: {
    listModelPage(f: { q?: string; providerId?: string; free?: boolean; paid?: boolean; minContext?: number; sort?: "rank" | "popularity" | "rating" | "newest" | "price_asc" | "price_desc" | "latency"; limit: number; offset: number }): Promise<{
      total: number;
      rows: Array<{ model: ModelRow; pricing: ModelPricingRow | null; caps: ModelCapabilitiesRow | null; providerSlug: string | null; providerName: string | null }>;
    }>;
    modelBundleBySlug(slug: string): Promise<{ model: ModelRow; pricing: ModelPricingRow | null; caps: ModelCapabilitiesRow | null; providerSlug: string | null; providerName: string | null } | null>;
  };

  // ── requests + attempts ────────────────────────────────────────────
  requests: {
    insert(v: { id: string; userId: string; apiKeyId: string | null; modelId: string; providerId: string; status: "queued"; route: string; streaming: boolean; isFree: boolean; ip: string | null }): Promise<void>;
    finalize(id: string, v: { status: "success" | "error"; httpStatus: number; latencyMs: number; ttftMs: number | null; queueWaitMs: number; inputTokens: number; outputTokens: number; totalTokens: number; costPaise: number; errorCode: string | null; errorMessage: string | null; providerId: string }): Promise<void>;
    listForUser(f: { userId: string; status?: "error" | "success"; limit: number; offset: number }): Promise<Array<{ request: RequestRow; model: ModelRow | null; provider: ProviderRow | null }>>;
    countForUser(f: { userId: string; status?: "error" | "success" }): Promise<number>;
    findByIdWithRelations(id: string): Promise<{ request: RequestRow; model: ModelRow | null; provider: ProviderRow | null; apiKey: ApiKeyRow | null } | null>;
    aggregateForUser(userId: string, since: Date): Promise<{ n: number; tokens: number; costPaise: number }>;
    listForUserSince(userId: string, since: Date): Promise<RequestRow[]>;
    usageByModel(userId: string, since: Date): Promise<Array<{ model: string | null; n: number; tokens: number; costPaise: number }>>;
    usageByProvider(userId: string, since: Date): Promise<Array<{ provider: string | null; n: number; tokens: number }>>;
    listRecentAdmin(limit: number): Promise<Array<{ request: RequestRow; userEmail: string | null; modelSlug: string | null; providerSlug: string | null }>>;
    countSince(since: Date): Promise<number>;
    countFreeSince(since: Date): Promise<number>;
  };
  requestAttempts: {
    insert(v: { requestId: string; attempt: number; status: string; httpStatus: number | null; latencyMs: number | null; error: string | null }): Promise<void>;
    listByRequest(requestId: string): Promise<RequestAttemptRow[]>;
  };

  // ── free quota (§51) ───────────────────────────────────────────────
  freeUsage: {
    consumeOne(userId: string, bucketKey: string): Promise<number>;
    releaseOne(userId: string, bucketKey: string): Promise<void>;
    countsByUser(userId: string): Promise<Array<{ bucketKey: string; count: number }>>;
    sumByUser(userId: string): Promise<number>;
  };

  // ── promotions (Astra) ─────────────────────────────────────────────
  astraCampaigns: {
    latest(): Promise<AstraCampaignRow | null>;
    findActive(now: Date): Promise<AstraCampaignRow | null>;
    update(id: string, patch: Partial<Omit<AstraCampaignRow, "id" | "createdAt" | "slug">>): Promise<AstraCampaignRow | null>;
  };
  giftCodes: {
    findByCode(code: string): Promise<GiftCodeRow | null>;
    listByOwnerAndCampaign(ownerUserId: string, campaignId: string): Promise<GiftCodeRow[]>;
    create(v: { campaignId: string; code: string; ownerUserId: string | null; maxRedemptions?: number | null; status: "active" }): Promise<void>;
    incrementRedemption(id: string): Promise<void>;
    listByCampaign(campaignId: string, limit: number): Promise<GiftCodeRow[]>;
    countByCampaign(campaignId: string): Promise<number>;
    updateStatus(id: string, status: "active" | "suspended" | "revoked"): Promise<GiftCodeRow | null>;
  };
  giftCodeRedemptions: {
    exists(codeId: string, redeemerUserId: string): Promise<boolean>;
    create(v: { campaignId: string; codeId: string; redeemerUserId: string }): Promise<void>;
    countByCode(codeId: string): Promise<number>;
    countByCampaign(campaignId: string): Promise<number>;
    countAll(): Promise<number>;
  };
  astraEntitlements: {
    findActiveForUser(userId: string, now: Date): Promise<AstraEntitlementRow | null>;
    create(v: { userId: string; campaignId: string; sourceCodeId: string | null; activatedAt: Date; expiresAt: Date; status: "active" }): Promise<void>;
    countActiveByCampaign(campaignId: string, now: Date): Promise<number>;
    countActiveBySourceCode(sourceCodeId: string, now: Date): Promise<number>;
    countExpiring(now: Date): Promise<number>;
  };

  // ── platform ───────────────────────────────────────────────────────
  systemSettings: {
    listAll(): Promise<SystemSettingRow[]>;
    setValue(key: string, value: unknown): Promise<void>;
  };
  featureFlags: {
    listAll(): Promise<FeatureFlagRow[]>;
    setEnabled(key: string, enabled: boolean): Promise<void>;
  };
  auditLogs: {
    insert(v: { actorUserId: string | null; action: string; targetType?: string | null; targetId?: string | null; metadata?: Record<string, unknown>; ip?: string | null }): Promise<void>;
    listRecent(limit: number): Promise<AuditLogRow[]>;
  };
  notifications: {
    insert(v: { userId: string; type: string; title: string; body?: string; href?: string | null }): Promise<void>;
    listByUser(userId: string, limit: number): Promise<NotificationRow[]>;
    markAllRead(userId: string): Promise<void>;
  };
  incidents: {
    listRecent(limit: number): Promise<IncidentRow[]>;
  };
}
