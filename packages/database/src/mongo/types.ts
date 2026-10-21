/**
 * MongoDB document shapes. Field names mirror the TypeScript property names
 * from the Drizzle schema (camelCase); `_id` is a uuid string for parity with
 * the SQL primary keys, except one-to-one tables where `_id` is the natural
 * key (userId / modelId / settings key).
 *
 * Timestamps are BSON Date; jsonb columns are embedded documents; bigint
 * paise amounts are safe integers.
 */

export interface UserDoc {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "user" | "admin" | "support";
  status: "active" | "suspended" | "pending";
  emailVerified: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDoc {
  _id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface ApiKeyDoc {
  _id: string;
  userId: string;
  name: string;
  prefix: string;
  keyHash: string;
  expiresAt: Date | null;
  spendingLimitPaise: number | null;
  allowedModels: string[] | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  requestCount: number;
  spendPaise: number;
  createdAt: Date;
}

/** One wallet per user — `_id` is the userId. */
export interface WalletDoc {
  _id: string;
  balancePaise: number;
  currency: string;
  updatedAt: Date;
}

export type WalletTxType = "topup" | "refund" | "promotional" | "gift" | "usage" | "adjustment";

export interface WalletTransactionDoc {
  _id: string;
  userId: string;
  type: WalletTxType;
  amountPaise: number;
  balanceAfterPaise: number;
  currency: string;
  reference: string | null;
  idempotencyKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreditPackageDoc {
  _id: string;
  slug: string;
  name: string;
  pricePaise: number;
  bonusPaise: number;
  currency: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface PlanDoc {
  _id: string;
  slug: string;
  name: string;
  tagline: string;
  pricePaise: number;
  currency: string;
  period: string;
  freeRpm: number;
  freeRph: number;
  freeRpd: number;
  concurrency: number;
  queuePriority: number;
  features: string[];
  active: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface SubscriptionDoc {
  _id: string;
  userId: string;
  planId: string;
  status: "active" | "expired" | "cancelled";
  startedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
}

export type PaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded";

export interface PaymentDoc {
  _id: string;
  userId: string;
  packageId: string | null;
  gateway: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  amountPaise: number;
  status: PaymentStatus;
  idempotencyKey: string | null;
  invoiceNumber: string;
  creditedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentWebhookDoc {
  _id: string;
  paymentId: string | null;
  eventId: string;
  gateway: string;
  payload: Record<string, unknown>;
  signatureValid: boolean;
  processedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

export interface ProviderDoc {
  _id: string;
  slug: string;
  name: string;
  description: string;
  region: string;
  endpointUrl: string;
  adapterType: string;
  priority: number;
  timeoutMs: number;
  retryCount: number;
  retentionPolicy: string;
  capabilities: string[];
  healthMessage: string | null;
  lastHealthAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderCredentialDoc {
  _id: string;
  providerId: string;
  keyName: string;
  ciphertext: string;
  iv: string;
  alg: string;
  authTag: string | null;
  active: boolean;
  createdAt: Date;
}

export interface ProviderHealthDoc {
  _id: string;
  providerId: string;
  checkedAt: Date;
  available: boolean;
  latencyMs: number | null;
  successRateBp: number;
  errorRateBp: number;
  message: string | null;
}

export interface ModelDoc {
  _id: string;
  slug: string;
  name: string;
  description: string;
  providerId: string | null;
  isFree: boolean;
  contextWindow: number;
  maxOutputTokens: number;
  rank: number;
  popularity: number;
  rating: number;
  benchmarks: Record<string, number>;
  metadata: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/** 1:1 with models — `_id` is the modelId. */
export interface ModelPricingDoc {
  _id: string;
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion: number | null;
  currency: string;
}

/** 1:1 with models — `_id` is the modelId. */
export interface ModelCapabilitiesDoc {
  _id: string;
  modalities: string[];
  streaming: boolean;
  toolCalls: boolean;
  structuredOutputs: boolean;
  reasoning: boolean;
  vision: boolean;
  imageGeneration: boolean;
  audio: boolean;
  jsonMode: boolean;
}

export interface ModelProviderDoc {
  _id: string;
  modelId: string;
  providerId: string;
  providerModelId: string;
  priority: number;
  status: string;
  createdAt: Date;
}

/** 1:1 with models — `_id` is the modelId. */
export interface ModelLimitsDoc {
  _id: string;
  perMinute: number;
  perHour: number;
  perDay: number;
  concurrency: number;
  queuePriority: number;
}

export interface RoutingRuleDoc {
  _id: string;
  name: string;
  priority: number;
  conditions: Record<string, unknown>;
  action: Record<string, unknown>;
  active: boolean;
  createdAt: Date;
}

/** `_id` is the settings key. */
export interface SystemSettingDoc {
  _id: string;
  value: unknown;
  description: string;
  updatedAt: Date;
}

/** `_id` is the flag key. */
export interface FeatureFlagDoc {
  _id: string;
  enabled: boolean;
  description: string;
  updatedAt: Date;
}

export interface AuditLogDoc {
  _id: string;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  createdAt: Date;
}

export interface NotificationDoc {
  _id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPrefDoc {
  _id: string;
  userId: string;
  type: string;
  email: boolean;
  inApp: boolean;
}

export interface IncidentDoc {
  _id: string;
  service: string;
  providerId: string | null;
  severity: string;
  status: string;
  title: string;
  body: string;
  startedAt: Date;
  resolvedAt: Date | null;
}

export interface EmailLogDoc {
  _id: string;
  userId: string | null;
  toEmail: string;
  template: string;
  subject: string;
  status: string;
  error: string | null;
  metadata: Record<string, unknown>;
  sentAt: Date;
}

export type RequestStatus = "success" | "error" | "rate_limited" | "blocked" | "queued";

export interface RequestDoc {
  _id: string;
  userId: string;
  apiKeyId: string | null;
  modelId: string | null;
  providerId: string | null;
  status: RequestStatus;
  httpStatus: number;
  route: string;
  latencyMs: number | null;
  ttftMs: number | null;
  queueWaitMs: number | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costPaise: number;
  streaming: boolean;
  isFree: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  ip: string | null;
  createdAt: Date;
}

export interface RequestAttemptDoc {
  _id: string;
  requestId: string;
  providerId: string | null;
  modelLinkId: string | null;
  attempt: number;
  status: string;
  httpStatus: number | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: Date;
}

export interface FreeUsageDoc {
  _id: string;
  userId: string;
  bucketKey: string;
  count: number;
  updatedAt: Date;
}

export interface ConversationDoc {
  _id: string;
  userId: string;
  title: string;
  modelSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDoc {
  _id: string;
  conversationId: string;
  role: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  costPaise: number;
  requestId: string | null;
  createdAt: Date;
}

export interface AstraCampaignDoc {
  _id: string;
  slug: string;
  name: string;
  originalPricePaise: number;
  discountPercent: number;
  promoPricePaise: number;
  trialDays: number;
  allowMultiRedeem: boolean;
  maxRedemptionsPerCode: number | null;
  startsAt: Date;
  endsAt: Date | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type GiftCodeStatus = "active" | "suspended" | "revoked";

export interface GiftCodeDoc {
  _id: string;
  campaignId: string;
  code: string;
  ownerUserId: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  status: GiftCodeStatus;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface GiftCodeRedemptionDoc {
  _id: string;
  campaignId: string;
  codeId: string;
  redeemerUserId: string;
  redeemedAt: Date;
}

export interface AstraEntitlementDoc {
  _id: string;
  userId: string;
  campaignId: string;
  sourceCodeId: string | null;
  activatedAt: Date;
  expiresAt: Date;
  status: "active" | "expired" | "revoked";
}

/**
 * Product-analytics event log (new tracking feature). Flexible payload per
 * event type; indexed by user/type/time for dashboard rollups.
 */
export interface EventLogDoc {
  _id: string;
  type: string;
  userId: string | null;
  apiKeyId: string | null;
  requestId: string | null;
  sessionId: string | null;
  path: string | null;
  userAgent: string | null;
  ip: string | null;
  value: number | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}
