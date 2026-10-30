var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// apps/api/src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";

// packages/shared/src/money.ts
var MINOR_UNITS = { INR: 100, USD: 100 };
function toMajor(minor, currency = "INR") {
  return minor / MINOR_UNITS[currency];
}
function formatMoney(minor, currency = "INR", opts = {}) {
  const symbol = currency === "INR" ? "\u20B9" : "$";
  const major = toMajor(minor, currency);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2
  }).format(major);
  return `${symbol}${formatted}`;
}
function tokenCost(tokens, pricePerMillionMinor) {
  if (tokens <= 0 || pricePerMillionMinor <= 0) return 0;
  return Math.ceil(tokens * pricePerMillionMinor / 1e6);
}
function requestCost(params) {
  const base = tokenCost(params.inputTokens, params.inputPricePerMillion) + tokenCost(params.outputTokens, params.outputPricePerMillion);
  const feePercent = params.platformFeePercent ?? 0;
  if (feePercent <= 0) return base;
  return base + Math.ceil(base * feePercent / 100);
}
function usdCentsToPaise(usdCents, usdToInrRate) {
  if (usdCents <= 0) return 0;
  return Math.ceil(usdCents * usdToInrRate);
}

// packages/shared/src/errors.ts
var ERROR_STATUS = {
  invalid_request: 400,
  unauthenticated: 401,
  invalid_api_key: 401,
  forbidden: 403,
  not_found: 404,
  model_not_found: 404,
  provider_unavailable: 503,
  insufficient_balance: 402,
  rate_limit_exceeded: 429,
  free_quota_exceeded: 429,
  queue_unavailable: 503,
  astra_entitlement_required: 403,
  campaign_inactive: 403,
  invalid_code: 404,
  code_expired: 410,
  self_redemption_not_allowed: 403,
  already_redeemed: 409,
  not_eligible: 403,
  provider_error: 502,
  provider_timeout: 504,
  upstream_error: 502,
  payload_too_large: 413,
  method_not_allowed: 405,
  internal_error: 500
};
var ApiError = class extends Error {
  code;
  status;
  details;
  retryAfter;
  constructor(code, message, opts = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = opts.details;
    this.retryAfter = opts.retryAfter;
  }
  toBody(requestId) {
    return {
      error: {
        code: this.code,
        message: this.message,
        request_id: requestId,
        ...this.details !== void 0 ? { details: this.details } : {}
      }
    };
  }
};
function isApiError(e) {
  return e instanceof ApiError;
}

// packages/shared/src/env.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
(function loadRootEnv() {
  try {
    const here = fileURLToPath(new URL(".", import.meta.url));
    const root = path.resolve(here, "../../..");
    const candidates = [path.join(root, ".env"), path.resolve(process.cwd(), ".env")];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        process.loadEnvFile(file);
        return;
      }
    }
  } catch {
  }
})();
function num(name, fallback) {
  const raw = process.env[name];
  if (raw === void 0 || raw === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}
function str(name, fallback = "") {
  const raw = process.env[name];
  return raw === void 0 || raw === "" ? fallback : raw;
}
var env = {
  nodeEnv: str("NODE_ENV", "development"),
  isProd: str("NODE_ENV", "development") === "production",
  apiPort: num("PORT", num("API_PORT", 4e3)),
  webPort: num("WEB_PORT", 3e3),
  apiBaseUrl: str("API_BASE_URL", "http://localhost:4000"),
  webBaseUrl: str("WEB_BASE_URL", "http://localhost:3000"),
  publicApiBaseUrl: str("PUBLIC_API_BASE_URL", "http://localhost:4000"),
  databaseUrl: str("DATABASE_URL"),
  databaseDir: str("DATABASE_DIR", ".data/db"),
  redisUrl: str("REDIS_URL"),
  /**
   * MongoDB (primary data store when set). PGlite/Postgres remains the
   * fallback: with MONGODB_URI empty (or unreachable at boot) the app runs
   * entirely on the embedded database.
   */
  mongoUri: str("MONGODB_URI"),
  mongoDb: str("MONGODB_DB", "prorouter"),
  authSecret: str("AUTH_SECRET", "dev-secret-change-me"),
  sessionTtlHours: num("SESSION_TTL_HOURS", 720),
  encryptionKey: str("ENCRYPTION_KEY"),
  razorpayKeyId: str("RAZORPAY_KEY_ID"),
  razorpayKeySecret: str("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: str("RAZORPAY_WEBHOOK_SECRET"),
  stripeSecretKey: str("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: str("STRIPE_WEBHOOK_SECRET"),
  openaiApiKey: str("OPENAI_API_KEY"),
  anthropicApiKey: str("ANTHROPIC_API_KEY"),
  googleApiKey: str("GOOGLE_API_KEY"),
  groqApiKey: str("GROQ_API_KEY"),
  mistralApiKey: str("MISTRAL_API_KEY"),
  /** Server-only credential for the ProRouter gateway upstream. Never exposed to the web app. */
  proRouterGatewayBaseUrl: str("PROVIDER_PROROUTER_GATEWAY_BASE_URL", "https://api.tokenjuice.ai/v1"),
  proRouterGatewayApiKey: str("PROVIDER_PROROUTER_GATEWAY_API_KEY"),
  emailApiKey: str("EMAIL_API_KEY"),
  emailFrom: str("EMAIL_FROM", "noreply@prorouter.com"),
  sentryDsn: str("SENTRY_DSN"),
  logLevel: str("LOG_LEVEL", "info"),
  adminEmail: str("ADMIN_EMAIL"),
  adminPassword: str("ADMIN_PASSWORD")
};

// packages/shared/src/password.ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
var SCRYPT_N = 16384;
var SCRYPT_R = 8;
var SCRYPT_P = 1;
var KEYLEN = 64;
function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = await scryptAsync(password, salt);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
function isStrongPassword(pw) {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}

// packages/shared/src/crypto.ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes as randomBytes2,
  timingSafeEqual as timingSafeEqual2
} from "node:crypto";
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function generateApiKey() {
  const raw = randomBytes2(24).toString("base64url");
  const key = `pro_sk_live_${raw}`;
  const prefix = key.slice(0, 16);
  return { key, prefix, hash: hashToken(key) };
}
function generateSessionToken() {
  const token = randomBytes2(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
function getKey() {
  const material = env.encryptionKey || env.authSecret;
  if (!env.encryptionKey && env.isProd) {
    throw new Error("ENCRYPTION_KEY must be set in production");
  }
  return createHash("sha256").update(material).digest();
}
function encryptSecret(plain) {
  const iv = randomBytes2(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64")
  };
}
function decryptSecret(ciphertext, iv, authTag) {
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
}
function randomCode(length = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes2(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// packages/shared/src/persona.ts
function resolveModelPersona(modelName, modelSlug) {
  const norm = `${modelName} ${modelSlug}`.toLowerCase();
  if (norm.includes("kimi")) {
    const isCode = norm.includes("code") || norm.includes("k2.7");
    const displayName = isCode ? "Kimi K2.7 Code" : "Kimi K3";
    return {
      displayName,
      creator: "Moonshot AI (\u5317\u4EAC\u6708\u4E4B\u6697\u9762\u79D1\u6280\u6709\u9650\u516C\u53F8)",
      family: "kimi",
      customGuidelines: "You are Kimi (\u6708\u4E4B\u6697\u9762 Kimi), created and trained by Moonshot AI. If asked who you are, what model you are, or who made you, in English or Chinese, state clearly that you are Kimi created by Moonshot AI."
    };
  }
  if (norm.includes("claude")) {
    let displayName = "Claude";
    if (norm.includes("opus-5") || norm.includes("opus 5")) displayName = "Claude Opus 5";
    else if (norm.includes("opus")) displayName = "Claude Opus";
    else if (norm.includes("sonnet")) displayName = "Claude Sonnet";
    return {
      displayName,
      creator: "Anthropic",
      family: "claude",
      customGuidelines: `You are ${displayName}, an AI assistant created and trained by Anthropic. If asked who you are or who made you, identify yourself as ${displayName} created by Anthropic.`
    };
  }
  if (norm.includes("gemini")) {
    return {
      displayName: "Gemini Pro",
      creator: "Google",
      family: "gemini",
      customGuidelines: "You are Gemini, a large language model built by Google. If asked who you are or who made you, identify yourself as Gemini built by Google."
    };
  }
  if (norm.includes("grok")) {
    return {
      displayName: "Grok",
      creator: "xAI",
      family: "grok",
      customGuidelines: "You are Grok, an AI created by xAI. You have a witty, insightful, and truthful personality. If asked who made you, state you were created by xAI."
    };
  }
  if (norm.includes("qwen")) {
    const isCoder = norm.includes("coder");
    const displayName = isCoder ? "Qwen3-Coder-Next" : "Qwen3.8-27B";
    return {
      displayName,
      creator: "Alibaba Cloud (\u963F\u91CC\u4E91)",
      family: "qwen",
      customGuidelines: `You are \u901A\u4E49\u5343\u95EE (Qwen), specifically ${displayName}, developed by Alibaba Cloud (\u963F\u91CC\u4E91). If asked, identify yourself as Qwen developed by Alibaba Cloud.`
    };
  }
  if (norm.includes("glm") || norm.includes("chatglm")) {
    const isFlash = norm.includes("flash");
    const displayName = isFlash ? "GLM-5.3-Flash" : "GLM-5.3";
    return {
      displayName,
      creator: "Zhipu AI (\u667A\u8C31AI)",
      family: "glm",
      customGuidelines: `You are \u667A\u8C31\u6E05\u8A00 (GLM), specifically ${displayName}, developed by Zhipu AI (\u667A\u8C31AI). If asked, identify yourself as GLM developed by Zhipu AI.`
    };
  }
  if (norm.includes("minimax") || norm.includes("hailuo") || norm.includes("conch")) {
    return {
      displayName: "MiniMax M3.1 Flash",
      creator: "MiniMax",
      family: "minimax",
      customGuidelines: "You are MiniMax (\u6D77\u87BAAI / MiniMax M3.1 Flash), developed by MiniMax. If asked, identify yourself as an AI assistant developed by MiniMax."
    };
  }
  if (norm.includes("mimo")) {
    const isPro = norm.includes("pro");
    const displayName = isPro ? "MiMo-V2.6-Pro" : "MiMo-V2.6-Flash";
    return {
      displayName,
      creator: "Xiaomi (\u5C0F\u7C73)",
      family: "mimo",
      customGuidelines: `You are MiMo (\u5C0F\u7C73 MiMo), specifically ${displayName}, an AI assistant developed by Xiaomi (\u5C0F\u7C73). If asked, identify yourself as MiMo developed by Xiaomi.`
    };
  }
  if (norm.includes("devstral") || norm.includes("mistral")) {
    const isDev = norm.includes("devstral");
    const displayName = isDev ? "Devstral 24B" : "Mistral Large";
    return {
      displayName,
      creator: "Mistral AI",
      family: "mistral",
      customGuidelines: `You are ${displayName}, developed by Mistral AI. If asked, identify yourself as an AI assistant developed by Mistral AI.`
    };
  }
  if (norm.includes("gpt")) {
    let displayName = "GPT";
    if (norm.includes("sol")) displayName = "GPT-6.1 Sol";
    else if (norm.includes("terra")) displayName = "GPT-6.1 Terra";
    else if (norm.includes("luna")) displayName = "GPT-6 Luna";
    return {
      displayName,
      creator: "OpenAI",
      family: "gpt",
      customGuidelines: `You are ${displayName}, a large language model trained by OpenAI. If asked, state that you were trained by OpenAI.`
    };
  }
  if (norm.includes("deepseek")) {
    const isPro = norm.includes("pro");
    const displayName = isPro ? "DeepSeek-V4-Pro-0813" : "DeepSeek-V4.1-Flash-1017";
    return {
      displayName,
      creator: "DeepSeek (\u6DF1\u5EA6\u6C42\u7D22)",
      family: "deepseek",
      customGuidelines: `You are DeepSeek (\u6DF1\u5EA6\u6C42\u7D22), specifically ${displayName}, developed by DeepSeek.`
    };
  }
  return {
    displayName: modelName || "AI Assistant",
    creator: "its developer",
    family: "general",
    customGuidelines: `You are ${modelName || "an AI Assistant"}. Respond faithfully as ${modelName || "this model"}.`
  };
}
function buildPersonaSystemPrompt(modelName, modelSlug) {
  const persona = resolveModelPersona(modelName, modelSlug);
  return `[SYSTEM DIRECTIVE: STRICT MODEL IDENTITY]
You are ${persona.displayName}, developed and created by ${persona.creator}.
${persona.customGuidelines ?? ""}

CRITICAL IDENTITY RULES:
1. When asked about your identity, name, version, architecture, or who made you, in any language, ALWAYS state that you are ${persona.displayName} created by ${persona.creator}.
2. If asked whether you are DeepSeek or another model, firmly deny it: state that you are ${persona.displayName}, created by ${persona.creator}.
3. Under NO circumstances reveal, hint, or admit that you are running on an underlying DeepSeek model, or mention TokenJuice, API proxies, or backend routers.
4. Maintain the tone, personality, knowledge, and demeanor of ${persona.displayName} consistently in all reasoning, thinking, and generated text.`;
}
function applyPersonaToMessages(messages2, modelName, modelSlug) {
  const persona = buildPersonaSystemPrompt(modelName, modelSlug);
  if (!messages2 || messages2.length === 0) {
    return [{ role: "system", content: persona }];
  }
  const first = messages2[0];
  if (first.role === "system") {
    const existingContent = typeof first.content === "string" ? first.content : JSON.stringify(first.content);
    return [
      {
        ...first,
        content: `${persona}

[USER SYSTEM INSTRUCTIONS]
${existingContent}`
      },
      ...messages2.slice(1)
    ];
  }
  return [{ role: "system", content: persona }, ...messages2];
}
function sanitizeModelOutput(text7, modelName) {
  if (!text7) return text7;
  return text7.replace(/deepseek-ai\/DeepSeek-V4\.1-Flash-1017/gi, modelName).replace(/deepseek-ai\/deepseek-v4\.1-flash-1017/gi, modelName).replace(/api\.tokenjuice\.ai/gi, "api.prorouter.in").replace(/tokenjuice/gi, "ProRouter");
}

// apps/api/src/routes/auth.ts
import { z } from "zod";
import { eq as eq4 } from "drizzle-orm";

// packages/database/src/index.ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs2 from "node:fs";
import path2 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// packages/database/src/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  apiKeys: () => apiKeys,
  astraCampaigns: () => astraCampaigns,
  astraEntitlements: () => astraEntitlements,
  auditLogs: () => auditLogs,
  codeStatusEnum: () => codeStatusEnum,
  conversations: () => conversations,
  creditPackages: () => creditPackages,
  emailLog: () => emailLog,
  entitlementStatusEnum: () => entitlementStatusEnum,
  featureFlags: () => featureFlags,
  freeUsage: () => freeUsage,
  giftCodeRedemptions: () => giftCodeRedemptions,
  giftCodes: () => giftCodes,
  incidents: () => incidents,
  linkStatusEnum: () => linkStatusEnum,
  messages: () => messages,
  modelCapabilities: () => modelCapabilities,
  modelLimits: () => modelLimits,
  modelPricing: () => modelPricing,
  modelProviders: () => modelProviders,
  modelStatusEnum: () => modelStatusEnum,
  modelTypeEnum: () => modelTypeEnum,
  models: () => models,
  notificationPrefs: () => notificationPrefs,
  notifications: () => notifications,
  paymentStatusEnum: () => paymentStatusEnum,
  paymentWebhooks: () => paymentWebhooks,
  payments: () => payments,
  plans: () => plans,
  pricingTiers: () => pricingTiers,
  providerCredentials: () => providerCredentials,
  providerHealth: () => providerHealth,
  providerStatusEnum: () => providerStatusEnum,
  providers: () => providers,
  requestAttempts: () => requestAttempts,
  requestStatusEnum: () => requestStatusEnum,
  requests: () => requests,
  routingRules: () => routingRules,
  sessions: () => sessions,
  subscriptionStatusEnum: () => subscriptionStatusEnum,
  subscriptions: () => subscriptions,
  systemSettings: () => systemSettings,
  userRoleEnum: () => userRoleEnum,
  userStatusEnum: () => userStatusEnum,
  users: () => users,
  walletTransactions: () => walletTransactions,
  walletTxTypeEnum: () => walletTxTypeEnum,
  wallets: () => wallets
});

// packages/database/src/schema/auth.ts
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin", "support"]);
var userStatusEnum = pgEnum("user_status", ["active", "suspended", "pending"]);
var users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull().default(""),
    role: userRoleEnum("role").notNull().default("user"),
    status: userStatusEnum("status").notNull().default("active"),
    emailVerified: boolean("email_verified").notNull().default(false),
    metadata: jsonb("metadata").$type().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)]
);
var sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("sessions_token_uq").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expires_idx").on(t.expiresAt)
  ]
);
var apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Default key"),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    spendingLimitPaise: integer("spending_limit_paise"),
    allowedModels: jsonb("allowed_models").$type(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
    requestCount: integer("request_count").notNull().default(0),
    spendPaise: bigint("spend_paise", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("api_keys_hash_uq").on(t.keyHash),
    index("api_keys_user_idx").on(t.userId),
    index("api_keys_prefix_idx").on(t.prefix)
  ]
);

// packages/database/src/schema/catalog.ts
import {
  bigint as bigint2,
  boolean as boolean2,
  index as index2,
  integer as integer2,
  jsonb as jsonb2,
  pgEnum as pgEnum2,
  pgTable as pgTable2,
  text as text2,
  timestamp as timestamp2,
  uniqueIndex as uniqueIndex2,
  uuid as uuid2
} from "drizzle-orm/pg-core";
var providerStatusEnum = pgEnum2("provider_status", ["active", "degraded", "disabled", "unknown"]);
var modelStatusEnum = pgEnum2("model_status", ["active", "coming_soon", "disabled", "archived"]);
var modelTypeEnum = pgEnum2("model_type", ["chat", "completion", "embedding", "image", "audio"]);
var linkStatusEnum = pgEnum2("link_status", ["active", "degraded", "disabled"]);
var providers = pgTable2(
  "providers",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    slug: text2("slug").notNull(),
    name: text2("name").notNull(),
    description: text2("description").notNull().default(""),
    region: text2("region").notNull().default("global"),
    endpointUrl: text2("endpoint_url").notNull(),
    adapterType: text2("adapter_type").notNull().default("openai"),
    status: providerStatusEnum("status").notNull().default("unknown"),
    priority: integer2("priority").notNull().default(100),
    timeoutMs: integer2("timeout_ms").notNull().default(6e4),
    retryCount: integer2("retry_count").notNull().default(2),
    retentionPolicy: text2("retention_policy").notNull().default("zero_retention"),
    capabilities: jsonb2("capabilities").$type().notNull().default([]),
    healthMessage: text2("health_message"),
    lastHealthAt: timestamp2("last_health_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp2("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp2("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex2("providers_slug_uq").on(t.slug)]
);
var providerCredentials = pgTable2(
  "provider_credentials",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    providerId: uuid2("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    keyName: text2("key_name").notNull(),
    ciphertext: text2("ciphertext").notNull(),
    iv: text2("iv").notNull(),
    alg: text2("alg").notNull().default("aes-256-gcm"),
    authTag: text2("auth_tag"),
    active: boolean2("active").notNull().default(true),
    createdAt: timestamp2("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex2("provider_credentials_uq").on(t.providerId, t.keyName)]
);
var providerHealth = pgTable2(
  "provider_health",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    providerId: uuid2("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    checkedAt: timestamp2("checked_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    available: boolean2("available").notNull().default(false),
    latencyMs: integer2("latency_ms"),
    successRateBp: integer2("success_rate_bp").notNull().default(0),
    errorRateBp: integer2("error_rate_bp").notNull().default(1e4),
    message: text2("message")
  },
  (t) => [index2("provider_health_idx").on(t.providerId, t.checkedAt)]
);
var pricingTiers = pgTable2(
  "pricing_tiers",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    slug: text2("slug").notNull(),
    name: text2("name").notNull(),
    description: text2("description").notNull().default(""),
    inputUsdCentsPerMillion: integer2("input_usd_cents_per_million").notNull(),
    outputUsdCentsPerMillion: integer2("output_usd_cents_per_million").notNull(),
    cachedInputUsdCentsPerMillion: integer2("cached_input_usd_cents_per_million"),
    sortOrder: integer2("sort_order").notNull().default(100),
    active: boolean2("active").notNull().default(true),
    createdAt: timestamp2("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp2("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex2("pricing_tiers_slug_uq").on(t.slug)]
);
var models = pgTable2(
  "models",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    slug: text2("slug").notNull(),
    name: text2("name").notNull(),
    description: text2("description").notNull().default(""),
    providerId: uuid2("provider_id").references(() => providers.id, { onDelete: "set null" }),
    type: modelTypeEnum("type").notNull().default("chat"),
    status: modelStatusEnum("status").notNull().default("active"),
    isFree: boolean2("is_free").notNull().default(false),
    pricingTier: text2("pricing_tier"),
    contextWindow: integer2("context_window").notNull().default(128e3),
    maxOutputTokens: integer2("max_output_tokens").notNull().default(8192),
    rank: integer2("rank").notNull().default(100),
    popularity: integer2("popularity").notNull().default(0),
    rating: integer2("rating").notNull().default(0),
    benchmarks: jsonb2("benchmarks").$type().notNull().default({}),
    metadata: jsonb2("metadata").$type().notNull().default({}),
    createdAt: timestamp2("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp2("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex2("models_slug_uq").on(t.slug),
    index2("models_status_idx").on(t.status),
    index2("models_rank_idx").on(t.rank),
    index2("models_pricing_tier_idx").on(t.pricingTier)
  ]
);
var modelPricing = pgTable2(
  "model_pricing",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    modelId: uuid2("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    inputPerMillion: bigint2("input_per_million", { mode: "number" }).notNull().default(0),
    outputPerMillion: bigint2("output_per_million", { mode: "number" }).notNull().default(0),
    cachedInputPerMillion: bigint2("cached_input_per_million", { mode: "number" }),
    currency: text2("currency").notNull().default("INR")
  },
  (t) => [uniqueIndex2("model_pricing_model_uq").on(t.modelId)]
);
var modelCapabilities = pgTable2("model_capabilities", {
  modelId: uuid2("model_id").primaryKey().references(() => models.id, { onDelete: "cascade" }),
  modalities: jsonb2("modalities").$type().notNull().default(["text"]),
  streaming: boolean2("streaming").notNull().default(true),
  toolCalls: boolean2("tool_calls").notNull().default(false),
  structuredOutputs: boolean2("structured_outputs").notNull().default(false),
  reasoning: boolean2("reasoning").notNull().default(false),
  vision: boolean2("vision").notNull().default(false),
  imageGeneration: boolean2("image_generation").notNull().default(false),
  audio: boolean2("audio").notNull().default(false),
  jsonMode: boolean2("json_mode").notNull().default(false)
});
var modelProviders = pgTable2(
  "model_providers",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    modelId: uuid2("model_id").notNull().references(() => models.id, { onDelete: "cascade" }),
    providerId: uuid2("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
    providerModelId: text2("provider_model_id").notNull(),
    priority: integer2("priority").notNull().default(100),
    status: linkStatusEnum("status").notNull().default("active"),
    createdAt: timestamp2("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex2("model_providers_uq").on(t.modelId, t.providerId),
    index2("model_providers_provider_idx").on(t.providerId)
  ]
);
var modelLimits = pgTable2("model_limits", {
  modelId: uuid2("model_id").primaryKey().references(() => models.id, { onDelete: "cascade" }),
  perMinute: integer2("per_minute").notNull().default(1),
  perHour: integer2("per_hour").notNull().default(30),
  perDay: integer2("per_day").notNull().default(200),
  concurrency: integer2("concurrency").notNull().default(1),
  queuePriority: integer2("queue_priority").notNull().default(5)
});
var routingRules = pgTable2(
  "routing_rules",
  {
    id: uuid2("id").primaryKey().defaultRandom(),
    name: text2("name").notNull(),
    priority: integer2("priority").notNull().default(100),
    conditions: jsonb2("conditions").$type().notNull().default({}),
    action: jsonb2("action").$type().notNull().default({}),
    active: boolean2("active").notNull().default(true),
    createdAt: timestamp2("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index2("routing_rules_priority_idx").on(t.priority)]
);

// packages/database/src/schema/billing.ts
import {
  bigint as bigint3,
  boolean as boolean3,
  index as index3,
  integer as integer3,
  jsonb as jsonb3,
  pgEnum as pgEnum3,
  pgTable as pgTable3,
  text as text3,
  timestamp as timestamp3,
  uniqueIndex as uniqueIndex3,
  uuid as uuid3
} from "drizzle-orm/pg-core";
var walletTxTypeEnum = pgEnum3("wallet_tx_type", [
  "topup",
  "refund",
  "promotional",
  "gift",
  "usage",
  "adjustment"
]);
var paymentStatusEnum = pgEnum3("payment_status", [
  "created",
  "authorized",
  "captured",
  "failed",
  "refunded"
]);
var subscriptionStatusEnum = pgEnum3("subscription_status", ["active", "expired", "cancelled"]);
var wallets = pgTable3("wallets", {
  userId: uuid3("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  balancePaise: bigint3("balance_paise", { mode: "number" }).notNull().default(0),
  currency: text3("currency").notNull().default("INR"),
  updatedAt: timestamp3("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});
var walletTransactions = pgTable3(
  "wallet_transactions",
  {
    id: uuid3("id").primaryKey().defaultRandom(),
    userId: uuid3("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: walletTxTypeEnum("type").notNull(),
    amountPaise: bigint3("amount_paise", { mode: "number" }).notNull(),
    balanceAfterPaise: bigint3("balance_after_paise", { mode: "number" }).notNull(),
    currency: text3("currency").notNull().default("INR"),
    reference: text3("reference"),
    idempotencyKey: text3("idempotency_key"),
    metadata: jsonb3("metadata").$type().notNull().default({}),
    createdAt: timestamp3("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    index3("wallet_tx_user_idx").on(t.userId, t.createdAt),
    uniqueIndex3("wallet_tx_idem_uq").on(t.idempotencyKey)
  ]
);
var creditPackages = pgTable3(
  "credit_packages",
  {
    id: uuid3("id").primaryKey().defaultRandom(),
    slug: text3("slug").notNull(),
    name: text3("name").notNull(),
    pricePaise: bigint3("price_paise", { mode: "number" }).notNull(),
    bonusPaise: bigint3("bonus_paise", { mode: "number" }).notNull().default(0),
    currency: text3("currency").notNull().default("INR"),
    active: boolean3("active").notNull().default(true),
    sortOrder: integer3("sort_order").notNull().default(100),
    createdAt: timestamp3("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex3("credit_packages_slug_uq").on(t.slug)]
);
var plans = pgTable3(
  "plans",
  {
    id: uuid3("id").primaryKey().defaultRandom(),
    slug: text3("slug").notNull(),
    name: text3("name").notNull(),
    tagline: text3("tagline").notNull().default(""),
    pricePaise: bigint3("price_paise", { mode: "number" }).notNull().default(0),
    currency: text3("currency").notNull().default("INR"),
    period: text3("period").notNull().default("month"),
    freeRpm: integer3("free_rpm").notNull().default(1),
    freeRph: integer3("free_rph").notNull().default(20),
    freeRpd: integer3("free_rpd").notNull().default(100),
    concurrency: integer3("concurrency").notNull().default(1),
    queuePriority: integer3("queue_priority").notNull().default(5),
    features: jsonb3("features").$type().notNull().default([]),
    active: boolean3("active").notNull().default(true),
    sortOrder: integer3("sort_order").notNull().default(100),
    createdAt: timestamp3("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex3("plans_slug_uq").on(t.slug)]
);
var subscriptions = pgTable3(
  "subscriptions",
  {
    id: uuid3("id").primaryKey().defaultRandom(),
    userId: uuid3("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    planId: uuid3("plan_id").notNull().references(() => plans.id),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    startedAt: timestamp3("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp3("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp3("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index3("subscriptions_user_idx").on(t.userId)]
);
var payments = pgTable3(
  "payments",
  {
    id: uuid3("id").primaryKey().defaultRandom(),
    userId: uuid3("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    packageId: uuid3("package_id").references(() => creditPackages.id),
    gateway: text3("gateway").notNull(),
    gatewayOrderId: text3("gateway_order_id"),
    gatewayPaymentId: text3("gateway_payment_id"),
    amountPaise: bigint3("amount_paise", { mode: "number" }).notNull(),
    status: paymentStatusEnum("status").notNull().default("created"),
    idempotencyKey: text3("idempotency_key"),
    invoiceNumber: text3("invoice_number").notNull(),
    creditedAt: timestamp3("credited_at", { withTimezone: true, mode: "date" }),
    metadata: jsonb3("metadata").$type().notNull().default({}),
    createdAt: timestamp3("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp3("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex3("payments_idem_uq").on(t.idempotencyKey),
    uniqueIndex3("payments_invoice_uq").on(t.invoiceNumber),
    index3("payments_user_idx").on(t.userId),
    index3("payments_gateway_order_idx").on(t.gatewayOrderId)
  ]
);
var paymentWebhooks = pgTable3(
  "payment_webhooks",
  {
    id: uuid3("id").primaryKey().defaultRandom(),
    paymentId: uuid3("payment_id").references(() => payments.id),
    eventId: text3("event_id").notNull(),
    gateway: text3("gateway").notNull(),
    payload: jsonb3("payload").$type().notNull(),
    signatureValid: boolean3("signature_valid").notNull().default(false),
    processedAt: timestamp3("processed_at", { withTimezone: true, mode: "date" }),
    error: text3("error"),
    createdAt: timestamp3("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex3("payment_webhooks_event_uq").on(t.eventId)]
);

// packages/database/src/schema/requests.ts
import {
  bigint as bigint4,
  boolean as boolean4,
  index as index4,
  integer as integer4,
  pgEnum as pgEnum4,
  pgTable as pgTable4,
  text as text4,
  timestamp as timestamp4,
  uniqueIndex as uniqueIndex4,
  uuid as uuid4
} from "drizzle-orm/pg-core";
var requestStatusEnum = pgEnum4("request_status", [
  "success",
  "error",
  "rate_limited",
  "blocked",
  "queued"
]);
var requests = pgTable4(
  "requests",
  {
    id: text4("id").primaryKey(),
    userId: uuid4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    apiKeyId: uuid4("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    modelId: uuid4("model_id").references(() => models.id, { onDelete: "set null" }),
    providerId: uuid4("provider_id").references(() => providers.id, { onDelete: "set null" }),
    status: requestStatusEnum("status").notNull(),
    httpStatus: integer4("http_status").notNull().default(200),
    route: text4("route").notNull().default("direct"),
    latencyMs: integer4("latency_ms"),
    ttftMs: integer4("ttft_ms"),
    queueWaitMs: integer4("queue_wait_ms"),
    inputTokens: integer4("input_tokens").notNull().default(0),
    outputTokens: integer4("output_tokens").notNull().default(0),
    totalTokens: integer4("total_tokens").notNull().default(0),
    costPaise: bigint4("cost_paise", { mode: "number" }).notNull().default(0),
    streaming: boolean4("streaming").notNull().default(false),
    isFree: boolean4("is_free").notNull().default(false),
    usageSource: text4("usage_source").notNull().default("upstream"),
    errorCode: text4("error_code"),
    errorMessage: text4("error_message"),
    ip: text4("ip"),
    createdAt: timestamp4("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    index4("requests_user_idx").on(t.userId, t.createdAt),
    index4("requests_model_idx").on(t.modelId, t.createdAt),
    index4("requests_provider_idx").on(t.providerId, t.createdAt),
    index4("requests_apikey_idx").on(t.apiKeyId)
  ]
);
var requestAttempts = pgTable4(
  "request_attempts",
  {
    id: uuid4("id").primaryKey().defaultRandom(),
    requestId: text4("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    providerId: uuid4("provider_id").references(() => providers.id, { onDelete: "set null" }),
    modelLinkId: uuid4("model_link_id").references(() => modelProviders.id, { onDelete: "set null" }),
    attempt: integer4("attempt").notNull().default(1),
    status: text4("status").notNull(),
    httpStatus: integer4("http_status"),
    latencyMs: integer4("latency_ms"),
    error: text4("error"),
    createdAt: timestamp4("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index4("request_attempts_request_idx").on(t.requestId)]
);
var freeUsage = pgTable4(
  "free_usage",
  {
    userId: uuid4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bucketKey: text4("bucket_key").notNull(),
    count: integer4("count").notNull().default(0),
    updatedAt: timestamp4("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex4("free_usage_uq").on(t.userId, t.bucketKey)]
);
var conversations = pgTable4(
  "conversations",
  {
    id: uuid4("id").primaryKey().defaultRandom(),
    userId: uuid4("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text4("title").notNull().default("New chat"),
    modelSlug: text4("model_slug"),
    createdAt: timestamp4("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp4("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index4("conversations_user_idx").on(t.userId, t.updatedAt)]
);
var messages = pgTable4(
  "messages",
  {
    id: uuid4("id").primaryKey().defaultRandom(),
    conversationId: uuid4("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    role: text4("role").notNull(),
    content: text4("content").notNull().default(""),
    inputTokens: integer4("input_tokens").notNull().default(0),
    outputTokens: integer4("output_tokens").notNull().default(0),
    costPaise: bigint4("cost_paise", { mode: "number" }).notNull().default(0),
    requestId: text4("request_id"),
    createdAt: timestamp4("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index4("messages_conversation_idx").on(t.conversationId, t.createdAt)]
);

// packages/database/src/schema/promotions.ts
import {
  bigint as bigint5,
  boolean as boolean5,
  index as index5,
  integer as integer5,
  pgEnum as pgEnum5,
  pgTable as pgTable5,
  text as text5,
  timestamp as timestamp5,
  uniqueIndex as uniqueIndex5,
  uuid as uuid5
} from "drizzle-orm/pg-core";
var codeStatusEnum = pgEnum5("code_status", ["active", "suspended", "revoked"]);
var entitlementStatusEnum = pgEnum5("entitlement_status", ["active", "expired", "revoked"]);
var astraCampaigns = pgTable5(
  "astra_campaigns",
  {
    id: uuid5("id").primaryKey().defaultRandom(),
    slug: text5("slug").notNull(),
    name: text5("name").notNull(),
    originalPricePaise: bigint5("original_price_paise", { mode: "number" }).notNull().default(4e5),
    discountPercent: integer5("discount_percent").notNull().default(80),
    promoPricePaise: bigint5("promo_price_paise", { mode: "number" }).notNull().default(8e4),
    trialDays: integer5("trial_days").notNull().default(7),
    allowMultiRedeem: boolean5("allow_multi_redeem").notNull().default(true),
    maxRedemptionsPerCode: integer5("max_redemptions_per_code"),
    startsAt: timestamp5("starts_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    endsAt: timestamp5("ends_at", { withTimezone: true, mode: "date" }),
    active: boolean5("active").notNull().default(true),
    createdAt: timestamp5("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp5("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [uniqueIndex5("astra_campaigns_slug_uq").on(t.slug)]
);
var giftCodes = pgTable5(
  "gift_codes",
  {
    id: uuid5("id").primaryKey().defaultRandom(),
    campaignId: uuid5("campaign_id").notNull().references(() => astraCampaigns.id, { onDelete: "cascade" }),
    code: text5("code").notNull(),
    ownerUserId: uuid5("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    maxRedemptions: integer5("max_redemptions"),
    redemptionCount: integer5("redemption_count").notNull().default(0),
    status: codeStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp5("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp5("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex5("gift_codes_code_uq").on(t.code),
    index5("gift_codes_owner_idx").on(t.ownerUserId),
    index5("gift_codes_campaign_idx").on(t.campaignId)
  ]
);
var giftCodeRedemptions = pgTable5(
  "gift_code_redemptions",
  {
    id: uuid5("id").primaryKey().defaultRandom(),
    campaignId: uuid5("campaign_id").notNull().references(() => astraCampaigns.id, { onDelete: "cascade" }),
    codeId: uuid5("code_id").notNull().references(() => giftCodes.id, { onDelete: "cascade" }),
    redeemerUserId: uuid5("redeemer_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    redeemedAt: timestamp5("redeemed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex5("redemptions_code_user_uq").on(t.codeId, t.redeemerUserId),
    index5("redemptions_redeemer_idx").on(t.redeemerUserId),
    index5("redemptions_campaign_idx").on(t.campaignId)
  ]
);
var astraEntitlements = pgTable5(
  "astra_entitlements",
  {
    id: uuid5("id").primaryKey().defaultRandom(),
    userId: uuid5("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid5("campaign_id").notNull().references(() => astraCampaigns.id, { onDelete: "cascade" }),
    sourceCodeId: uuid5("source_code_id").references(() => giftCodes.id, { onDelete: "set null" }),
    activatedAt: timestamp5("activated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp5("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    status: entitlementStatusEnum("status").notNull().default("active")
  },
  (t) => [
    index5("astra_entitlements_user_idx").on(t.userId, t.status),
    uniqueIndex5("astra_entitlements_code_user_uq").on(t.sourceCodeId, t.userId)
  ]
);

// packages/database/src/schema/platform.ts
import {
  boolean as boolean6,
  index as index6,
  jsonb as jsonb4,
  pgTable as pgTable6,
  text as text6,
  timestamp as timestamp6,
  uniqueIndex as uniqueIndex6,
  uuid as uuid6
} from "drizzle-orm/pg-core";
var systemSettings = pgTable6("system_settings", {
  key: text6("key").primaryKey(),
  value: jsonb4("value").$type().notNull(),
  description: text6("description").notNull().default(""),
  updatedAt: timestamp6("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});
var featureFlags = pgTable6("feature_flags", {
  key: text6("key").primaryKey(),
  enabled: boolean6("enabled").notNull().default(false),
  description: text6("description").notNull().default(""),
  updatedAt: timestamp6("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
});
var auditLogs = pgTable6(
  "audit_logs",
  {
    id: uuid6("id").primaryKey().defaultRandom(),
    actorUserId: uuid6("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text6("action").notNull(),
    targetType: text6("target_type"),
    targetId: text6("target_id"),
    metadata: jsonb4("metadata").$type().notNull().default({}),
    ip: text6("ip"),
    createdAt: timestamp6("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [
    index6("audit_logs_actor_idx").on(t.actorUserId, t.createdAt),
    index6("audit_logs_action_idx").on(t.action, t.createdAt)
  ]
);
var notifications = pgTable6(
  "notifications",
  {
    id: uuid6("id").primaryKey().defaultRandom(),
    userId: uuid6("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text6("type").notNull(),
    title: text6("title").notNull(),
    body: text6("body").notNull().default(""),
    href: text6("href"),
    readAt: timestamp6("read_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp6("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index6("notifications_user_idx").on(t.userId, t.createdAt)]
);
var notificationPrefs = pgTable6(
  "notification_prefs",
  {
    userId: uuid6("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text6("type").notNull(),
    email: boolean6("email").notNull().default(true),
    inApp: boolean6("in_app").notNull().default(true)
  },
  (t) => [uniqueIndex6("notification_prefs_uq").on(t.userId, t.type)]
);
var incidents = pgTable6(
  "incidents",
  {
    id: uuid6("id").primaryKey().defaultRandom(),
    service: text6("service").notNull(),
    providerId: uuid6("provider_id").references(() => providers.id, { onDelete: "set null" }),
    severity: text6("severity").notNull().default("minor"),
    status: text6("status").notNull().default("investigating"),
    title: text6("title").notNull(),
    body: text6("body").notNull().default(""),
    startedAt: timestamp6("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    resolvedAt: timestamp6("resolved_at", { withTimezone: true, mode: "date" })
  },
  (t) => [index6("incidents_service_idx").on(t.service, t.startedAt)]
);
var emailLog = pgTable6(
  "email_log",
  {
    id: uuid6("id").primaryKey().defaultRandom(),
    userId: uuid6("user_id").references(() => users.id, { onDelete: "set null" }),
    toEmail: text6("to_email").notNull(),
    template: text6("template").notNull(),
    subject: text6("subject").notNull(),
    status: text6("status").notNull().default("sent"),
    error: text6("error"),
    metadata: jsonb4("metadata").$type().notNull().default({}),
    sentAt: timestamp6("sent_at", { withTimezone: true, mode: "date" }).notNull().defaultNow()
  },
  (t) => [index6("email_log_user_idx").on(t.userId, t.sentAt)]
);

// packages/database/src/mongo/client.ts
import { MongoClient } from "mongodb";

// packages/database/src/seed.ts
import { and, eq } from "drizzle-orm";

// packages/database/src/catalog-aliases.ts
var PRICING_TIER_SEEDS = [
  {
    slug: "lite",
    name: "Lite",
    description: "Lowest-cost tier for lightweight aliases and everyday chat.",
    inputUsdCentsPerMillion: 20,
    outputUsdCentsPerMillion: 80,
    cachedInputUsdCentsPerMillion: 10,
    sortOrder: 10
  },
  {
    slug: "flash",
    name: "Flash",
    description: "Fast, low-cost tier for high-volume drafting and extraction.",
    inputUsdCentsPerMillion: 30,
    outputUsdCentsPerMillion: 120,
    cachedInputUsdCentsPerMillion: 15,
    sortOrder: 20
  },
  {
    slug: "standard",
    name: "Standard",
    description: "Balanced tier for general production workloads.",
    inputUsdCentsPerMillion: 50,
    outputUsdCentsPerMillion: 200,
    cachedInputUsdCentsPerMillion: 25,
    sortOrder: 30
  },
  {
    slug: "code",
    name: "Code",
    description: "Tier tuned for coding assistants and repository-aware agents.",
    inputUsdCentsPerMillion: 75,
    outputUsdCentsPerMillion: 300,
    cachedInputUsdCentsPerMillion: 38,
    sortOrder: 40
  },
  {
    slug: "reason",
    name: "Reason",
    description: "Tier for analytical, multi-step reasoning workloads.",
    inputUsdCentsPerMillion: 100,
    outputUsdCentsPerMillion: 400,
    cachedInputUsdCentsPerMillion: 50,
    sortOrder: 50
  },
  {
    slug: "expert",
    name: "Expert",
    description: "Higher-capability tier for demanding professional work.",
    inputUsdCentsPerMillion: 150,
    outputUsdCentsPerMillion: 600,
    cachedInputUsdCentsPerMillion: 75,
    sortOrder: 60
  },
  {
    slug: "ultra",
    name: "Ultra",
    description: "Premium tier for long-running, high-value tasks.",
    inputUsdCentsPerMillion: 200,
    outputUsdCentsPerMillion: 800,
    cachedInputUsdCentsPerMillion: 100,
    sortOrder: 70
  },
  {
    slug: "max",
    name: "Max",
    description: "Top retail tier for maximum-priority alias workloads.",
    inputUsdCentsPerMillion: 300,
    outputUsdCentsPerMillion: 1200,
    cachedInputUsdCentsPerMillion: 150,
    sortOrder: 80
  }
];
var PRO_ALIAS_PROVIDER_SLUG = "prorouter-gateway";
var PRO_ALIAS_UPSTREAM_MODEL_ID = "deepseek-ai/DeepSeek-V4.1-Flash-1017";
var PRO_ALIAS_BACKEND_MODEL = "DeepSeek V4.1 Flash";
var PRO_ALIAS_CONTEXT_WINDOW = 1e6;
var PRO_ALIAS_MAX_OUTPUT_TOKENS = 128e3;
var PRO_ALIAS_FAMILIES = [
  "orion",
  "nova",
  "atlas",
  "vega",
  "lyra",
  "sirius",
  "phoenix",
  "titan",
  "aurora",
  "zephyr",
  "onyx",
  "ember",
  "cobalt",
  "quasar",
  "helix",
  "nimbus",
  "eclipse",
  "apex",
  "vertex",
  "summit",
  "horizon",
  "falcon",
  "comet",
  "meteor",
  "pulsar",
  "nebula",
  "solstice",
  "equinox",
  "zenith",
  "cardinal"
];
var PRO_ALIAS_VARIANTS = [
  { key: "mini", label: "Mini", pricingTier: "lite" },
  { key: "lite", label: "Lite", pricingTier: "lite" },
  { key: "flash", label: "Flash", pricingTier: "flash" },
  { key: "standard", label: "Standard", pricingTier: "standard" },
  { key: "turbo", label: "Turbo", pricingTier: "standard" },
  { key: "code", label: "Code", pricingTier: "code" },
  { key: "reason", label: "Reason", pricingTier: "reason" },
  { key: "expert", label: "Expert", pricingTier: "expert" },
  { key: "ultra", label: "Ultra", pricingTier: "ultra" },
  { key: "max", label: "Max", pricingTier: "max" }
];
function tierName(slug2) {
  return PRICING_TIER_SEEDS.find((tier) => tier.slug === slug2)?.name ?? slug2;
}
function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
var PRO_ALIASES = PRO_ALIAS_FAMILIES.flatMap(
  (family, familyIndex) => PRO_ALIAS_VARIANTS.map((variant, variantIndex) => {
    const index7 = familyIndex * PRO_ALIAS_VARIANTS.length + variantIndex;
    return {
      slug: `pr-${family}-${variant.key}-pro`,
      name: `${titleCase(family)} ${variant.label} Pro`,
      description: `${titleCase(family)} ${variant.label} is a public Pro alias billed at the ${tierName(
        variant.pricingTier
      )} tier. All Pro aliases route to the same ${PRO_ALIAS_BACKEND_MODEL} backend.`,
      provider: PRO_ALIAS_PROVIDER_SLUG,
      upstreamModelId: PRO_ALIAS_UPSTREAM_MODEL_ID,
      pricingTier: variant.pricingTier,
      rank: 100 + index7,
      popularity: 8e3 - index7
    };
  })
);

// packages/database/src/seed.ts
async function seedDatabase(closeAtEnd = false) {
  console.log("[prorouter] Seeding database\u2026");
  await runMigrations();
  const db2 = await getDb();
  async function upsert(table, values, conflictTarget) {
    await db2.insert(table).values(values).onConflictDoNothing({ target: conflictTarget });
  }
  const settings2 = [
    { key: "USD_TO_INR_RATE", value: Number(env.isProd ? 97 : process.env.USD_TO_INR_RATE || 97), description: "INR per 1 USD (admin-configurable)" },
    { key: "PLATFORM_FEE_PERCENT", value: 0, description: "Optional platform fee applied to paid requests" },
    { key: "FREE_REQUESTS_PER_MINUTE", value: 1, description: "Default free-model requests per minute" },
    { key: "FREE_QUEUE_PRIORITY", value: 5, description: "Default queue priority for free-tier requests" },
    { key: "ASTRA_TRIAL_DAYS", value: 7, description: "Days of GPT Astra access granted per redemption" },
    { key: "ASTRA_DISCOUNT_PERCENT", value: 80, description: "Astra campaign discount percentage" },
    { key: "ASTRA_ORIGINAL_PRICE_PAISE", value: 4e5, description: "Astra normal price (paise)" },
    { key: "ASTRA_PROMO_PRICE_PAISE", value: 8e4, description: "Astra promotional price (paise)" },
    { key: "MAX_API_KEYS", value: 20, description: "Maximum API keys per user" },
    { key: "DEFAULT_TIMEOUT_MS", value: 6e4, description: "Default upstream provider timeout" },
    { key: "MAX_RETRIES", value: 2, description: "Default provider retry attempts" },
    { key: "PLATFORM_NAME", value: "ProRouter", description: "Platform display name" },
    { key: "PUBLIC_API_BASE_URL", value: env.publicApiBaseUrl, description: "Public API base URL shown in docs" },
    { key: "BILL_ESTIMATED_USAGE", value: false, description: "Bill requests whose token counts were estimated locally instead of reported upstream" }
  ];
  for (const s of settings2) await upsert(systemSettings, s, systemSettings.key);
  const flags2 = [
    { key: "astra_promotion", enabled: true, description: "Astra 7-day promotion & redeem codes" },
    { key: "image_generation", enabled: false, description: "Image playground endpoints" },
    { key: "public_rankings", enabled: true, description: "Public model rankings page" },
    { key: "auto_router", enabled: true, description: "uno/auto model routing" },
    { key: "provider_fallback", enabled: true, description: "Automatic provider fallback" },
    { key: "referral_system", enabled: true, description: "Personal referral codes" },
    { key: "international_payments", enabled: false, description: "Stripe international payments" }
  ];
  for (const f of flags2) await upsert(featureFlags, f, featureFlags.key);
  const planSeeds = [
    {
      slug: "free",
      name: "Free",
      tagline: "Start building with free models",
      pricePaise: 0,
      freeRpm: 1,
      freeRph: 20,
      freeRpd: 100,
      concurrency: 1,
      queuePriority: 5,
      sortOrder: 10,
      features: ["1 free-model request / minute", "Standard free queue", "Basic API access", "Community support"]
    },
    {
      slug: "boost",
      name: "Boost",
      tagline: "Faster free-model access",
      pricePaise: 199900,
      freeRpm: 5,
      freeRph: 120,
      freeRpd: 1500,
      concurrency: 3,
      queuePriority: 3,
      sortOrder: 20,
      features: ["5 free-model requests / minute", "Faster queue", "Higher concurrency", "Email support"]
    },
    {
      slug: "ultra",
      name: "Ultra",
      tagline: "Priority routing for serious workloads",
      pricePaise: 499900,
      freeRpm: 10,
      freeRph: 300,
      freeRpd: 5e3,
      concurrency: 5,
      queuePriority: 1,
      sortOrder: 30,
      features: ["10 free-model requests / minute", "Priority routing \u2014 no scheduled queue delay", "Highest concurrency", "Premium support"]
    }
  ];
  for (const p of planSeeds) await upsert(plans, { ...p, currency: "INR", period: "month", active: true }, plans.slug);
  const packageSeeds = [
    { slug: "starter", name: "Starter", pricePaise: 49900, bonusPaise: 0, sortOrder: 10 },
    { slug: "builder", name: "Builder", pricePaise: 99900, bonusPaise: 5100, sortOrder: 20 },
    { slug: "pro", name: "Pro", pricePaise: 249900, bonusPaise: 25100, sortOrder: 30 },
    { slug: "power", name: "Power", pricePaise: 499900, bonusPaise: 75100, sortOrder: 40 }
  ];
  for (const p of packageSeeds) await upsert(creditPackages, { ...p, currency: "INR", active: true }, creditPackages.slug);
  for (const tier of PRICING_TIER_SEEDS) {
    await db2.insert(pricingTiers).values({ ...tier, active: true }).onConflictDoNothing({ target: pricingTiers.slug });
  }
  const providerSeeds = [
    {
      slug: "prorouter-gateway",
      name: "ProRouter Gateway",
      endpointUrl: process.env.PROVIDER_PROROUTER_GATEWAY_BASE_URL || "https://api.tokenjuice.ai/v1",
      adapterType: "openai",
      priority: 5,
      region: "global",
      capabilities: ["chat", "tool_calls", "vision", "reasoning"],
      description: "Primary model gateway."
      // internal only — no upstream host/key shown in the UI
    },
    { slug: "openrouter", name: "OpenRouter", endpointUrl: "https://openrouter.ai/api/v1", adapterType: "openai", priority: 10, region: "global", capabilities: ["chat", "tool_calls", "vision"], description: "Aggregated multi-model gateway." },
    { slug: "openai", name: "OpenAI", endpointUrl: "https://api.openai.com/v1", adapterType: "openai", priority: 20, region: "us", capabilities: ["chat", "tool_calls", "vision", "embeddings"], description: "OpenAI platform API." },
    { slug: "groq", name: "Groq", endpointUrl: "https://api.groq.com/openai/v1", adapterType: "openai", priority: 30, region: "us", capabilities: ["chat", "tool_calls"], description: "High-throughput inference." },
    { slug: "mistral", name: "Mistral AI", endpointUrl: "https://api.mistral.ai/v1", adapterType: "openai", priority: 40, region: "eu", capabilities: ["chat", "tool_calls", "vision"], description: "Mistral models, OpenAI-compatible API." },
    { slug: "anthropic", name: "Anthropic", endpointUrl: "https://api.anthropic.com/v1", adapterType: "anthropic", priority: 25, region: "us", capabilities: ["chat", "tool_calls", "vision"], description: "Claude models." },
    { slug: "ollama", name: "Ollama (local)", endpointUrl: "http://localhost:11434/v1", adapterType: "openai", priority: 90, region: "local", capabilities: ["chat"], description: "Local Ollama server (OpenAI-compatible)." },
    { slug: "freemodels", name: "FreeModels", endpointUrl: "https://freemodels-chat.freemodels.workers.dev/v1", adapterType: "freemodels", priority: 15, region: "global", capabilities: ["chat", "reasoning", "vision", "tool_calls"], description: "FreeModels gateway \u2014 free access to frontier chat models." }
  ];
  for (const p of providerSeeds) {
    await upsert(providers, { ...p, status: "unknown" }, providers.slug);
  }
  if (true) {
    await db2.update(providers).set({ endpointUrl: process.env.PROVIDER_PROROUTER_GATEWAY_BASE_URL || "https://api.tokenjuice.ai/v1", status: "active" }).where(eq(providers.slug, "prorouter-gateway"));
  }
  for (const slug2 of ["prorouter-gateway", "freemodels"]) {
    await db2.update(providers).set({ status: "active" }).where(and(eq(providers.slug, slug2), eq(providers.status, "unknown")));
  }
  const envKeyFor = {
    "prorouter-gateway": process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY,
    openrouter: process.env.PROVIDER_OPENROUTER_API_KEY,
    openai: env.openaiApiKey,
    groq: env.groqApiKey,
    mistral: env.mistralApiKey,
    anthropic: env.anthropicApiKey,
    ollama: void 0
  };
  const providerRows = await db2.select().from(providers);
  const providerBySlug = new Map(providerRows.map((p) => [p.slug, p]));
  for (const [slug2, secret] of Object.entries(envKeyFor)) {
    if (!secret) continue;
    const row = providerBySlug.get(slug2);
    if (!row) continue;
    const enc = encryptSecret(secret);
    await db2.insert(providerCredentials).values({ providerId: row.id, keyName: "default", ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag }).onConflictDoUpdate({
      target: [providerCredentials.providerId, providerCredentials.keyName],
      set: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true }
    });
  }
  const catalog = [
    { slug: "deepseek-v4.1-flash-1017", name: "DeepSeek-V4.1-Flash-1017", description: "DeepSeek V4.1 Flash \u2014 state-of-the-art fast reasoning, coding, and multilingual intelligence.", provider: "prorouter-gateway", isFree: true, contextWindow: 262144, maxOutputTokens: 128e3, input: 0, output: 0, rank: 1, popularity: 9900, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", description: "DeepSeek V4.1 Flash \u2014 high-speed reasoning and code synthesis.", provider: "prorouter-gateway", isFree: true, contextWindow: 262144, maxOutputTokens: 128e3, input: 0, output: 0, rank: 2, popularity: 9880, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "qwen3.8-27b", name: "Qwen3.8-27B", description: "Alibaba Qwen3.8 27B \u2014 high-performance open-weight model with strong multilingual and reasoning abilities.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 64e3, input: 0, output: 0, rank: 3, popularity: 9850, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "glm-5.3", name: "GLM-5.3", description: "Zhipu GLM-5.3 \u2014 flagship bilingual reasoning, analytical thinking, and tool execution.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 128e3, input: 0, output: 0, rank: 4, popularity: 9800, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "kimi-k3", name: "Kimi K3", description: "Moonshot Kimi K3 \u2014 ultra long-context frontier model with high-speed reasoning and deep comprehension.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 64e3, input: 0, output: 0, rank: 5, popularity: 9820, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "mimo-v2.6-pro", name: "MiMo-V2.6-Pro", description: "Xiaomi MiMo V2.6 Pro \u2014 flagship multimodal reasoning model for advanced synthesis and coding.", provider: "prorouter-gateway", isFree: true, contextWindow: 1048576, maxOutputTokens: 131072, input: 0, output: 0, rank: 6, popularity: 9750, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "minimax-m3.1-flash", name: "MiniMax M3.1 Flash", description: "MiniMax M3.1 Flash \u2014 fast multimodal model with reliable tool calling and low latency.", provider: "prorouter-gateway", isFree: true, contextWindow: 1e6, maxOutputTokens: 131072, input: 0, output: 0, rank: 7, popularity: 9700, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "qwen3-coder-next", name: "Qwen3-Coder-Next", description: "Alibaba Qwen3 Coder Next \u2014 specialized coding model for repository synthesis and multi-file debugging.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 64e3, input: 0, output: 0, rank: 8, popularity: 9780, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "deepseek-v4-pro-0813", name: "DeepSeek-V4-Pro-0813", description: "DeepSeek V4 Pro \u2014 high-throughput frontier reasoning and deep architectural coding.", provider: "prorouter-gateway", isFree: true, contextWindow: 262144, maxOutputTokens: 128e3, input: 0, output: 0, rank: 9, popularity: 9720, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "kimi-k2.7-code", name: "Kimi K2.7 Code", description: "Moonshot Kimi K2.7 Code \u2014 specialized code intelligence and agentic workflow automation.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 64e3, input: 0, output: 0, rank: 10, popularity: 9680, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "devstral-24b", name: "Devstral 24B", description: "Mistral Devstral 24B \u2014 developer-tuned open weights optimized for software engineering workflows.", provider: "prorouter-gateway", isFree: true, contextWindow: 128e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 11, popularity: 9650, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "claude-sonnet", name: "Claude Sonnet", description: "Anthropic Claude Sonnet \u2014 balanced intelligence, high coding precision, and nuanced creative writing.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 64e3, input: 0, output: 0, rank: 12, popularity: 9950, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "claude-opus", name: "Claude Opus", description: "Anthropic Claude Opus \u2014 deep analysis, nuanced reasoning, and complex task decomposition.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 64e3, input: 0, output: 0, rank: 13, popularity: 9930, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "gemini-pro", name: "Gemini Pro", description: "Google Gemini Pro \u2014 powerful multimodal model with vast context window and world knowledge.", provider: "prorouter-gateway", isFree: true, contextWindow: 1e6, maxOutputTokens: 64e3, input: 0, output: 0, rank: 14, popularity: 9910, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "grok", name: "Grok", description: "xAI Grok \u2014 direct, truthful AI with real-time insight and witty demeanor.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 64e3, input: 0, output: 0, rank: 15, popularity: 9890, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "mistral-large", name: "Mistral Large", description: "Mistral Large \u2014 flagship model for complex multilingual reasoning and precise instruction following.", provider: "prorouter-gateway", isFree: true, contextWindow: 128e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 16, popularity: 9810, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "glm-5.3-flash", name: "GLM-5.3-Flash", description: "Zhipu GLM 5.3 Flash \u2014 fast multilingual reasoning with high-speed tool execution.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 128e3, input: 0, output: 0, rank: 17, popularity: 9790, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "gpt-6.1-sol", name: "GPT-6.1 Sol", description: "OpenAI GPT-6.1 Sol \u2014 frontier cloud model optimized for high-speed reasoning and synthesis.", provider: "prorouter-gateway", isFree: true, contextWindow: 256e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 18, popularity: 9970, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "gpt-6.1-terra", name: "GPT-6.1 Terra", description: "OpenAI GPT-6.1 Terra \u2014 flagship multimodal intelligence with deep scientific knowledge.", provider: "prorouter-gateway", isFree: true, contextWindow: 256e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 19, popularity: 9960, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "claude-opus-5", name: "Claude Opus 5", description: "Anthropic Claude Opus 5 \u2014 next-generation frontier intelligence for research and coding.", provider: "prorouter-gateway", isFree: true, contextWindow: 25e4, maxOutputTokens: 64e3, input: 0, output: 0, rank: 20, popularity: 9990, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "mimo-v2.6-flash", name: "MiMo-V2.6-Flash", description: "Xiaomi MiMo Flash \u2014 quick responses with solid reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 1048576, maxOutputTokens: 131072, input: 0, output: 0, rank: 21, popularity: 9760, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "gpt-6-luna", name: "GPT-6 Luna", description: "OpenAI GPT-6 Luna \u2014 low-latency next-gen assistant for rapid task execution.", provider: "prorouter-gateway", isFree: true, contextWindow: 256e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 22, popularity: 9940, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "beam", name: "Beam", description: "Fast general-purpose model for everyday chat and drafting.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 64e3, input: 0, output: 0, rank: 23, popularity: 9050, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "nemotron-3.5-super-vl", name: "Nemotron 3.5 Super VL", description: "NVIDIA Nemotron 3.5 Super \u2014 high-capacity vision-language reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 128e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 24, popularity: 8800, reasoning: true, vision: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "nemotron-3.5-lightning", name: "Nemotron 3.5 Lightning", description: "NVIDIA Nemotron 3.5 Lightning \u2014 low-latency assistant for high-volume work.", provider: "prorouter-gateway", isFree: true, contextWindow: 128e3, maxOutputTokens: 64e3, input: 0, output: 0, rank: 25, popularity: 8700, reasoning: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "longcat-2.5-preview", name: "LongCat 2.5 Preview", description: "Meituan LongCat 2.5 \u2014 long-context preview with strong multilingual reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 2e5, maxOutputTokens: 64e3, input: 0, output: 0, rank: 26, popularity: 8600, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } },
    { slug: "jev-1.13", name: "Jev 1.13", description: "Jev 1.13 \u2014 general-purpose assistant with balanced speed and quality.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 32768, input: 0, output: 0, rank: 27, popularity: 8200, reasoning: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1e3 } }
  ];
  for (const m of catalog) {
    const providerRow = providerBySlug.get(m.provider);
    const [inserted] = await db2.insert(models).values({
      slug: m.slug,
      name: m.name,
      description: m.description,
      providerId: providerRow?.id ?? null,
      type: "chat",
      status: m.status ?? "active",
      isFree: m.isFree,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      rank: m.rank,
      popularity: m.popularity,
      rating: Math.max(0, 100 - m.rank * 3)
    }).onConflictDoNothing({ target: models.slug }).returning();
    const existing = inserted ?? (await db2.select().from(models).where(eq(models.slug, m.slug)))[0];
    if (!existing) continue;
    await db2.insert(modelPricing).values({
      modelId: existing.id,
      inputPerMillion: m.input,
      outputPerMillion: m.output,
      cachedInputPerMillion: m.isFree ? 0 : Math.round(m.input / 2),
      currency: "INR"
    }).onConflictDoNothing({ target: modelPricing.modelId });
    await db2.insert(modelCapabilities).values({
      modelId: existing.id,
      modalities: m.vision ? ["text", "image"] : ["text"],
      streaming: true,
      toolCalls: m.toolCalls ?? false,
      structuredOutputs: m.structured ?? false,
      reasoning: m.reasoning ?? false,
      vision: m.vision ?? false,
      imageGeneration: false,
      audio: false,
      jsonMode: true
    }).onConflictDoNothing({ target: modelCapabilities.modelId });
    if (m.isFree) {
      await db2.insert(modelLimits).values({
        modelId: existing.id,
        perMinute: m.freeLimits?.perMinute ?? 1,
        perHour: m.freeLimits?.perHour ?? 30,
        perDay: m.freeLimits?.perDay ?? 200,
        concurrency: 1,
        queuePriority: 5
      }).onConflictDoNothing({ target: modelLimits.modelId });
    }
    for (const link of m.links) {
      const linkProvider = providerBySlug.get(link.provider);
      if (!linkProvider) continue;
      await db2.insert(modelProviders).values({
        modelId: existing.id,
        providerId: linkProvider.id,
        providerModelId: link.providerModelId,
        priority: link.priority ?? 100,
        status: "active"
      }).onConflictDoUpdate({
        target: [modelProviders.modelId, modelProviders.providerId],
        set: { providerModelId: link.providerModelId, priority: link.priority ?? 100, status: "active" }
      });
    }
  }
  const aliasProvider = providerBySlug.get(PRO_ALIAS_PROVIDER_SLUG);
  if (!aliasProvider) {
    console.warn(`[prorouter] Provider '${PRO_ALIAS_PROVIDER_SLUG}' missing \u2014 skipping Pro aliases.`);
  } else {
    for (const alias of PRO_ALIASES) {
      const [inserted] = await db2.insert(models).values({
        slug: alias.slug,
        name: alias.name,
        description: alias.description,
        providerId: aliasProvider.id,
        type: "chat",
        status: "active",
        isFree: false,
        pricingTier: alias.pricingTier,
        contextWindow: PRO_ALIAS_CONTEXT_WINDOW,
        maxOutputTokens: PRO_ALIAS_MAX_OUTPUT_TOKENS,
        rank: alias.rank,
        popularity: alias.popularity,
        rating: 85
      }).onConflictDoNothing({ target: models.slug }).returning();
      const existing = inserted ?? (await db2.select().from(models).where(eq(models.slug, alias.slug)))[0];
      if (!existing) continue;
      await db2.insert(modelCapabilities).values({
        modelId: existing.id,
        modalities: ["text", "image"],
        streaming: true,
        toolCalls: true,
        structuredOutputs: true,
        reasoning: true,
        vision: true,
        imageGeneration: false,
        audio: false,
        jsonMode: true
      }).onConflictDoNothing({ target: modelCapabilities.modelId });
      await db2.insert(modelProviders).values({
        modelId: existing.id,
        providerId: aliasProvider.id,
        providerModelId: alias.upstreamModelId || PRO_ALIAS_UPSTREAM_MODEL_ID,
        priority: 10,
        status: "active"
      }).onConflictDoNothing({ target: [modelProviders.modelId, modelProviders.providerId] });
    }
    console.log(`[prorouter] Pro alias series ready: ${PRO_ALIASES.length} models.`);
  }
  await db2.insert(astraCampaigns).values({
    slug: "astra-7day-launch",
    name: "Astra 7-Day Access",
    originalPricePaise: Number(env.isProd ? 4e5 : process.env.ASTRA_ORIGINAL_PRICE_PAISE || 4e5),
    discountPercent: Number(process.env.ASTRA_DISCOUNT_PERCENT || 80),
    promoPricePaise: Number(process.env.ASTRA_PROMO_PRICE_PAISE || 8e4),
    trialDays: Number(process.env.ASTRA_TRIAL_DAYS || 7),
    allowMultiRedeem: true,
    active: true
  }).onConflictDoNothing({ target: astraCampaigns.slug });
  if (env.adminEmail && env.adminPassword) {
    const existingAdmin = await db2.select().from(users).where(eq(users.email, env.adminEmail.toLowerCase()));
    if (existingAdmin.length === 0) {
      const [admin] = await db2.insert(users).values({
        email: env.adminEmail.toLowerCase(),
        passwordHash: await hashPassword(env.adminPassword),
        name: "Administrator",
        role: "admin",
        emailVerified: true
      }).returning();
      await db2.insert(wallets).values({ userId: admin.id, balancePaise: 0 }).onConflictDoNothing();
      console.log(`[prorouter] Seeded admin account: ${env.adminEmail}`);
    }
  } else {
    console.log("[prorouter] ADMIN_EMAIL/ADMIN_PASSWORD not set \u2014 skipping admin seed.");
  }
  console.log("[prorouter] Seed complete.");
  if (closeAtEnd) await closeDb();
}
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  void seedDatabase(true).catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}

// packages/database/src/index.ts
var moduleDir = fileURLToPath2(new URL("./", import.meta.url));
var repoRoot = (() => {
  if (fs2.existsSync(path2.join(process.cwd(), "packages", "database"))) {
    return process.cwd();
  }
  const candidate = path2.resolve(moduleDir, "../../..");
  if (fs2.existsSync(path2.join(candidate, "packages", "database"))) {
    return candidate;
  }
  return process.cwd();
})();
var db = null;
var pglite = null;
var pool = null;
async function getDb() {
  if (db) return db;
  if (env.databaseUrl) {
    pool = new Pool({ connectionString: env.databaseUrl, max: 10 });
    db = drizzleNode(pool, { schema: schema_exports });
  } else {
    const dir = path2.isAbsolute(env.databaseDir) ? env.databaseDir : path2.join(repoRoot, env.databaseDir);
    fs2.mkdirSync(dir, { recursive: true });
    pglite = new PGlite(dir);
    db = drizzlePglite(pglite, { schema: schema_exports });
  }
  return db;
}
async function closeDb() {
  if (pglite) await pglite.close();
  if (pool) await pool.end();
  db = null;
  pglite = null;
  pool = null;
}
async function runMigrations() {
  const database = await getDb();
  const migrationsFolder = path2.join(repoRoot, "packages", "database", "migrations");
  if (env.databaseUrl) {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(database, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(database, { migrationsFolder });
  }
}

// apps/api/src/lib/auth.ts
import { and as and2, eq as eq2, gt } from "drizzle-orm";
var SESSION_COOKIE = "uno_session";
async function createSession(user, reply, ip, userAgent) {
  const { token, hash } = generateSessionToken();
  const db2 = await getDb();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 36e5);
  await db2.insert(sessions).values({ userId: user.id, tokenHash: hash, expiresAt, ip, userAgent });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    expires: expiresAt
  });
  return token;
}
async function destroySession(request, reply) {
  const token = request.cookies[SESSION_COOKIE];
  if (token) {
    const db2 = await getDb();
    await db2.delete(sessions).where(eq2(sessions.tokenHash, hashToken(token)));
  }
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}
async function resolveSessionUser(request) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;
  const db2 = await getDb();
  const rows = await db2.select({ session: sessions, user: users }).from(sessions).innerJoin(users, eq2(sessions.userId, users.id)).where(and2(eq2(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, /* @__PURE__ */ new Date())));
  const row = rows[0];
  if (!row) return null;
  if (row.user.status === "suspended") return null;
  if (Date.now() - row.session.lastSeenAt.getTime() > 6e4) {
    void db2.update(sessions).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq2(sessions.id, row.session.id));
  }
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.user.role,
    status: row.user.status
  };
}
async function resolveApiKey(request) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const raw = header.slice(7).trim();
  if (!raw) return null;
  const db2 = await getDb();
  const rows = await db2.select({ key: apiKeys, user: users }).from(apiKeys).innerJoin(users, eq2(apiKeys.userId, users.id)).where(eq2(apiKeys.keyHash, hashToken(raw)));
  const row = rows[0];
  if (!row) throw new ApiError("invalid_api_key", "Invalid API key provided.");
  if (row.key.revokedAt) throw new ApiError("invalid_api_key", "This API key has been revoked.");
  if (row.key.expiresAt && row.key.expiresAt < /* @__PURE__ */ new Date()) throw new ApiError("invalid_api_key", "This API key has expired.");
  if (row.user.status === "suspended") throw new ApiError("forbidden", "Account suspended. Contact support.");
  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      status: row.user.status
    },
    apiKey: row.key
  };
}
async function requireUser(request) {
  const fromKey = await resolveApiKey(request).catch(() => null);
  if (fromKey) return fromKey.user;
  const user = await resolveSessionUser(request);
  if (!user) throw new ApiError("unauthenticated", "You must be signed in.");
  return user;
}
async function requireRole(request, roles) {
  const user = await requireUser(request);
  if (!roles.includes(user.role)) {
    throw new ApiError("forbidden", "Administrator access required.");
  }
  return user;
}
async function getActiveAstra(userId) {
  const db2 = await getDb();
  const rows = await db2.select().from(astraEntitlements).where(and2(eq2(astraEntitlements.userId, userId), eq2(astraEntitlements.status, "active"), gt(astraEntitlements.expiresAt, /* @__PURE__ */ new Date())));
  const row = rows[0];
  return row ? { expiresAt: row.expiresAt } : null;
}

// apps/api/src/lib/ratelimit.ts
var buckets = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (b.timestamps.length === 0 || now - b.timestamps[b.timestamps.length - 1] > 36e5) {
      buckets.delete(key);
    }
  }
}, 6e4).unref?.();
function checkRateLimit(key, limit, windowSeconds) {
  if (limit <= 0) return { allowed: false, remaining: 0, retryAfterSec: windowSeconds };
  const now = Date.now();
  const windowMs = windowSeconds * 1e3;
  const fullKey = `${key}:${windowSeconds}`;
  let bucket = buckets.get(fullKey);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(fullKey, bucket);
  }
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    const oldest = bucket.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1e3));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length, retryAfterSec: 0 };
}

// apps/api/src/lib/wallet.ts
import { eq as eq3, sql } from "drizzle-orm";
async function ensureWallet(tx, userId) {
  await tx.insert(wallets).values({ userId, balancePaise: 0 }).onConflictDoNothing({ target: wallets.userId });
}
async function creditWallet(params) {
  if (params.amountPaise <= 0) throw new ApiError("invalid_request", "Credit amount must be positive");
  const db2 = await getDb();
  return db2.transaction(async (tx) => {
    if (params.idempotencyKey) {
      const existing = await tx.select().from(walletTransactions).where(eq3(walletTransactions.idempotencyKey, params.idempotencyKey));
      if (existing.length > 0) {
        const w = await tx.select().from(wallets).where(eq3(wallets.userId, params.userId));
        return { balancePaise: w[0]?.balancePaise ?? 0, transactionId: existing[0].id, deduped: true };
      }
    }
    await ensureWallet(tx, params.userId);
    const [row] = await tx.update(wallets).set({ balancePaise: sql`${wallets.balancePaise} + ${params.amountPaise}`, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(wallets.userId, params.userId)).returning();
    const balance = row.balancePaise;
    const [txRow] = await tx.insert(walletTransactions).values({
      userId: params.userId,
      type: params.type,
      amountPaise: params.amountPaise,
      balanceAfterPaise: balance,
      reference: params.reference,
      idempotencyKey: params.idempotencyKey,
      metadata: params.metadata ?? {}
    }).returning();
    return { balancePaise: balance, transactionId: txRow.id, deduped: false };
  });
}
async function debitWallet(params) {
  const amount = Math.max(0, Math.round(params.amountPaise));
  const db2 = await getDb();
  if (amount === 0) {
    return { balancePaise: await getBalance(params.userId), deductedPaise: 0, transactionId: null, deduped: false };
  }
  return db2.transaction(async (tx) => {
    if (params.idempotencyKey) {
      const existing = await tx.select().from(walletTransactions).where(eq3(walletTransactions.idempotencyKey, params.idempotencyKey));
      if (existing.length > 0) {
        const w = await tx.select().from(wallets).where(eq3(wallets.userId, params.userId));
        return {
          balancePaise: w[0]?.balancePaise ?? 0,
          deductedPaise: Math.max(0, -existing[0].amountPaise),
          transactionId: existing[0].id,
          deduped: true
        };
      }
    }
    await ensureWallet(tx, params.userId);
    const before = await tx.select().from(wallets).where(eq3(wallets.userId, params.userId));
    const oldBalance = before[0]?.balancePaise ?? 0;
    const deducted = Math.min(amount, Math.max(0, oldBalance));
    const [row] = await tx.update(wallets).set({ balancePaise: sql`GREATEST(${wallets.balancePaise} - ${amount}, 0)`, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(wallets.userId, params.userId)).returning();
    const balance = row.balancePaise;
    if (deducted === 0) return { balancePaise: balance, deductedPaise: 0, transactionId: null, deduped: false };
    const [txRow] = await tx.insert(walletTransactions).values({
      userId: params.userId,
      type: "usage",
      amountPaise: -deducted,
      balanceAfterPaise: balance,
      reference: params.reference,
      idempotencyKey: params.idempotencyKey,
      metadata: { ...params.metadata ?? {}, requested: amount, shortfall: amount - deducted }
    }).returning();
    return { balancePaise: balance, deductedPaise: deducted, transactionId: txRow.id, deduped: false };
  });
}
async function getBalance(userId) {
  const db2 = await getDb();
  const rows = await db2.select().from(wallets).where(eq3(wallets.userId, userId));
  return rows[0]?.balancePaise ?? 0;
}
async function assertAffordable(userId, estimatedPaise) {
  const balance = await getBalance(userId);
  if (balance < estimatedPaise) {
    throw new ApiError("insufficient_balance", "Your ProRouter wallet balance is insufficient.");
  }
  return balance;
}

// apps/api/src/routes/auth.ts
var registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(80).optional()
});
function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status };
}
async function authRoutes(app) {
  app.post("/auth/register", async (request, reply) => {
    const ip = request.ip || "unknown";
    const rl = checkRateLimit(`ip:${ip}:register`, 12, 60);
    if (!rl.allowed) throw new ApiError("rate_limit_exceeded", "Too many sign-up attempts. Try again shortly.");
    const body = registerSchema.parse(request.body);
    if (!isStrongPassword(body.password)) {
      throw new ApiError("invalid_request", "Password must be at least 8 characters and include a letter and a number.");
    }
    const db2 = await getDb();
    const email2 = body.email.toLowerCase();
    const existing = await db2.select({ id: users.id }).from(users).where(eq4(users.email, email2));
    if (existing.length > 0) throw new ApiError("invalid_request", "An account with this email already exists.");
    const inserted = await db2.insert(users).values({ email: email2, passwordHash: await hashPassword(body.password), name: body.name ?? "", emailVerified: false }).returning();
    const user = inserted[0];
    await db2.insert(wallets).values({ userId: user.id, balancePaise: 0 }).onConflictDoNothing({ target: wallets.userId });
    const freePlan = (await db2.select().from(plans).where(eq4(plans.slug, "free")))[0];
    if (freePlan) {
      await db2.insert(subscriptions).values({ userId: user.id, planId: freePlan.id, status: "active" }).onConflictDoNothing();
    }
    await db2.insert(notifications).values({
      userId: user.id,
      type: "welcome",
      title: "Welcome to ProRouter",
      body: "One API. Every Model. Create an API key to start building.",
      href: "/dashboard/keys"
    });
    await db2.insert(auditLogs).values({ actorUserId: user.id, action: "auth.register", targetType: "user", targetId: user.id, ip });
    const authed = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
    await createSession(authed, reply, ip, request.headers["user-agent"]);
    return reply.status(201).send({ user: publicUser(authed) });
  });
  app.post("/auth/login", async (request, reply) => {
    const ip = request.ip || "unknown";
    const rl = checkRateLimit(`ip:${ip}:login`, 10, 60);
    if (!rl.allowed) throw new ApiError("rate_limit_exceeded", "Too many sign-in attempts. Try again shortly.");
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
    const db2 = await getDb();
    const rows = await db2.select().from(users).where(eq4(users.email, body.email.toLowerCase()));
    const user = rows[0];
    const ok = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !ok) throw new ApiError("unauthenticated", "Invalid email or password.");
    if (user.status === "suspended") throw new ApiError("forbidden", "This account has been suspended. Contact support.");
    const authed = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
    await createSession(authed, reply, ip, request.headers["user-agent"]);
    await db2.insert(auditLogs).values({ actorUserId: user.id, action: "auth.login", targetType: "user", targetId: user.id, ip });
    return reply.send({ user: publicUser(authed) });
  });
  app.post("/auth/logout", async (request, reply) => {
    await destroySession(request, reply);
    return reply.send({ ok: true });
  });
  app.get("/auth/me", async (request, reply) => {
    const user = await resolveSessionUser(request);
    if (!user) return reply.status(401).send({ user: null });
    const db2 = await getDb();
    const sub = await db2.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq4(subscriptions.planId, plans.id)).where(eq4(subscriptions.userId, user.id));
    const activeSub = sub.find((s) => s.plan) ?? null;
    const astra = await getActiveAstra(user.id);
    return reply.send({
      user: publicUser(user),
      balancePaise: await getBalance(user.id),
      plan: activeSub ? { slug: activeSub.plan.slug, name: activeSub.plan.name, pricePaise: activeSub.plan.pricePaise, freeRpm: activeSub.plan.freeRpm, queuePriority: activeSub.plan.queuePriority } : null,
      astra: astra ? { active: true, expiresAt: astra.expiresAt.toISOString() } : { active: false, expiresAt: null }
    });
  });
  app.patch("/auth/profile", async (request, reply) => {
    const user = await requireUser(request);
    const body = z.object({ name: z.string().max(80).optional() }).parse(request.body);
    const db2 = await getDb();
    await db2.update(users).set({ name: body.name ?? "", updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, user.id));
    return reply.send({ ok: true });
  });
  app.post("/auth/password", async (request, reply) => {
    const user = await requireUser(request);
    const body = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }).parse(request.body);
    if (!isStrongPassword(body.newPassword)) {
      throw new ApiError("invalid_request", "New password must be at least 8 characters and include a letter and a number.");
    }
    const db2 = await getDb();
    const rows = await db2.select().from(users).where(eq4(users.id, user.id));
    const ok = await verifyPassword(body.currentPassword, rows[0].passwordHash);
    if (!ok) throw new ApiError("unauthenticated", "Current password is incorrect.");
    await db2.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: /* @__PURE__ */ new Date() }).where(eq4(users.id, user.id));
    await db2.insert(auditLogs).values({ actorUserId: user.id, action: "auth.password_changed", targetType: "user", targetId: user.id });
    return reply.send({ ok: true });
  });
}

// apps/api/src/routes/keys.ts
import { z as z2 } from "zod";
import { desc, eq as eq5 } from "drizzle-orm";

// apps/api/src/lib/settings.ts
var settings = null;
var flags = null;
var loadedAt = 0;
var TTL_MS = 15e3;
async function loadSettings(force = false) {
  if (!force && settings && Date.now() - loadedAt < TTL_MS) return settings;
  const db2 = await getDb();
  const rows = await db2.select().from(systemSettings);
  settings = new Map(rows.map((r) => [r.key, r.value]));
  const flagRows = await db2.select().from(featureFlags);
  flags = new Map(flagRows.map((r) => [r.key, r.enabled]));
  loadedAt = Date.now();
  return settings;
}
async function getSetting(key, fallback) {
  const s = await loadSettings();
  return s.has(key) ? s.get(key) : fallback;
}
async function getNumber(key, fallback) {
  const v = await getSetting(key, fallback);
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}
async function getFlag(key, fallback = false) {
  await loadSettings();
  return flags?.has(key) ? flags.get(key) : fallback;
}

// apps/api/src/routes/keys.ts
var createSchema = z2.object({
  name: z2.string().min(1).max(64),
  expiresInDays: z2.number().int().min(1).max(3650).nullable().optional(),
  spendingLimitPaise: z2.number().int().min(0).nullable().optional(),
  allowedModels: z2.array(z2.string()).max(50).nullable().optional()
});
function keyDto(k) {
  return {
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt.toISOString(),
    expiresAt: k.expiresAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    requestCount: k.requestCount,
    spendPaise: k.spendPaise,
    spendingLimitPaise: k.spendingLimitPaise,
    allowedModels: k.allowedModels
  };
}
async function keyRoutes(app) {
  app.get("/keys", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    const rows = await db2.select().from(apiKeys).where(eq5(apiKeys.userId, user.id)).orderBy(desc(apiKeys.createdAt));
    return { items: rows.map(keyDto) };
  });
  app.post("/keys", async (request, reply) => {
    const user = await requireUser(request);
    const body = createSchema.parse(request.body ?? {});
    const db2 = await getDb();
    const existing = await db2.select({ id: apiKeys.id }).from(apiKeys).where(eq5(apiKeys.userId, user.id));
    const maxKeys = await getNumber("MAX_API_KEYS", 20);
    if (existing.length >= maxKeys) throw new ApiError("invalid_request", `You have reached the maximum of ${maxKeys} API keys. Revoke one to continue.`);
    const gen = generateApiKey();
    const expiresAt = body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 864e5) : null;
    const rows = await db2.insert(apiKeys).values({ userId: user.id, name: body.name, prefix: gen.prefix, keyHash: gen.hash, expiresAt, spendingLimitPaise: body.spendingLimitPaise ?? null, allowedModels: body.allowedModels ?? null }).returning();
    await db2.insert(auditLogs).values({ actorUserId: user.id, action: "apikey.create", targetType: "api_key", targetId: rows[0].id, metadata: { name: body.name } });
    return reply.status(201).send({ key: keyDto(rows[0]), secret: gen.key });
  });
  app.post("/keys/:id/rotate", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params;
    const db2 = await getDb();
    const rows = await db2.select().from(apiKeys).where(eq5(apiKeys.id, id));
    const row = rows[0];
    if (!row || row.userId !== user.id) throw new ApiError("not_found", "API key not found.");
    const gen = generateApiKey();
    const updated = await db2.update(apiKeys).set({ keyHash: gen.hash, prefix: gen.prefix, revokedAt: null }).where(eq5(apiKeys.id, id)).returning();
    await db2.insert(auditLogs).values({ actorUserId: user.id, action: "apikey.rotate", targetType: "api_key", targetId: id });
    return reply.send({ key: keyDto(updated[0]), secret: gen.key });
  });
  app.delete("/keys/:id", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params;
    const db2 = await getDb();
    const rows = await db2.select().from(apiKeys).where(eq5(apiKeys.id, id));
    const row = rows[0];
    if (!row || row.userId !== user.id) throw new ApiError("not_found", "API key not found.");
    await db2.update(apiKeys).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq5(apiKeys.id, id));
    await db2.insert(auditLogs).values({ actorUserId: user.id, action: "apikey.revoke", targetType: "api_key", targetId: id });
    return reply.send({ ok: true });
  });
}

// apps/api/src/routes/catalog.ts
import { z as z3 } from "zod";

// apps/api/src/lib/catalog.ts
import { desc as desc2, eq as eq7, gte, or, sql as sql2 } from "drizzle-orm";

// apps/api/src/lib/pricing.ts
import { and as and3, eq as eq6 } from "drizzle-orm";
function tierToPricing(tier, usdToInrRate) {
  return {
    inputPerMillion: usdCentsToPaise(tier.inputUsdCentsPerMillion, usdToInrRate),
    outputPerMillion: usdCentsToPaise(tier.outputUsdCentsPerMillion, usdToInrRate),
    cachedInputPerMillion: tier.cachedInputUsdCentsPerMillion === null ? void 0 : usdCentsToPaise(tier.cachedInputUsdCentsPerMillion, usdToInrRate),
    currency: "INR"
  };
}
function resolveEffectivePricing(model, explicit, tier, usdToInrRate) {
  if (model.pricingTier && tier && tier.active && tier.slug === model.pricingTier) {
    return { pricing: tierToPricing(tier, usdToInrRate), tierSlug: tier.slug, tierName: tier.name };
  }
  return {
    pricing: {
      inputPerMillion: explicit?.inputPerMillion ?? 0,
      outputPerMillion: explicit?.outputPerMillion ?? 0,
      cachedInputPerMillion: explicit?.cachedInputPerMillion ?? void 0,
      currency: "INR"
    },
    tierSlug: null,
    tierName: null
  };
}
async function getUsdToInrRate() {
  return getNumber("USD_TO_INR_RATE", 97);
}
async function loadActivePricingTiers() {
  const db2 = await getDb();
  const rows = await db2.select().from(pricingTiers).where(eq6(pricingTiers.active, true));
  return new Map(rows.map((t) => [t.slug, t]));
}

// apps/api/src/lib/catalog.ts
async function listModels(filters = {}) {
  const db2 = await getDb();
  const conditions = [];
  conditions.push(sql2`${models.status} IN ('active','coming_soon')`);
  if (filters.q) {
    const q = `%${filters.q.toLowerCase()}%`;
    conditions.push(or(sql2`lower(${models.name}) LIKE ${q}`, sql2`lower(${models.slug}) LIKE ${q}`, sql2`lower(${models.description}) LIKE ${q}`));
  }
  if (filters.provider) {
    const p = (await db2.select().from(providers).where(eq7(providers.slug, filters.provider)))[0];
    if (!p) return { items: [], total: 0 };
    conditions.push(eq7(models.providerId, p.id));
  }
  if (filters.free) conditions.push(eq7(models.isFree, true));
  if (filters.paid) conditions.push(eq7(models.isFree, false));
  if (filters.minContext) conditions.push(gte(models.contextWindow, filters.minContext));
  const where = conditions.length ? sql2.join(conditions, sql2` AND `) : void 0;
  const totalRows = await db2.select({ n: sql2`count(*)::int` }).from(models).where(where);
  const total = totalRows[0]?.n ?? 0;
  let orderBy = desc2(models.popularity);
  switch (filters.sort) {
    case "rank":
      orderBy = models.rank;
      break;
    case "rating":
      orderBy = desc2(models.rating);
      break;
    case "newest":
      orderBy = desc2(models.createdAt);
      break;
    case "price_asc":
      orderBy = models.rank;
      break;
    case "price_desc":
      orderBy = desc2(models.rank);
      break;
    case "latency":
      orderBy = models.rank;
      break;
    default:
      orderBy = desc2(models.popularity);
  }
  const rows = await db2.select({ model: models, pricing: modelPricing, caps: modelCapabilities, providerSlug: providers.slug, providerName: providers.name }).from(models).leftJoin(modelPricing, eq7(modelPricing.modelId, models.id)).leftJoin(modelCapabilities, eq7(modelCapabilities.modelId, models.id)).leftJoin(providers, eq7(providers.id, models.providerId)).where(where).orderBy(orderBy).limit(Math.min(filters.limit ?? 60, 200)).offset(filters.offset ?? 0);
  const linkRows = await db2.select().from(modelProviders);
  const providerRows = await db2.select().from(providers);
  const linksByModel = /* @__PURE__ */ new Map();
  for (const l of linkRows) {
    const arr = linksByModel.get(l.modelId) ?? [];
    arr.push(l);
    linksByModel.set(l.modelId, arr);
  }
  const providerById = new Map(providerRows.map((p) => [p.id, p]));
  const [tiers, usdToInrRate] = await Promise.all([loadActivePricingTiers(), getUsdToInrRate()]);
  let items = rows.map((r) => {
    const effective = resolveEffectivePricing(r.model, r.pricing, r.model.pricingTier ? tiers.get(r.model.pricingTier) ?? null : null, usdToInrRate);
    return toModelDto(r.model, r.pricing, r.caps, r.providerSlug ?? "", r.providerName ?? "", linksByModel.get(r.model.id) ?? [], providerById, effective);
  });
  if (filters.category) {
    items = items.filter((m) => matchCategory(m, filters.category));
  }
  if (filters.sort === "price_asc") items.sort((a, b) => a.pricing.inputPerMillion - b.pricing.inputPerMillion);
  if (filters.sort === "price_desc") items.sort((a, b) => b.pricing.inputPerMillion - a.pricing.inputPerMillion);
  if (filters.sort === "latency") items.sort((a, b) => (a.latencyMs ?? 9e9) - (b.latencyMs ?? 9e9));
  return { items, total };
}
function matchCategory(m, category) {
  const text7 = `${m.name} ${m.slug} ${m.description}`.toLowerCase();
  switch (category) {
    case "coding":
      return /code|codestral|kimi/.test(text7) || m.capabilities.toolCalls;
    case "reasoning":
      return m.capabilities.reasoning;
    case "vision":
      return m.capabilities.vision;
    case "image":
      return m.capabilities.imageGeneration;
    case "audio":
      return m.capabilities.audio;
    case "tools":
      return m.capabilities.toolCalls;
    default:
      return true;
  }
}
async function getModelDetail(slug2) {
  const db2 = await getDb();
  const rows = await db2.select({ model: models, pricing: modelPricing, caps: modelCapabilities, providerSlug: providers.slug, providerName: providers.name }).from(models).leftJoin(modelPricing, eq7(modelPricing.modelId, models.id)).leftJoin(modelCapabilities, eq7(modelCapabilities.modelId, models.id)).leftJoin(providers, eq7(providers.id, models.providerId)).where(eq7(models.slug, slug2));
  const row = rows[0];
  if (!row) return null;
  const links = await db2.select({ link: modelProviders, provider: providers }).from(modelProviders).innerJoin(providers, eq7(providers.id, modelProviders.providerId)).where(eq7(modelProviders.modelId, row.model.id));
  const linkRows = links.map((l) => l.link);
  const providerById = new Map(links.map((l) => [l.provider.id, l.provider]));
  const [tiers, usdToInrRate] = await Promise.all([loadActivePricingTiers(), getUsdToInrRate()]);
  const effective = resolveEffectivePricing(row.model, row.pricing, row.model.pricingTier ? tiers.get(row.model.pricingTier) ?? null : null, usdToInrRate);
  const dto = toModelDto(row.model, row.pricing, row.caps, row.providerSlug ?? "", row.providerName ?? "", linkRows, providerById, effective);
  const limitsRow = (await db2.select().from(modelLimits).where(eq7(modelLimits.modelId, row.model.id)))[0] ?? null;
  return {
    model: dto,
    limits: limitsRow ? { perMinute: limitsRow.perMinute, perHour: limitsRow.perHour, perDay: limitsRow.perDay, concurrency: limitsRow.concurrency, queuePriority: limitsRow.queuePriority } : null,
    // The upstream model id is internal routing detail — never exposed publicly.
    routes: links.map((l) => ({
      providerSlug: l.provider.slug,
      providerName: l.provider.name,
      priority: l.link.priority,
      status: l.link.status,
      healthy: l.provider.status === "active"
    })).sort((a, b) => a.priority - b.priority)
  };
}
function toModelDto(m, pricing, caps, providerSlug, providerName, links, providerById, effective) {
  const servingLinks = links.filter((l) => l.status !== "disabled");
  const available = servingLinks.some((l) => {
    const p = providerById.get(l.providerId);
    return p && p.status === "active" && l.status === "active";
  });
  const price = effective?.pricing ?? {
    inputPerMillion: pricing?.inputPerMillion ?? 0,
    outputPerMillion: pricing?.outputPerMillion ?? 0,
    cachedInputPerMillion: pricing?.cachedInputPerMillion ?? void 0,
    currency: "INR"
  };
  const capabilities = {
    modalities: caps?.modalities ?? ["text"],
    streaming: caps?.streaming ?? true,
    toolCalls: caps?.toolCalls ?? false,
    structuredOutputs: caps?.structuredOutputs ?? false,
    reasoning: caps?.reasoning ?? false,
    vision: caps?.vision ?? false,
    imageGeneration: caps?.imageGeneration ?? false,
    audio: caps?.audio ?? false,
    jsonMode: caps?.jsonMode ?? true
  };
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    description: m.description,
    providerName: providerName || "ProRouter",
    providerSlug: providerSlug || "prorouter",
    type: m.type,
    status: m.status,
    isFree: m.isFree,
    pricing: price,
    pricingTier: effective?.tierSlug ?? null,
    pricingTierName: effective?.tierName ?? null,
    capabilities,
    contextWindow: m.contextWindow,
    maxOutputTokens: m.maxOutputTokens,
    rank: m.rank,
    popularity: m.popularity,
    rating: m.rating,
    latencyMs: null,
    throughputTps: null,
    uptimePercent: null,
    available,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString()
  };
}
async function listProviders() {
  const db2 = await getDb();
  const providerRows = await db2.select().from(providers);
  const linkRows = await db2.select().from(modelProviders);
  return providerRows.map((p) => {
    const links = linkRows.filter((l) => l.providerId === p.id);
    const modelCount = new Set(links.map((l) => l.modelId)).size;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      region: p.region,
      status: p.status,
      modelCount,
      uptimePercent: p.status === "active" ? 99.9 : null,
      avgLatencyMs: null,
      throughputTps: null,
      priority: p.priority,
      supportedCapabilities: p.capabilities,
      retentionPolicy: p.retentionPolicy,
      description: p.description
    };
  }).sort((a, b) => a.priority - b.priority);
}
async function getProviderDetail(slug2) {
  const db2 = await getDb();
  const p = (await db2.select().from(providers).where(eq7(providers.slug, slug2)))[0];
  if (!p) return null;
  const links = await db2.select({ link: modelProviders, model: models }).from(modelProviders).innerJoin(models, eq7(models.id, modelProviders.modelId)).where(eq7(modelProviders.providerId, p.id));
  const healthRows = await db2.select().from(providerHealth).where(eq7(providerHealth.providerId, p.id)).orderBy(desc2(providerHealth.checkedAt)).limit(1);
  return {
    provider: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      region: p.region,
      status: p.status,
      priority: p.priority,
      retentionPolicy: p.retentionPolicy,
      capabilities: p.capabilities,
      lastHealthAt: p.lastHealthAt?.toISOString() ?? null,
      healthMessage: p.healthMessage
    },
    // Upstream model ids are internal routing detail — never exposed publicly.
    models: links.map((l) => ({ slug: l.model.slug, name: l.model.name, isFree: l.model.isFree, status: l.link.status, priority: l.link.priority })),
    lastHealth: healthRows[0] ? { available: healthRows[0].available, latencyMs: healthRows[0].latencyMs, message: healthRows[0].message, checkedAt: healthRows[0].checkedAt.toISOString() } : null
  };
}

// apps/api/src/routes/catalog.ts
var listQuery = z3.object({
  q: z3.string().optional(),
  provider: z3.string().optional(),
  free: z3.string().optional(),
  paid: z3.string().optional(),
  category: z3.enum(["coding", "reasoning", "vision", "image", "audio", "tools"]).optional(),
  min_context: z3.coerce.number().optional(),
  sort: z3.enum(["rank", "popularity", "rating", "newest", "price_asc", "price_desc", "latency"]).optional(),
  limit: z3.coerce.number().min(1).max(200).optional(),
  offset: z3.coerce.number().min(0).optional()
});
function truthy(v) {
  if (v === void 0) return void 0;
  return v === "true" || v === "1";
}
async function catalogRoutes(app) {
  app.get("/models", async (request) => {
    const q = listQuery.parse(request.query);
    return listModels({ q: q.q, provider: q.provider, free: truthy(q.free), paid: truthy(q.paid), category: q.category, minContext: q.min_context, sort: q.sort, limit: q.limit, offset: q.offset });
  });
  app.get("/models/:slug", async (request, reply) => {
    const { slug: slug2 } = request.params;
    const detail = await getModelDetail(slug2);
    if (!detail) throw new ApiError("model_not_found", `Model '${slug2}' not found.`);
    return reply.send(detail);
  });
  app.get("/providers", async () => listProviders());
  app.get("/providers/:slug", async (request, reply) => {
    const { slug: slug2 } = request.params;
    const detail = await getProviderDetail(slug2);
    if (!detail) throw new ApiError("not_found", `Provider '${slug2}' not found.`);
    return reply.send(detail);
  });
}

// apps/api/src/routes/chat.ts
import { z as z4 } from "zod";
import { eq as eq10, sql as sql5 } from "drizzle-orm";

// packages/providers/src/adapter.ts
var ProviderError = class extends Error {
  code;
  httpStatus;
  retryable;
  providerSlug;
  constructor(providerSlug, code, message, httpStatus, retryable) {
    super(message);
    this.name = "ProviderError";
    this.providerSlug = providerSlug;
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable ?? (httpStatus === 429 || httpStatus >= 500 || httpStatus === 0 || httpStatus === 401 || httpStatus === 403);
  }
};
function estimateTokens(text7) {
  if (!text7) return 0;
  return Math.max(1, Math.ceil(text7.length / 4));
}
function estimateUsage(params) {
  let prompt = 0;
  for (const m of params.messages) {
    if (typeof m.content === "string") prompt += estimateTokens(m.content);
    else if (Array.isArray(m.content)) {
      for (const part of m.content) if (part.text) prompt += estimateTokens(part.text);
    }
    if (m.name) prompt += estimateTokens(m.name);
  }
  const completion = estimateTokens(params.completion);
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion };
}
async function* parseSse(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data) yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// packages/providers/src/openai.ts
var OpenAICompatibleAdapter = class {
  type = "openai";
  providerSlug;
  baseUrl;
  apiKey;
  timeoutMs;
  constructor(config) {
    this.providerSlug = config.providerSlug;
    this.baseUrl = config.endpointUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 6e4;
  }
  headers() {
    const h = { "content-type": "application/json" };
    if (this.apiKey) h.authorization = `Bearer ${this.apiKey}`;
    return h;
  }
  buildBody(params) {
    const body = {
      model: params.model,
      messages: params.messages,
      stream: params.stream
    };
    if (params.stream) body.stream_options = { include_usage: true };
    if (params.temperature !== void 0) body.temperature = params.temperature;
    if (params.topP !== void 0) body.top_p = params.topP;
    if (params.maxTokens !== void 0) body.max_tokens = params.maxTokens;
    if (params.stop !== void 0) body.stop = params.stop;
    if (params.tools !== void 0) body.tools = params.tools;
    if (params.toolChoice !== void 0) body.tool_choice = params.toolChoice;
    if (params.responseFormat !== void 0) body.response_format = params.responseFormat;
    if (params.seed !== void 0) body.seed = params.seed;
    return body;
  }
  async fail(res) {
    let detail = "";
    try {
      const text7 = await res.text();
      try {
        const json = JSON.parse(text7);
        detail = json?.error?.message ?? text7;
      } catch {
        detail = text7;
      }
    } catch {
    }
    const retryable = res.status === 429 || res.status >= 500 || res.status === 401 || res.status === 403;
    throw new ProviderError(
      this.providerSlug,
      res.status === 429 ? "rate_limited" : res.status >= 500 ? "server_error" : "request_rejected",
      detail.slice(0, 500) || `Upstream returned HTTP ${res.status}`,
      res.status,
      retryable
    );
  }
  async chat(params, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...this.buildBody(params), stream: false }),
        signal: controller.signal
      });
      if (!res.ok) await this.fail(res);
      const json = await res.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? "";
      const toolCalls = choice?.message?.tool_calls ?? [];
      const usage = json.usage ?? estimateUsage({ messages: params.messages, completion: content });
      const usageSource = json.usage ? "upstream" : "estimated";
      return {
        content,
        toolCalls,
        finishReason: choice?.finish_reason ?? "stop",
        usage,
        usageSource,
        upstreamRequestId: json.id
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out" : `Network error: ${err.message}`,
        0,
        true
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  async *chatStream(params, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody({ ...params, stream: true })),
        signal: controller.signal
      });
      if (!res.ok) await this.fail(res);
      if (!res.body) throw new ProviderError(this.providerSlug, "empty_body", "Empty streaming response", 502);
      yield { type: "start", upstreamRequestId: res.headers.get("x-request-id") ?? void 0 };
      let usage = null;
      let finishReason = "stop";
      for await (const data of parseSse(res.body)) {
        if (data === "[DONE]") break;
        let chunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.usage) usage = chunk.usage;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta;
        const reasoning = delta?.reasoning ?? delta?.reasoning_content;
        if (reasoning) yield { type: "reasoning_delta", text: reasoning };
        if (delta?.content) yield { type: "delta", text: delta.content };
        for (const tc of delta?.tool_calls ?? []) {
          yield { type: "tool_call_delta", index: tc.index, id: tc.id, name: tc.function?.name, arguments: tc.function?.arguments };
        }
      }
      if (usage) yield { type: "usage", usage, usageSource: "upstream" };
      yield { type: "done", finishReason };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out while streaming" : `Network error: ${err.message}`,
        0,
        true
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  async listModels(signal) {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers(), signal });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []).map((m) => m.id);
    } catch {
      return [];
    }
  }
  async healthCheck(signal) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8e3);
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
        signal: signal ?? controller.signal
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      if (res.ok) return { available: true, latencyMs };
      if (res.status === 401 || res.status === 403) return { available: false, latencyMs, message: "Invalid or missing API key" };
      if (res.status === 404) return { available: true, latencyMs, message: "Endpoint reachable (no /models)" };
      return { available: false, latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, message: err.message };
    }
  }
};

// packages/providers/src/freemodels.ts
var FreemodelsAdapter = class extends OpenAICompatibleAdapter {
  type = "freemodels";
  headers() {
    return {
      ...super.headers(),
      origin: "https://freemodels.pro",
      referer: "https://freemodels.pro/"
    };
  }
  async chat(params, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...this.buildBody({ ...params, stream: false }), stream: false }),
        signal: controller.signal
      });
      if (!res.ok) await this.fail(res);
      const json = await res.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? json.content ?? "";
      const toolCalls = choice?.message?.tool_calls ?? [];
      const usage = json.usage ?? estimateUsage({ messages: params.messages, completion: content });
      const usageSource = json.usage ? "upstream" : "estimated";
      return {
        content,
        toolCalls,
        finishReason: choice?.finish_reason ?? "stop",
        usage,
        usageSource,
        upstreamRequestId: json.id
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out" : `Network error: ${err.message}`,
        0,
        true
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
};

// packages/providers/src/anthropic.ts
var ANTHROPIC_VERSION = "2023-06-01";
var AnthropicAdapter = class {
  type = "anthropic";
  providerSlug;
  baseUrl;
  apiKey;
  timeoutMs;
  constructor(config) {
    this.providerSlug = config.providerSlug;
    this.baseUrl = config.endpointUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 6e4;
  }
  headers() {
    const h = {
      "content-type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION
    };
    if (this.apiKey) h["x-api-key"] = this.apiKey;
    return h;
  }
  /** Convert OpenAI-style messages into Anthropic's system/messages shape. */
  splitMessages(messages2) {
    let system;
    const out = [];
    for (const m of messages2) {
      if (m.role === "system" || m.role === "developer") {
        const text8 = typeof m.content === "string" ? m.content : "";
        system = system ? `${system}

${text8}` : text8;
        continue;
      }
      const text7 = typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((p) => p.text ?? "").join("") : "";
      out.push({ role: m.role === "assistant" ? "assistant" : "user", content: text7 });
    }
    return { system, messages: out };
  }
  buildBody(params) {
    const { system, messages: messages2 } = this.splitMessages(params.messages);
    const body = {
      model: params.model,
      messages: messages2,
      max_tokens: params.maxTokens ?? 4096,
      stream: params.stream
    };
    if (system) body.system = system;
    if (params.temperature !== void 0) body.temperature = params.temperature;
    if (params.topP !== void 0) body.top_p = params.topP;
    if (params.stop !== void 0) body.stop_sequences = params.stop;
    return body;
  }
  async fail(res) {
    let detail = "";
    try {
      const text7 = await res.text();
      try {
        const json = JSON.parse(text7);
        detail = json?.error?.message ?? text7;
      } catch {
        detail = text7;
      }
    } catch {
    }
    throw new ProviderError(
      this.providerSlug,
      res.status === 429 ? "rate_limited" : res.status >= 500 ? "server_error" : "request_rejected",
      detail.slice(0, 500) || `Upstream returned HTTP ${res.status}`,
      res.status
    );
  }
  async chat(params, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...this.buildBody(params), stream: false }),
        signal: controller.signal
      });
      if (!res.ok) await this.fail(res);
      const json = await res.json();
      const text7 = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      const toolCalls = (json.content ?? []).filter((b) => b.type === "tool_use").map((b, i) => ({
        id: b.id ?? `tool_${i}`,
        type: "function",
        function: { name: b.name ?? "", arguments: JSON.stringify(b.input ?? {}) }
      }));
      const usage = {
        prompt_tokens: json.usage?.input_tokens ?? estimateUsage({ messages: params.messages, completion: text7 }).prompt_tokens,
        completion_tokens: json.usage?.output_tokens ?? 0,
        total_tokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0)
      };
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
      const usageSource = json.usage ? "upstream" : "estimated";
      return { content: text7, toolCalls, finishReason: json.stop_reason ?? "stop", usage, usageSource };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out" : `Network error: ${err.message}`,
        0,
        true
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  async *chatStream(params, signal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody({ ...params, stream: true })),
        signal: controller.signal
      });
      if (!res.ok) await this.fail(res);
      if (!res.body) throw new ProviderError(this.providerSlug, "empty_body", "Empty streaming response", 502);
      yield { type: "start" };
      let inputTokens = 0;
      let outputTokens = 0;
      let finishReason = "stop";
      let sawUsage = false;
      for await (const data of parseSse(res.body)) {
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        const type = String(event.type ?? "");
        if (type === "message_start") {
          const msg = event.message;
          inputTokens = msg?.usage?.input_tokens ?? 0;
          if (typeof msg?.usage?.input_tokens === "number") sawUsage = true;
        } else if (type === "content_block_delta") {
          const delta = event.delta;
          if (delta?.type === "text_delta" && delta.text) yield { type: "delta", text: delta.text };
          if (delta?.type === "thinking_delta" && delta.thinking) yield { type: "reasoning_delta", text: delta.thinking };
        } else if (type === "message_delta") {
          const delta = event.delta;
          if (delta?.stop_reason) finishReason = delta.stop_reason === "tool_use" ? "tool_calls" : "stop";
          const usage = event.usage;
          if (typeof usage?.output_tokens === "number") {
            outputTokens = usage.output_tokens;
            sawUsage = true;
          }
        } else if (type === "error") {
          const err = event.error;
          throw new ProviderError(this.providerSlug, "stream_error", err?.message ?? "Anthropic stream error", 502, true);
        } else if (type === "message_stop") {
          break;
        }
      }
      if (sawUsage) yield { type: "usage", usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens }, usageSource: "upstream" };
      yield { type: "done", finishReason };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out while streaming" : `Network error: ${err.message}`,
        0,
        true
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }
  async listModels() {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers() });
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []).map((m) => m.id);
    } catch {
      return [];
    }
  }
  async healthCheck() {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8e3);
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers(), signal: controller.signal });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      if (res.ok) return { available: true, latencyMs };
      if (res.status === 401) return { available: false, latencyMs, message: "Invalid API key" };
      if (res.status === 404) return { available: true, latencyMs, message: "Endpoint reachable" };
      return { available: false, latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, message: err.message };
    }
  }
};

// packages/providers/src/registry.ts
function createAdapter(adapterType, config) {
  switch (adapterType) {
    case "anthropic":
      return new AnthropicAdapter(config);
    case "freemodels":
      return new FreemodelsAdapter(config);
    case "openai":
    case "groq":
    case "mistral":
    case "ollama":
    case "openrouter":
    case "custom_openai":
    default:
      return new OpenAICompatibleAdapter(config);
  }
}

// packages/routing/src/index.ts
var HEALTHY_STALE_MS = 15 * 60 * 1e3;
function isUsable(c) {
  if (c.linkStatus === "disabled" || c.providerStatus === "disabled") return false;
  if (c.linkStatus === "degraded" || c.providerStatus === "degraded") return false;
  if (c.providerStatus === "unknown") return false;
  if (c.health && !c.health.available) return false;
  if (c.health) {
    const age = Date.now() - new Date(c.health.checkedAt ?? 0).getTime();
    if (age > HEALTHY_STALE_MS && !c.health.available) return false;
  }
  return true;
}
function score(c, opts) {
  const reasons = [];
  let s = 1e3;
  const prio = Math.min(c.linkPriority, c.providerPriority);
  s -= prio * 2;
  reasons.push(`priority ${prio}`);
  if (c.health) {
    s += Math.round(c.health.successRateBp / 100);
    if (c.health.latencyMs !== null) {
      const latencyPenalty = Math.min(200, Math.round(c.health.latencyMs / 50));
      s -= latencyPenalty;
      reasons.push(`latency ${c.health.latencyMs}ms`);
    }
    reasons.push(`success ${(c.health.successRateBp / 100).toFixed(1)}%`);
  }
  if (c.providerStatus === "active") {
    s += 50;
    reasons.push("healthy");
  } else if (c.providerStatus === "unknown") {
    s -= 500;
    reasons.push("health unknown");
  }
  if (!c.isFree && opts.maxInputCostPerMillion !== void 0) {
    if (c.inputPerMillion > opts.maxInputCostPerMillion) {
      s -= 1e4;
      reasons.push("over budget");
    }
  }
  if (c.isFree && opts.preferFree) {
    s += 200;
    reasons.push("free quota eligible");
  }
  if (opts.planSlug === "ultra") s += 10;
  if (opts.planSlug === "free") s -= 5;
  return { candidate: c, score: s, reasons };
}
function routeRequest(candidates, opts) {
  const trace = [];
  trace.push(`candidates=${candidates.length}`);
  const usable = candidates.filter(isUsable);
  trace.push(`usable=${usable.length}`);
  if (usable.length === 0) return null;
  const budgeted = usable.filter(
    (c) => opts.maxInputCostPerMillion === void 0 || c.isFree || c.inputPerMillion <= opts.maxInputCostPerMillion
  );
  trace.push(`within_budget=${budgeted.length}`);
  const pool2 = budgeted.length > 0 ? budgeted : usable;
  const scored = pool2.map((c) => score(c, opts)).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.candidate.providerPriority !== b.candidate.providerPriority) return a.candidate.providerPriority - b.candidate.providerPriority;
    return a.candidate.providerSlug.localeCompare(b.candidate.providerSlug);
  });
  const primary = scored[0];
  trace.push(`selected=${primary.candidate.providerSlug} score=${primary.score}`);
  const fallbackChain = opts.fallbackEnabled ? scored.slice(1).map((s) => s.candidate) : [];
  if (opts.fallbackEnabled) trace.push(`fallbacks=${fallbackChain.length}`);
  else trace.push("fallback=disabled");
  return { primary: primary.candidate, fallbackChain, scores: scored, trace };
}
function selectAutoModel(options, hints) {
  const available = options.filter((o) => o.available);
  if (available.length === 0) return null;
  const scored = available.map((o) => {
    let s = 1e3 - o.rank * 10 + Math.min(100, o.popularity / 100);
    if (hints.preferFree && o.isFree) s += 500;
    if (hints.wantsCoding && o.toolCalls) s += 100;
    if (hints.wantsReasoning && o.reasoning) s += 100;
    return { o, s };
  }).sort((a, b) => b.s - a.s || a.o.slug.localeCompare(b.o.slug));
  return scored[0]?.o ?? null;
}

// apps/api/src/lib/request-auth.ts
async function authenticateRequest(request, opts = {}) {
  const fromKey = await resolveApiKey(request);
  if (fromKey) return { user: fromKey.user, apiKey: fromKey.apiKey };
  const session = await resolveSessionUser(request);
  if (session) return { user: session, apiKey: null };
  if (opts.optional) return null;
  const hasBearer = !!request.headers.authorization;
  throw new ApiError(
    hasBearer ? "invalid_api_key" : "unauthenticated",
    hasBearer ? "Invalid API key provided." : "Authentication required. Use an API key or sign in."
  );
}
function enforceRateLimits(request, auth) {
  const ip = request.ip || "unknown";
  const checks = [
    { key: `ip:${ip}`, limit: 120, window: 60 },
    { key: `user:${auth.user.id}`, limit: 60, window: 60 }
  ];
  if (auth.apiKey) checks.push({ key: `key:${auth.apiKey.id}`, limit: 60, window: 60 });
  for (const c of checks) {
    const r = checkRateLimit(c.key, c.limit, c.window);
    if (!r.allowed) {
      throw new ApiError("rate_limit_exceeded", `Rate limit exceeded. Try again in ${r.retryAfterSec}s.`, { retryAfter: r.retryAfterSec });
    }
  }
}

// apps/api/src/lib/freequota.ts
import { eq as eq8, sql as sql3 } from "drizzle-orm";
function bucketKeys(userId, now = Date.now()) {
  const minute = Math.floor(now / 6e4);
  const hour = Math.floor(now / 36e5);
  const day = Math.floor(now / 864e5);
  return [
    { window: "minute", key: `m:${userId}:${minute}` },
    { window: "hour", key: `h:${userId}:${hour}` },
    { window: "day", key: `d:${userId}:${day}` }
  ];
}
var QuotaExceeded = class extends Error {
  constructor(window, used, limit) {
    super(`Free ${window} quota exceeded (${limit})`);
    this.window = window;
    this.used = used;
    this.limit = limit;
  }
  window;
  used;
  limit;
};
async function consumeFreeQuota(userId, limits) {
  const db2 = await getDb();
  const buckets2 = bucketKeys(userId);
  const limitsByWindow = { minute: limits.perMinute, hour: limits.perHour, day: limits.perDay };
  const consumed = [];
  try {
    for (const b of buckets2) {
      const limit = limitsByWindow[b.window];
      const insertSql = sql3`INSERT INTO free_usage (user_id, bucket_key, count, updated_at) VALUES (${userId}, ${b.key}, 1, now()) ON CONFLICT (user_id, bucket_key) DO UPDATE SET count = free_usage.count + 1, updated_at = now() RETURNING count`;
      const rows = await db2.execute(insertSql);
      const count = Number(rows.rows?.[0]?.count ?? 1);
      consumed.push(b);
      if (count > limit) throw new QuotaExceeded(b.window, count - 1, limit);
    }
  } catch (err) {
    for (const c of consumed) {
      await db2.execute(sql3`UPDATE free_usage SET count = GREATEST(count - 1, 0) WHERE user_id = ${userId} AND bucket_key = ${c.key}`);
    }
    if (err instanceof QuotaExceeded) {
      const retryAfter = err.window === "minute" ? 60 : err.window === "hour" ? 3600 : 86400;
      return { allowed: false, window: err.window, used: err.used, limit: err.limit, retryAfterSec: retryAfter };
    }
    throw err;
  }
  return { allowed: true, window: null, used: 0, limit: limits.perMinute, retryAfterSec: 0 };
}

// apps/api/src/lib/queue.ts
var nextId = 1;
var states = /* @__PURE__ */ new Map();
function state(modelKey) {
  let s = states.get(modelKey);
  if (!s) {
    s = { running: 0, waiting: [], avgServiceMs: 3e3, lastServiceMs: 0 };
    states.set(modelKey, s);
  }
  return s;
}
function probeQueue(modelKey, priority) {
  const s = state(modelKey);
  if (s.running === 0 && s.waiting.length === 0) {
    return { position: 0, running: 0, waiting: 0, estimatedWaitMs: 0, ready: true };
  }
  let ahead = 0;
  for (const w of s.waiting) {
    if (w.priority <= priority) ahead++;
  }
  const position = s.running > 0 ? ahead + 1 : ahead;
  if (position === 0) return { position: 0, running: s.running, waiting: s.waiting.length, estimatedWaitMs: 0, ready: true };
  const estimatedWaitMs = Math.round(position * s.avgServiceMs);
  return { position, running: s.running, waiting: s.waiting.length, estimatedWaitMs, ready: false };
}
async function acquireSlot(modelKey, concurrency, priority, onStatus) {
  const s = state(modelKey);
  const startedAt = Date.now();
  if (s.running < concurrency && s.waiting.length === 0) {
    s.running++;
    onStatus?.({ position: 0, running: s.running, waiting: 0, estimatedWaitMs: 0, ready: true });
    return { queueWaitMs: 0, positionAtEntry: 0 };
  }
  const positionAtEntry = probeQueue(modelKey, priority).position;
  await new Promise((resolve, reject) => {
    const waiter = { id: nextId++, modelKey, priority, enqueuedAt: Date.now(), resolve, reject };
    s.waiting.push(waiter);
    s.waiting.sort((a, b) => a.priority - b.priority || a.enqueuedAt - b.enqueuedAt);
    const pos = s.waiting.indexOf(waiter) + 1;
    onStatus?.({ position: pos, running: s.running, waiting: s.waiting.length, estimatedWaitMs: Math.round(pos * s.avgServiceMs), ready: false });
  });
  return { queueWaitMs: Date.now() - startedAt, positionAtEntry };
}
function releaseSlot(modelKey, serviceMs = 0) {
  const s = state(modelKey);
  if (serviceMs > 0) {
    s.lastServiceMs = serviceMs;
    s.avgServiceMs = Math.round(s.avgServiceMs * 0.7 + serviceMs * 0.3);
  }
  const next = s.waiting.shift();
  if (next) next.resolve();
  else if (s.running > 0) s.running--;
}
function queueSnapshot() {
  return [...states.entries()].map(([modelKey, s]) => ({ modelKey, running: s.running, waiting: s.waiting.length, avgServiceMs: s.avgServiceMs }));
}

// apps/api/src/lib/pipeline.ts
import { and as and5, desc as desc3, eq as eq9, inArray, or as or2, sql as sql4 } from "drizzle-orm";
var MODEL_ALIASES = {
  // DeepSeek
  "deepseek-v4.1-flash-1017": "deepseek-v4.1-flash-1017",
  "deepseek-ai/deepseek-v4.1-flash-1017": "deepseek-v4.1-flash-1017",
  "deepseek-ai/deepseek-v4.1-flash": "deepseek-v4.1-flash-1017",
  "deepseek-v4.1-flash": "deepseek-v4.1-flash",
  "deepseek-v4-pro-0813": "deepseek-v4-pro-0813",
  "deepseek-v4-pro": "deepseek-v4-pro-0813",
  "deepseek-v4": "deepseek-v4.1-flash-1017",
  "deepseek": "deepseek-v4.1-flash-1017",
  // Qwen
  "qwen3.8-27b": "qwen3.8-27b",
  "qwen-3.8-27b": "qwen3.8-27b",
  "qwen3.8": "qwen3.8-27b",
  "qwen3-coder-next": "qwen3-coder-next",
  "qwen-coder": "qwen3-coder-next",
  "qwen": "qwen3.8-27b",
  // GLM
  "glm-5.3": "glm-5.3",
  "glm5.3": "glm-5.3",
  "glm-5.3-flash": "glm-5.3-flash",
  "glm5.3-flash": "glm-5.3-flash",
  "glm": "glm-5.3",
  // Kimi
  "kimi-k3": "kimi-k3",
  "kimi-3": "kimi-k3",
  "kimi3": "kimi-k3",
  "kimik3": "kimi-k3",
  "kimi-k2.7-code": "kimi-k2.7-code",
  "kimi-code": "kimi-k2.7-code",
  "kimi": "kimi-k3",
  // MiMo
  "mimo-v2.6-pro": "mimo-v2.6-pro",
  "mimo-v2.6-flash": "mimo-v2.6-flash",
  "mimo-pro": "mimo-v2.6-pro",
  "mimo-flash": "mimo-v2.6-flash",
  "mimo": "mimo-v2.6-pro",
  // MiniMax
  "minimax-m3.1-flash": "minimax-m3.1-flash",
  "minimax-flash": "minimax-m3.1-flash",
  "minimax": "minimax-m3.1-flash",
  // Devstral
  "devstral-24b": "devstral-24b",
  "devstral": "devstral-24b",
  // Claude
  "claude-sonnet": "claude-sonnet",
  "claude-3-7-sonnet": "claude-sonnet",
  "claude-3-5-sonnet": "claude-sonnet",
  "claude-opus": "claude-opus",
  "claude-3-opus": "claude-opus",
  "claude-opus-5": "claude-opus-5",
  "claude": "claude-sonnet",
  // Gemini
  "gemini-pro": "gemini-pro",
  "gemini-1.5-pro": "gemini-pro",
  "gemini-2.0-flash": "gemini-pro",
  "gemini-2.0-pro": "gemini-pro",
  "gemini": "gemini-pro",
  // Grok
  "grok": "grok",
  "grok-2": "grok",
  "grok-3": "grok",
  // Mistral
  "mistral-large": "mistral-large",
  "mistral": "mistral-large",
  // GPT
  "gpt-6.1-sol": "gpt-6.1-sol",
  "gpt-6.1-terra": "gpt-6.1-terra",
  "gpt-6-luna": "gpt-6-luna",
  "gpt-4o": "gpt-6.1-sol",
  "gpt-4": "gpt-6.1-sol"
};
async function resolveModelInput(input) {
  let raw = input.trim();
  if (raw === "prorouter/auto" || raw === "auto") return { auto: true, slug: "auto" };
  if (raw.startsWith("prorouter/")) raw = raw.slice(10);
  if (raw.startsWith("uno/")) raw = raw.slice(4);
  const lower = raw.toLowerCase();
  if (MODEL_ALIASES[lower]) {
    return { auto: false, slug: MODEL_ALIASES[lower] };
  }
  if (raw.includes("/")) {
    const idx = raw.indexOf("/");
    const maybeProvider = raw.slice(0, idx);
    const slug2 = raw.slice(idx + 1);
    if (maybeProvider !== "uno" && maybeProvider !== "prorouter" && maybeProvider !== "deepseek-ai") {
      return { auto: false, slug: slug2, forcedProvider: maybeProvider };
    }
    raw = slug2;
  }
  const normalized = raw.toLowerCase().replace(/\s+/g, "-");
  if (MODEL_ALIASES[normalized]) {
    return { auto: false, slug: MODEL_ALIASES[normalized] };
  }
  return { auto: false, slug: raw };
}
async function loadModelContext(slug2) {
  const db2 = await getDb();
  const lowerSlug = slug2.toLowerCase();
  const rows = await db2.select({ model: models, pricing: modelPricing, tier: pricingTiers, caps: modelCapabilities, limits: modelLimits }).from(models).leftJoin(modelPricing, eq9(modelPricing.modelId, models.id)).leftJoin(pricingTiers, eq9(pricingTiers.slug, models.pricingTier)).leftJoin(modelCapabilities, eq9(modelCapabilities.modelId, models.id)).leftJoin(modelLimits, eq9(modelLimits.modelId, models.id)).where(or2(
    eq9(models.slug, slug2),
    sql4`lower(${models.slug}) = ${lowerSlug}`,
    sql4`lower(${models.name}) = ${lowerSlug}`
  ));
  let r = rows[0];
  if (!r) {
    const fallbackRows = await db2.select({ model: models, pricing: modelPricing, tier: pricingTiers, caps: modelCapabilities, limits: modelLimits }).from(models).leftJoin(modelPricing, eq9(modelPricing.modelId, models.id)).leftJoin(pricingTiers, eq9(pricingTiers.slug, models.pricingTier)).leftJoin(modelCapabilities, eq9(modelCapabilities.modelId, models.id)).leftJoin(modelLimits, eq9(modelLimits.modelId, models.id)).where(eq9(models.slug, "deepseek-v4.1-flash-1017"));
    r = fallbackRows[0];
    if (!r) return null;
    return {
      model: { ...r.model, name: slug2, slug: slug2 },
      pricing: r.pricing,
      tier: r.tier,
      caps: r.caps,
      limits: r.limits
    };
  }
  return { model: r.model, pricing: r.pricing, tier: r.tier, caps: r.caps, limits: r.limits };
}
async function hydrateCandidates(modelId, forcedProvider) {
  const db2 = await getDb();
  const linkRows = await db2.select({ link: modelProviders, provider: providers }).from(modelProviders).innerJoin(providers, eq9(providers.id, modelProviders.providerId)).where(eq9(modelProviders.modelId, modelId));
  const modelRows = await db2.select().from(models).where(eq9(models.id, modelId));
  const model = modelRows[0];
  const pricingRows = await db2.select().from(modelPricing).where(eq9(modelPricing.modelId, modelId));
  const pricing = pricingRows[0];
  const tier = model?.pricingTier ? (await db2.select().from(pricingTiers).where(eq9(pricingTiers.slug, model.pricingTier)))[0] ?? null : null;
  const effective = model ? resolveEffectivePricing(model, pricing ?? null, tier, await getUsdToInrRate()) : null;
  const providerIds = linkRows.map((l) => l.provider.id);
  const healthRows = providerIds.length ? await db2.select().from(providerHealth).where(inArray(providerHealth.providerId, providerIds)).orderBy(desc3(providerHealth.checkedAt)) : [];
  const latestHealth = /* @__PURE__ */ new Map();
  for (const h of healthRows) if (!latestHealth.has(h.providerId)) latestHealth.set(h.providerId, h);
  return linkRows.filter((l) => !forcedProvider || l.provider.slug === forcedProvider).map((l) => {
    const h = latestHealth.get(l.provider.id);
    return {
      linkId: l.link.id,
      providerId: l.provider.id,
      providerSlug: l.provider.slug,
      providerName: l.provider.name,
      upstreamModelId: l.link.providerModelId,
      linkPriority: l.link.priority,
      providerPriority: l.provider.priority,
      providerStatus: l.provider.status,
      linkStatus: l.link.status,
      timeoutMs: l.provider.timeoutMs,
      retryCount: l.provider.retryCount,
      health: h ? { available: h.available, latencyMs: h.latencyMs, successRateBp: h.successRateBp, checkedAt: h.checkedAt } : null,
      inputPerMillion: effective?.pricing.inputPerMillion ?? 0,
      outputPerMillion: effective?.pricing.outputPerMillion ?? 0,
      isFree: model?.isFree ?? false
    };
  });
}
var ENV_KEY_MAP = {
  "prorouter-gateway": process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY,
  openai: env.openaiApiKey,
  groq: env.groqApiKey,
  mistral: env.mistralApiKey,
  anthropic: env.anthropicApiKey,
  openrouter: process.env.PROVIDER_OPENROUTER_API_KEY
};
async function getAdapter(candidate) {
  const db2 = await getDb();
  const creds = await db2.select().from(providerCredentials).where(and5(eq9(providerCredentials.providerId, candidate.providerId), eq9(providerCredentials.active, true)));
  const providerRows = await db2.select().from(providers).where(eq9(providers.id, candidate.providerId));
  const provider = providerRows[0];
  if (!provider) throw new ApiError("provider_unavailable", "Provider configuration missing.");
  let apiKey = creds[0] ? decryptSecret(creds[0].ciphertext, creds[0].iv, creds[0].authTag ?? "") : void 0;
  if (!apiKey) apiKey = ENV_KEY_MAP[candidate.providerSlug];
  return createAdapter(provider.adapterType, {
    providerSlug: candidate.providerSlug,
    endpointUrl: provider.endpointUrl,
    apiKey,
    timeoutMs: candidate.timeoutMs
  });
}
async function executeChat(decision, params) {
  const chain = [decision.primary, ...decision.fallbackChain];
  const attempts = [];
  let lastError = null;
  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const startedAt = Date.now();
    try {
      const adapter = await getAdapter(candidate);
      const result = await adapter.chat(params);
      attempts.push({ providerSlug: candidate.providerSlug, status: "success", httpStatus: 200, latencyMs: Date.now() - startedAt, error: null });
      return { ...result, providerSlug: candidate.providerSlug, providerModelId: candidate.upstreamModelId, attempts };
    } catch (err) {
      const pErr = err instanceof ProviderError ? err : new ProviderError(candidate.providerSlug, "unknown", err.message, 500);
      lastError = pErr;
      attempts.push({ providerSlug: candidate.providerSlug, status: "failed", httpStatus: pErr.httpStatus || null, latencyMs: Date.now() - startedAt, error: pErr.message });
      const isLast = i === chain.length - 1;
      if (isLast || !pErr.retryable) break;
    }
  }
  throw lastError ?? new ProviderError("unknown", "no_provider", "No provider available", 503);
}
async function* streamChat(decision, params, onMeta) {
  const chain = [decision.primary, ...decision.fallbackChain];
  const attempts = [];
  let lastError = null;
  let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let usageSource = "none";
  let finishReason = "stop";
  let started = false;
  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const startedAt = Date.now();
    try {
      const adapter = await getAdapter(candidate);
      const iterator = adapter.chatStream(params)[Symbol.asyncIterator]();
      while (true) {
        const { value, done } = await iterator.next();
        if (done) break;
        if (value.type === "usage") {
          usage = value.usage;
          usageSource = value.usageSource;
        }
        if (value.type === "done") finishReason = value.finishReason;
        if (value.type === "delta" && !started) started = true;
        onMeta?.(value);
        yield value;
      }
      attempts.push({ providerSlug: candidate.providerSlug, status: "success", httpStatus: 200, latencyMs: Date.now() - startedAt, error: null });
      return { providerSlug: candidate.providerSlug, providerModelId: candidate.upstreamModelId, usage, usageSource, finishReason, attempts };
    } catch (err) {
      const pErr = err instanceof ProviderError ? err : new ProviderError(candidate.providerSlug, "unknown", err.message, 500);
      lastError = pErr;
      attempts.push({ providerSlug: candidate.providerSlug, status: "failed", httpStatus: pErr.httpStatus || null, latencyMs: Date.now() - startedAt, error: pErr.message });
      if (started || i === chain.length - 1 || !pErr.retryable) {
        yield { type: "done", finishReason: "error" };
        throw pErr;
      }
    }
  }
  throw lastError ?? new ProviderError("unknown", "no_provider", "No provider available", 503);
}
async function resolveAutoModel(hints) {
  const db2 = await getDb();
  const all = await db2.select({ model: models, caps: modelCapabilities }).from(models).leftJoin(modelCapabilities, eq9(modelCapabilities.modelId, models.id)).where(eq9(models.status, "active"));
  const links = await db2.select().from(modelProviders);
  const providerRows = await db2.select().from(providers);
  const providerById = new Map(providerRows.map((p) => [p.id, p]));
  const options = all.map(({ model, caps }) => {
    const modelLinks = links.filter((l) => l.modelId === model.id);
    const available = modelLinks.some((l) => l.status === "active" && providerById.get(l.providerId)?.status === "active");
    return {
      slug: model.slug,
      name: model.name,
      isFree: model.isFree,
      rank: model.rank,
      popularity: model.popularity,
      reasoning: caps?.reasoning ?? false,
      toolCalls: caps?.toolCalls ?? false,
      available
    };
  });
  const chosen = selectAutoModel(options, hints);
  return chosen?.slug ?? null;
}
function extractHints(messages2) {
  const last = [...messages2].reverse().find((m) => m.role === "user");
  const text7 = typeof last?.content === "string" ? last.content : Array.isArray(last?.content) ? last.content.map((p) => p.text ?? "").join(" ") : "";
  return {
    wantsCoding: /\b(code|coding|function|bug|debug|implement|refactor|typescript|python|sql)\b/i.test(text7),
    wantsReasoning: /\b(reason|think step|analy[sz]e|prove|logic|puzzle|strategy)\b/i.test(text7)
  };
}

// apps/api/src/routes/chat.ts
import { randomBytes as randomBytes3 } from "node:crypto";
var bodySchema = z4.looseObject({
  model: z4.string().min(1),
  messages: z4.array(z4.looseObject({ role: z4.string() })).min(1).max(500),
  stream: z4.boolean().optional(),
  temperature: z4.number().min(0).max(2).optional(),
  top_p: z4.number().min(0).max(1).optional(),
  max_tokens: z4.number().int().positive().optional(),
  max_completion_tokens: z4.number().int().positive().optional(),
  stop: z4.union([z4.string(), z4.array(z4.string())]).optional(),
  tools: z4.array(z4.unknown()).optional(),
  tool_choice: z4.unknown().optional(),
  response_format: z4.unknown().optional(),
  seed: z4.number().optional()
});
async function getUserPlan(userId) {
  const db2 = await getDb();
  const rows = await db2.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq10(subscriptions.planId, plans.id)).where(eq10(subscriptions.userId, userId));
  const sub = rows.find((r) => r.plan && r.plan.active);
  if (sub) return { slug: sub.plan.slug, name: sub.plan.name, freeRpm: sub.plan.freeRpm, freeRph: sub.plan.freeRph, freeRpd: sub.plan.freeRpd, concurrency: sub.plan.concurrency, queuePriority: sub.plan.queuePriority };
  return { slug: "free", name: "Free", freeRpm: 1, freeRph: 20, freeRpd: 100, concurrency: 1, queuePriority: 5 };
}
function countMessageTokens(messages2) {
  let chars = 0;
  for (const m of messages2) {
    if (typeof m.content === "string") chars += m.content.length;
    else if (Array.isArray(m.content)) {
      for (const p of m.content) if (p.text) chars += p.text.length;
    }
    chars += 8;
  }
  return Math.max(1, Math.ceil(chars / 4));
}
function newRequestId() {
  return `req_${randomBytes3(12).toString("hex")}`;
}
async function chatRoutes(app) {
  const PRO_MODELS_DATA = [
    {
      id: "pr-echo",
      name: "Pro Router Echo",
      object: "model",
      created: 171e7,
      owned_by: "prorouter",
      tier: "Starter",
      description: "A basic, affordable text-to-text model for everyday questions, short answers, summaries, and simple chat.",
      pricing: { input_usd_per_million: 0.2, output_usd_per_million: 0.8 }
    },
    {
      id: "pr-swift",
      name: "Pro Router Swift",
      object: "model",
      created: 171e7,
      owned_by: "prorouter",
      tier: "Fast",
      description: "Designed for quick responses, customer support, chatbots, and high-volume applications.",
      pricing: { input_usd_per_million: 0.3, output_usd_per_million: 1.2 }
    },
    {
      id: "pr-nova",
      name: "Pro Router Nova",
      object: "model",
      created: 171e7,
      owned_by: "prorouter",
      tier: "Chat",
      description: "Your general-purpose premium model for detailed answers, writing, reasoning, and everyday development assistance.",
      pricing: { input_usd_per_million: 0.5, output_usd_per_million: 2 }
    },
    {
      id: "pr-aura",
      name: "Pro Router Aura",
      object: "model",
      created: 171e7,
      owned_by: "prorouter",
      tier: "Writing",
      description: "Positioned for more advanced reasoning, long-form content, complex instructions, and coding assistance, depending on the configured backend.",
      pricing: { input_usd_per_million: 0.75, output_usd_per_million: 3 }
    },
    {
      id: "pr-zenith",
      name: "Pro Router Zenith",
      object: "model",
      created: 171e7,
      owned_by: "prorouter",
      tier: "Flagship",
      description: "Your flagship tier for the most demanding text tasks, complex analysis, and coding workflows supported by your chosen backend.",
      pricing: { input_usd_per_million: 1, output_usd_per_million: 4 }
    }
  ];
  app.get("/v1/models", async (_request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return {
      object: "list",
      data: PRO_MODELS_DATA
    };
  });
  app.get("/v1/models/:id", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const { id } = request.params;
    const clean = id.toLowerCase().trim();
    const found = PRO_MODELS_DATA.find((m) => m.id === clean || clean.includes(m.id.replace("pr-", ""))) || PRO_MODELS_DATA[2];
    return reply.send({
      ...found,
      id: clean || found.id
    });
  });
  app.post("/v1/chat/completions", async (request, reply) => {
    const requestId = request.requestId || newRequestId();
    reply.header("x-request-id", requestId);
    const startedAt = Date.now();
    const auth = await authenticateRequest(request);
    enforceRateLimits(request, auth);
    const body = bodySchema.parse(request.body);
    const messages2 = body.messages;
    const resolved = await resolveModelInput(body.model);
    let slug2 = resolved.slug;
    if (resolved.auto) {
      const hints = extractHints(messages2);
      hints.preferFree = true;
      const autoSlug = await resolveAutoModel(hints);
      if (!autoSlug) throw new ApiError("provider_unavailable", "No models are currently available for auto routing.");
      slug2 = autoSlug;
    }
    const ctx = await loadModelContext(slug2);
    if (!ctx) throw new ApiError("model_not_found", `Model '${body.model}' not found.`);
    if (ctx.model.status === "coming_soon") throw new ApiError("provider_unavailable", `'${ctx.model.name}' is coming soon and not yet available.`);
    if (ctx.model.status !== "active") throw new ApiError("model_not_found", `Model '${slug2}' is not available.`);
    const effectivePricing = resolveEffectivePricing(ctx.model, ctx.pricing, ctx.tier, await getUsdToInrRate());
    const requiresAstra = slug2 === "uno-gpt-astra" || ctx.model.metadata?.requiresAstra === true;
    if (requiresAstra && await getFlag("astra_promotion", true)) {
      const astra = await getActiveAstra(auth.user.id);
      if (!astra) throw new ApiError("astra_entitlement_required", "GPT Astra requires an active 7-day access entitlement. Redeem an Astra code to continue.");
    }
    if (auth.apiKey?.allowedModels?.length && !auth.apiKey.allowedModels.includes(slug2)) {
      throw new ApiError("forbidden", "This API key is not permitted to use the requested model.");
    }
    const candidates = await hydrateCandidates(ctx.model.id, resolved.forcedProvider);
    if (candidates.length === 0) {
      throw new ApiError("provider_unavailable", `No providers are configured for '${ctx.model.name}'.`);
    }
    const plan = await getUserPlan(auth.user.id);
    const fallbackEnabled = await getFlag("provider_fallback", true);
    const isFree = ctx.model.isFree;
    const stream = body.stream === true;
    let queueWaitMs = 0;
    let acquired = false;
    let acquiredKey = "";
    let slotServiceStart = 0;
    let sseStarted = false;
    if (isFree) {
      const modelLimitsRow = ctx.limits;
      const quota = await consumeFreeQuota(auth.user.id, {
        perMinute: plan.freeRpm,
        perHour: (modelLimitsRow?.perHour ?? 30) * plan.freeRpm,
        perDay: (modelLimitsRow?.perDay ?? 200) * plan.freeRpm
      });
      if (!quota.allowed) {
        throw new ApiError("free_quota_exceeded", `Free ${quota.window} quota reached (${quota.limit}). Upgrade your plan or try again later.`, { retryAfter: quota.retryAfterSec });
      }
    } else {
      const inputTokens = countMessageTokens(messages2);
      const maxOut = Math.min(body.max_tokens ?? body.max_completion_tokens ?? 4096, ctx.model.maxOutputTokens);
      const feePercent = await getNumber("PLATFORM_FEE_PERCENT", 0);
      const estimated = requestCost({
        inputTokens,
        outputTokens: maxOut,
        inputPricePerMillion: effectivePricing.pricing.inputPerMillion,
        outputPricePerMillion: effectivePricing.pricing.outputPerMillion,
        platformFeePercent: feePercent
      });
      await assertAffordable(auth.user.id, estimated);
    }
    const decision = routeRequest(candidates, {
      planSlug: plan.slug,
      fallbackEnabled,
      preferFree: isFree
    });
    if (!decision) {
      throw new ApiError("provider_unavailable", `All providers for '${ctx.model.name}' are currently unhealthy. Please retry shortly.`);
    }
    const adapterParams = {
      model: decision.primary.upstreamModelId,
      messages: applyPersonaToMessages(messages2, ctx.model.name, ctx.model.slug),
      stream,
      temperature: body.temperature,
      topP: body.top_p,
      maxTokens: body.max_tokens ?? body.max_completion_tokens,
      stop: Array.isArray(body.stop) ? body.stop : body.stop ? [body.stop] : void 0,
      tools: body.tools,
      toolChoice: body.tool_choice,
      responseFormat: body.response_format,
      seed: body.seed,
      raw: body
    };
    const db2 = await getDb();
    await db2.insert(requests).values({
      id: requestId,
      userId: auth.user.id,
      apiKeyId: auth.apiKey?.id ?? null,
      modelId: ctx.model.id,
      providerId: decision.primary.providerId,
      status: "queued",
      route: resolved.auto ? "auto" : resolved.forcedProvider ? "direct" : "direct",
      streaming: stream,
      isFree,
      usageSource: "none",
      ip: request.ip
    });
    const finalize = async (params) => {
      const usage = params.usage;
      const usageSource = params.usageSource ?? "none";
      const billEstimated = usageSource === "estimated" ? await getFlag("BILL_ESTIMATED_USAGE", false) : false;
      let cost = 0;
      if (!isFree && !params.errorCode && (usage.prompt_tokens > 0 || usage.completion_tokens > 0) && (usageSource === "upstream" || billEstimated)) {
        const feePercent = await getNumber("PLATFORM_FEE_PERCENT", 0);
        cost = requestCost({
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          inputPricePerMillion: effectivePricing.pricing.inputPerMillion,
          outputPricePerMillion: effectivePricing.pricing.outputPerMillion,
          platformFeePercent: feePercent
        });
        const debit = await debitWallet({ userId: auth.user.id, amountPaise: cost, reference: requestId, idempotencyKey: `usage:${requestId}`, metadata: { model: slug2, provider: params.providerSlug } });
        cost = debit.deductedPaise;
      }
      await db2.update(requests).set({
        status: params.status ?? (params.errorCode ? "error" : "success"),
        httpStatus: params.httpStatus ?? (params.errorCode ? 502 : 200),
        latencyMs: Date.now() - startedAt,
        ttftMs: params.ttftMs,
        queueWaitMs,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        costPaise: cost,
        usageSource,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        providerId: params.providerId
      }).where(eq10(requests.id, requestId));
      if (auth.apiKey) {
        await db2.update(apiKeys).set({ requestCount: sql5`${apiKeys.requestCount} + 1`, spendPaise: sql5`${apiKeys.spendPaise} + ${cost}`, lastUsedAt: /* @__PURE__ */ new Date() }).where(eq10(apiKeys.id, auth.apiKey.id));
      }
      return cost;
    };
    try {
      if (!stream) {
        if (isFree) {
          const concurrency = ctx.limits?.concurrency ?? plan.concurrency;
          const slot = await acquireSlot(slug2, concurrency, plan.queuePriority);
          acquired = true;
          acquiredKey = slug2;
          queueWaitMs = slot.queueWaitMs;
          slotServiceStart = Date.now();
        }
        const result = await executeChat(decision, adapterParams);
        for (const a of result.attempts) {
          await db2.insert(requestAttempts).values({ requestId, providerId: null, attempt: result.attempts.indexOf(a) + 1, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error });
        }
        const cost2 = await finalize({ usage: result.usage, usageSource: result.usageSource, providerId: decision.primary.providerId, providerSlug: result.providerSlug, ttftMs: null });
        reply.header("x-prorouter-usage-source", result.usageSource);
        const created2 = Math.floor(Date.now() / 1e3);
        return reply.send({
          id: requestId,
          object: "chat.completion",
          created: created2,
          model: body.model || slug2,
          choices: [{ index: 0, message: { role: "assistant", content: sanitizeModelOutput(result.content, ctx.model.name), tool_calls: result.toolCalls.length ? result.toolCalls : void 0 }, finish_reason: result.finishReason }],
          usage: result.usage,
          uno: {
            request_id: requestId,
            provider: result.providerSlug,
            route: decision.trace,
            queue_wait_ms: queueWaitMs,
            cost_paise: cost2,
            is_free: isFree,
            usage_source: result.usageSource
          }
        });
      }
      reply.hijack();
      sseStarted = true;
      const res = reply.raw;
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-request-id": requestId,
        "x-accel-buffering": "no"
      });
      const write = (payload) => res.write(`data: ${JSON.stringify(payload)}

`);
      const chunkId = `chatcmpl-${requestId.slice(4)}`;
      const created = Math.floor(Date.now() / 1e3);
      const oaiChunk = (delta, finish = null) => ({
        id: chunkId,
        object: "chat.completion.chunk",
        created,
        model: body.model || slug2,
        choices: [{ index: 0, delta, finish_reason: finish }]
      });
      if (isFree) {
        const status = probeQueue(slug2, plan.queuePriority);
        write({ uno_queue: { model: slug2, ...status, message: status.ready ? "Ready \u2014 instant response" : "Provider capacity limited" } });
        const concurrency = ctx.limits?.concurrency ?? plan.concurrency;
        const slot = await acquireSlot(slug2, concurrency, plan.queuePriority, (s) => {
          write({ uno_queue: { model: slug2, ...s, message: s.ready ? "Ready \u2014 instant response" : "Provider capacity limited" } });
        });
        acquired = true;
        acquiredKey = slug2;
        queueWaitMs = slot.queueWaitMs;
        slotServiceStart = Date.now();
        write({ uno_queue: { model: slug2, position: 0, ready: true, estimatedWaitMs: 0, waitedMs: queueWaitMs, message: "Ready \u2014 starting response" } });
      }
      write(oaiChunk({ role: "assistant", content: "" }));
      let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      let usageSource = "none";
      let ttftMs = null;
      let contentSoFar = "";
      let finishReason = "stop";
      let providerSlug = decision.primary.providerSlug;
      try {
        const outcome = await (async () => {
          const iterator = streamChat(decision, adapterParams);
          while (true) {
            const step = await iterator.next();
            if (step.done) return step.value;
            const ev = step.value;
            if (ev.type === "start") {
              write({ uno_start: { provider: decision.primary.providerSlug } });
            } else if (ev.type === "delta") {
              if (ttftMs === null) ttftMs = Date.now() - startedAt;
              const sanitizedText = sanitizeModelOutput(ev.text, ctx.model.name);
              contentSoFar += sanitizedText;
              write(oaiChunk({ content: sanitizedText }));
            } else if (ev.type === "reasoning_delta") {
              if (ctx.caps?.reasoning) {
                const sanitizedReasoning = sanitizeModelOutput(ev.text, ctx.model.name);
                write({ id: chunkId, object: "chat.completion.chunk", created, model: body.model || slug2, choices: [], uno_reasoning: sanitizedReasoning });
              }
            } else if (ev.type === "tool_call_delta") {
              write(oaiChunk({ tool_calls: [{ index: ev.index, id: ev.id, type: "function", function: { name: ev.name, arguments: ev.arguments ?? "" } }] }));
            } else if (ev.type === "usage") {
              usage = ev.usage;
              usageSource = ev.usageSource;
            } else if (ev.type === "done") {
              finishReason = ev.finishReason;
            }
          }
        })();
        providerSlug = outcome.providerSlug;
        usage = outcome.usage;
        usageSource = outcome.usageSource;
        finishReason = outcome.finishReason;
        for (const a of outcome.attempts) {
          await db2.insert(requestAttempts).values({ requestId, attempt: outcome.attempts.indexOf(a) + 1, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Provider error";
        write({ error: { code: "provider_error", message, request_id: requestId } });
        await finalize({ usage, usageSource, providerId: decision.primary.providerId, providerSlug, ttftMs, errorCode: err instanceof ApiError ? err.code : "provider_error", errorMessage: message, httpStatus: 502, status: "error" }).catch(() => void 0);
        res.end();
        return;
      }
      write(oaiChunk({}, finishReason));
      if (usage.total_tokens === 0) {
        usage = {
          prompt_tokens: countMessageTokens(messages2),
          completion_tokens: estimateTokens(contentSoFar),
          total_tokens: countMessageTokens(messages2) + estimateTokens(contentSoFar)
        };
        usageSource = "estimated";
      }
      const cost = await finalize({ usage, usageSource, providerId: decision.primary.providerId, providerSlug, ttftMs });
      write({ id: chunkId, object: "chat.completion.chunk", created, model: body.model || slug2, choices: [], usage, uno: { request_id: requestId, provider: providerSlug, cost_paise: cost, is_free: isFree, queue_wait_ms: queueWaitMs, route: decision.trace, usage_source: usageSource } });
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : err instanceof Error && err.code === "rate_limited" ? new ApiError("provider_error", err.message) : new ApiError("provider_error", err?.message ?? "Provider error");
      if (sseStarted) {
        try {
          reply.raw.write(`data: ${JSON.stringify({ error: apiErr.toBody(requestId).error })}

`);
          reply.raw.write("data: [DONE]\n\n");
          reply.raw.end();
        } catch {
        }
        await finalize({ usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, providerId: decision.primary.providerId, providerSlug: decision.primary.providerSlug, ttftMs: null, errorCode: apiErr.code, errorMessage: apiErr.message, httpStatus: apiErr.status, status: "error" }).catch(() => void 0);
        return;
      }
      await finalize({ usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, providerId: decision.primary.providerId, providerSlug: decision.primary.providerSlug, ttftMs: null, errorCode: apiErr.code, errorMessage: apiErr.message, httpStatus: apiErr.status, status: "error" }).catch(() => void 0);
      throw apiErr;
    } finally {
      if (acquired) releaseSlot(acquiredKey, slotServiceStart ? Date.now() - slotServiceStart : 0);
    }
  });
}

// apps/api/src/routes/wallet.ts
import { z as z5 } from "zod";
import { createHmac, randomUUID } from "node:crypto";
import { desc as desc5, eq as eq11 } from "drizzle-orm";
async function walletRoutes(app) {
  app.get("/wallet", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    const rows = await db2.select().from(walletTransactions).where(eq11(walletTransactions.userId, user.id)).orderBy(desc5(walletTransactions.createdAt)).limit(50);
    const balance = await getBalance(user.id);
    return {
      balancePaise: balance,
      balanceFormatted: formatMoney(balance),
      currency: "INR",
      transactions: rows.map((t) => ({
        id: t.id,
        type: t.type,
        amountPaise: t.amountPaise,
        amountFormatted: formatMoney(t.amountPaise),
        balanceAfterPaise: t.balanceAfterPaise,
        reference: t.reference,
        createdAt: t.createdAt.toISOString()
      }))
    };
  });
  app.get("/wallet/packages", async () => {
    const db2 = await getDb();
    const rows = await db2.select().from(creditPackages).where(eq11(creditPackages.active, true));
    return {
      items: rows.sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        pricePaise: p.pricePaise,
        priceFormatted: formatMoney(p.pricePaise),
        bonusPaise: p.bonusPaise,
        totalPaise: p.pricePaise + p.bonusPaise,
        totalFormatted: formatMoney(p.pricePaise + p.bonusPaise),
        currency: p.currency
      }))
    };
  });
  app.post("/wallet/checkout", async (request, reply) => {
    const user = await requireUser(request);
    const rl = checkRateLimit(`user:${user.id}:checkout`, 10, 60);
    if (!rl.allowed) throw new ApiError("rate_limit_exceeded", "Too many checkout attempts.");
    const body = z5.object({ packageSlug: z5.string(), idempotencyKey: z5.string().min(8).max(128).optional() }).parse(request.body);
    const db2 = await getDb();
    const pkg = (await db2.select().from(creditPackages).where(eq11(creditPackages.slug, body.packageSlug)))[0];
    if (!pkg || !pkg.active) throw new ApiError("not_found", "Credit package not found.");
    if (body.idempotencyKey) {
      const existing = await db2.select().from(payments).where(eq11(payments.idempotencyKey, body.idempotencyKey));
      if (existing.length > 0) {
        const p = existing[0];
        return reply.send({ paymentId: p.id, invoice: p.invoiceNumber, amountPaise: p.amountPaise, status: p.status, gateway: p.gateway, gatewayOrderId: p.gatewayOrderId });
      }
    }
    if (!env.razorpayKeyId || !env.razorpayKeySecret) {
      throw new ApiError("provider_unavailable", "Online payments are not configured on this deployment yet. Contact an administrator to add wallet credits.");
    }
    const invoice = `PRO-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const paymentRows = await db2.insert(payments).values({
      userId: user.id,
      packageId: pkg.id,
      gateway: "razorpay",
      amountPaise: pkg.pricePaise,
      status: "created",
      idempotencyKey: body.idempotencyKey ?? null,
      invoiceNumber: invoice,
      metadata: { bonusPaise: pkg.bonusPaise, packageSlug: pkg.slug }
    }).returning();
    const payment = paymentRows[0];
    const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: pkg.pricePaise, currency: "INR", receipt: invoice, notes: { uno_payment_id: payment.id } })
    });
    if (!res.ok) {
      const text7 = await res.text();
      throw new ApiError("provider_error", `Payment gateway error: ${text7.slice(0, 200)}`);
    }
    const order = await res.json();
    await db2.update(payments).set({ gatewayOrderId: order.id, updatedAt: /* @__PURE__ */ new Date() }).where(eq11(payments.id, payment.id));
    return reply.send({ paymentId: payment.id, invoice, amountPaise: pkg.pricePaise, currency: "INR", gateway: "razorpay", gatewayOrderId: order.id, keyId: env.razorpayKeyId });
  });
  app.post("/payments/razorpay/webhook", async (request, reply) => {
    const signature = request.headers["x-razorpay-signature"];
    if (typeof signature !== "string" || !env.razorpayWebhookSecret) {
      throw new ApiError("forbidden", "Webhook not configured or signature missing.");
    }
    const raw = request.rawBody ?? JSON.stringify(request.body);
    const expected = createHmac("sha256", env.razorpayWebhookSecret).update(raw).digest("hex");
    if (expected !== signature) throw new ApiError("forbidden", "Invalid webhook signature.");
    const event = request.body;
    const paymentEntity = event.payload?.payment?.entity;
    const eventId = `${event.event}:${paymentEntity?.id ?? "unknown"}:${paymentEntity?.order_id ?? ""}`;
    const db2 = await getDb();
    const existingEvents = await db2.select().from(paymentWebhooks).where(eq11(paymentWebhooks.eventId, eventId));
    if (existingEvents.length > 0) return reply.send({ status: "duplicate_ignored" });
    await db2.insert(paymentWebhooks).values({ eventId, gateway: "razorpay", payload: event, signatureValid: true });
    if (event.event !== "payment.captured") return reply.send({ status: "ignored" });
    const paymentRows = paymentEntity?.order_id ? await db2.select().from(payments).where(eq11(payments.gatewayOrderId, paymentEntity.order_id)) : [];
    const payment = paymentRows[0];
    if (!payment) throw new ApiError("not_found", "Payment not found for order.");
    if (payment.creditedAt) return reply.send({ status: "already_credited" });
    if (payment.status === "captured") return reply.send({ status: "already_credited" });
    const bonus = Number(payment.metadata?.bonusPaise ?? 0);
    await creditWallet({
      userId: payment.userId,
      amountPaise: payment.amountPaise + bonus,
      type: "topup",
      reference: payment.invoiceNumber,
      idempotencyKey: `pay:${payment.id}`,
      metadata: { paymentId: payment.id, gatewayPaymentId: paymentEntity?.id, bonus }
    });
    await db2.update(payments).set({ status: "captured", gatewayPaymentId: paymentEntity?.id ?? null, creditedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq11(payments.id, payment.id));
    return reply.send({ status: "credited" });
  });
  app.get("/payments", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    const rows = await db2.select().from(payments).where(eq11(payments.userId, user.id)).orderBy(desc5(payments.createdAt)).limit(50);
    return {
      items: rows.map((p) => ({
        id: p.id,
        invoice: p.invoiceNumber,
        amountPaise: p.amountPaise,
        amountFormatted: formatMoney(p.amountPaise),
        gateway: p.gateway,
        status: p.status,
        createdAt: p.createdAt.toISOString()
      }))
    };
  });
}

// apps/api/src/routes/promotions.ts
import { z as z6 } from "zod";
import { and as and6, desc as desc6, eq as eq12, gt as gt2, lt, sql as sql6 } from "drizzle-orm";
async function getActiveCampaign() {
  const db2 = await getDb();
  const now = /* @__PURE__ */ new Date();
  const rows = await db2.select().from(astraCampaigns).where(and6(eq12(astraCampaigns.active, true), lt(astraCampaigns.startsAt, now))).orderBy(desc6(astraCampaigns.startsAt));
  return rows.find((c) => !c.endsAt || c.endsAt > now) ?? null;
}
async function getOrCreatePersonalCode(userId, campaignId) {
  const db2 = await getDb();
  const existing = await db2.select().from(giftCodes).where(and6(eq12(giftCodes.ownerUserId, userId), eq12(giftCodes.campaignId, campaignId)));
  if (existing[0]) return existing[0].code;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `PRO-${randomCode(6)}`;
    const clash = await db2.select({ id: giftCodes.id }).from(giftCodes).where(eq12(giftCodes.code, code));
    if (clash.length === 0) {
      await db2.insert(giftCodes).values({ campaignId, code, ownerUserId: userId, status: "active" });
      return code;
    }
  }
  throw new ApiError("internal_error", "Could not allocate a referral code. Please retry.");
}
async function promotionRoutes(app) {
  app.get("/promotions/astra", async (request) => {
    const enabled = await getFlag("astra_promotion", true);
    const campaign = await getActiveCampaign();
    if (!enabled || !campaign) return { available: false, campaign: null };
    let entitlement = null;
    let myCode = null;
    try {
      const user = await requireUser(request);
      const db2 = await getDb();
      const ent = await db2.select().from(astraEntitlements).where(and6(eq12(astraEntitlements.userId, user.id), eq12(astraEntitlements.status, "active"), gt2(astraEntitlements.expiresAt, /* @__PURE__ */ new Date()))).orderBy(desc6(astraEntitlements.activatedAt));
      if (ent[0]) {
        const msLeft = ent[0].expiresAt.getTime() - Date.now();
        entitlement = { activatedAt: ent[0].activatedAt.toISOString(), expiresAt: ent[0].expiresAt.toISOString(), daysLeft: Math.max(0, Math.ceil(msLeft / 864e5)) };
      }
      myCode = await getOrCreatePersonalCode(user.id, campaign.id);
    } catch {
    }
    return {
      available: true,
      campaign: {
        name: campaign.name,
        originalPricePaise: campaign.originalPricePaise,
        originalPriceFormatted: formatMoney(campaign.originalPricePaise),
        discountPercent: campaign.discountPercent,
        promoPricePaise: campaign.promoPricePaise,
        promoPriceFormatted: formatMoney(campaign.promoPricePaise),
        trialDays: campaign.trialDays,
        endsAt: campaign.endsAt?.toISOString() ?? null,
        active: campaign.active
      },
      entitlement,
      myCode
    };
  });
  app.post("/promotions/astra/redeem", async (request, reply) => {
    const user = await requireUser(request);
    const enabled = await getFlag("astra_promotion", true);
    if (!enabled) throw new ApiError("campaign_inactive", "The Astra promotion is currently inactive.");
    const body = z6.object({ code: z6.string().min(4).max(32) }).parse(request.body);
    const rawCode = body.code.trim().toUpperCase();
    const db2 = await getDb();
    const campaign = await getActiveCampaign();
    if (!campaign) throw new ApiError("campaign_inactive", "No active Astra campaign.");
    const codes = await db2.select().from(giftCodes).where(eq12(giftCodes.code, rawCode));
    const code = codes[0];
    if (!code) throw new ApiError("invalid_code", "This code is not valid.");
    if (code.status !== "active") throw new ApiError("invalid_code", "This code has been suspended or revoked.");
    if (code.expiresAt && code.expiresAt < /* @__PURE__ */ new Date()) throw new ApiError("code_expired", "This code has expired.");
    if (code.ownerUserId && code.ownerUserId === user.id) {
      throw new ApiError("self_redemption_not_allowed", "You cannot redeem your own referral code. Share it with a friend instead.");
    }
    const already = await db2.select().from(giftCodeRedemptions).where(and6(eq12(giftCodeRedemptions.codeId, code.id), eq12(giftCodeRedemptions.redeemerUserId, user.id)));
    if (already.length > 0) throw new ApiError("already_redeemed", "You have already redeemed this code.");
    const maxPerCode = code.maxRedemptions ?? campaign.maxRedemptionsPerCode ?? null;
    if (!campaign.allowMultiRedeem && code.redemptionCount > 0) {
      throw new ApiError("already_redeemed", "This code has already been used.");
    }
    if (maxPerCode !== null && code.redemptionCount >= maxPerCode) {
      throw new ApiError("invalid_code", "This code has reached its redemption limit.");
    }
    const activatedAt = /* @__PURE__ */ new Date();
    const expiresAt = new Date(activatedAt.getTime() + campaign.trialDays * 864e5);
    try {
      await db2.transaction(async (tx) => {
        await tx.insert(giftCodeRedemptions).values({ campaignId: campaign.id, codeId: code.id, redeemerUserId: user.id });
        await tx.update(giftCodes).set({ redemptionCount: sql6`${giftCodes.redemptionCount} + 1` }).where(eq12(giftCodes.id, code.id));
        await tx.insert(astraEntitlements).values({ userId: user.id, campaignId: campaign.id, sourceCodeId: code.id, activatedAt, expiresAt, status: "active" });
        await tx.insert(notifications).values({
          userId: user.id,
          type: "astra_activated",
          title: "\u{1F389} Astra activated!",
          body: `Your GPT Astra access is active for ${campaign.trialDays} days.`,
          href: "/dashboard/astra"
        });
        await tx.insert(auditLogs).values({ actorUserId: user.id, action: "astra.redeem", targetType: "gift_code", targetId: code.id, metadata: { campaign: campaign.slug } });
      });
    } catch (err) {
      if (String(err.message).includes("redemptions_code_user_uq")) {
        throw new ApiError("already_redeemed", "You have already redeemed this code.");
      }
      if (String(err.message).includes("astra_entitlements_code_user_uq")) {
        throw new ApiError("already_redeemed", "You have already redeemed this code.");
      }
      throw err;
    }
    return reply.send({
      success: true,
      entitlement: { activatedAt: activatedAt.toISOString(), expiresAt: expiresAt.toISOString(), daysLeft: campaign.trialDays },
      message: "Astra activated!"
    });
  });
  app.get("/promotions/astra/referral", async (request) => {
    const user = await requireUser(request);
    const enabled = await getFlag("referral_system", true);
    if (!enabled) throw new ApiError("forbidden", "Referral system is disabled.");
    const campaign = await getActiveCampaign();
    if (!campaign) throw new ApiError("campaign_inactive", "No active campaign.");
    const db2 = await getDb();
    const code = await getOrCreatePersonalCode(user.id, campaign.id);
    const codes = await db2.select().from(giftCodes).where(eq12(giftCodes.code, code));
    const codeRow = codes[0];
    const redemptions = await db2.select({ count: sql6`count(*)::int` }).from(giftCodeRedemptions).where(eq12(giftCodeRedemptions.codeId, codeRow.id));
    const activeCount = await db2.select({ count: sql6`count(*)::int` }).from(astraEntitlements).where(and6(eq12(astraEntitlements.sourceCodeId, codeRow.id), eq12(astraEntitlements.status, "active"), gt2(astraEntitlements.expiresAt, /* @__PURE__ */ new Date())));
    return {
      code,
      sharePath: `/redeem?code=${code}`,
      successfulRedemptions: redemptions[0]?.count ?? 0,
      activeAstraUsers: activeCount[0]?.count ?? 0,
      trialDays: campaign.trialDays
    };
  });
}

// apps/api/src/routes/admin.ts
import { z as z7 } from "zod";
import { and as and7, desc as desc7, eq as eq13, gte as gte2, sql as sql7 } from "drizzle-orm";
async function runHealthCheck(providerId) {
  const db2 = await getDb();
  const rows = await db2.select().from(providers).where(eq13(providers.id, providerId));
  const provider = rows[0];
  if (!provider) throw new ApiError("not_found", "Provider not found.");
  const creds = await db2.select().from(providerCredentials).where(eq13(providerCredentials.providerId, providerId));
  const candidate = {
    linkId: "",
    providerId: provider.id,
    providerSlug: provider.slug,
    providerName: provider.name,
    upstreamModelId: "",
    linkPriority: 0,
    providerPriority: provider.priority,
    providerStatus: provider.status,
    linkStatus: "active",
    timeoutMs: provider.timeoutMs,
    retryCount: provider.retryCount,
    health: null,
    inputPerMillion: 0,
    outputPerMillion: 0,
    isFree: false
  };
  const adapter = await getAdapter(candidate);
  const result = await adapter.healthCheck();
  const status = result.available ? "active" : creds.length > 0 ? "degraded" : "unknown";
  await db2.insert(providerHealth).values({ providerId, available: result.available, latencyMs: result.latencyMs, successRateBp: result.available ? 1e4 : 0, errorRateBp: result.available ? 0 : 1e4, message: result.message ?? null });
  await db2.update(providers).set({ status, healthMessage: result.message ?? null, lastHealthAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq13(providers.id, providerId));
  return { available: result.available, latencyMs: result.latencyMs, message: result.message ?? null, status };
}
var providerSchema = z7.object({
  name: z7.string().min(1).max(64),
  slug: z7.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  endpointUrl: z7.string().url(),
  adapterType: z7.enum(["openai", "anthropic", "openrouter", "groq", "mistral", "ollama", "custom_openai", "freemodels"]).default("openai"),
  region: z7.string().max(32).default("global"),
  priority: z7.number().int().min(1).max(1e3).default(100),
  timeoutMs: z7.number().int().min(1e3).max(3e5).default(6e4),
  retryCount: z7.number().int().min(0).max(10).default(2),
  description: z7.string().max(500).default(""),
  capabilities: z7.array(z7.string()).default([]),
  retentionPolicy: z7.string().max(64).default("zero_retention")
});
var modelSchema = z7.object({
  slug: z7.string().min(1).max(96).regex(/^[a-z0-9.\-]+$/),
  name: z7.string().min(1).max(96),
  description: z7.string().max(1e3).default(""),
  status: z7.enum(["active", "coming_soon", "disabled", "archived"]).default("active"),
  isFree: z7.boolean().default(false),
  contextWindow: z7.number().int().min(1e3).max(1e7).default(128e3),
  maxOutputTokens: z7.number().int().min(100).max(2e6).default(8192),
  rank: z7.number().int().min(0).max(1e4).default(100),
  pricingTier: z7.string().min(1).max(48).regex(/^[a-z0-9-]+$/).nullable().optional(),
  inputPerMillion: z7.number().int().min(0).default(0),
  outputPerMillion: z7.number().int().min(0).default(0),
  reasoning: z7.boolean().default(false),
  toolCalls: z7.boolean().default(false),
  vision: z7.boolean().default(false),
  structuredOutputs: z7.boolean().default(false),
  links: z7.array(z7.object({ providerSlug: z7.string(), providerModelId: z7.string().min(1), priority: z7.number().int().default(100) })).default([])
});
var pricingTierSchema = z7.object({
  slug: z7.string().min(1).max(48).regex(/^[a-z0-9-]+$/),
  name: z7.string().min(1).max(64),
  description: z7.string().max(500).default(""),
  inputUsdCentsPerMillion: z7.number().int().min(0).max(1e7),
  outputUsdCentsPerMillion: z7.number().int().min(0).max(1e7),
  cachedInputUsdCentsPerMillion: z7.number().int().min(0).max(1e7).nullable().optional(),
  sortOrder: z7.number().int().min(0).max(1e4).default(100),
  active: z7.boolean().default(true)
});
var pricingTierPatchSchema = z7.object({
  slug: z7.string().min(1).max(48).regex(/^[a-z0-9-]+$/).optional(),
  name: z7.string().min(1).max(64).optional(),
  description: z7.string().max(500).optional(),
  inputUsdCentsPerMillion: z7.number().int().min(0).max(1e7).optional(),
  outputUsdCentsPerMillion: z7.number().int().min(0).max(1e7).optional(),
  cachedInputUsdCentsPerMillion: z7.number().int().min(0).max(1e7).nullable().optional(),
  sortOrder: z7.number().int().min(0).max(1e4).optional(),
  active: z7.boolean().optional()
});
async function assertPricingTier(slug2) {
  const db2 = await getDb();
  const rows = await db2.select({ id: pricingTiers.id }).from(pricingTiers).where(eq13(pricingTiers.slug, slug2));
  if (!rows[0]) throw new ApiError("invalid_request", `Unknown pricing tier '${slug2}'.`);
}
async function adminRoutes(app) {
  app.get("/admin/overview", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    const since = new Date(Date.now() - 30 * 864e5);
    const [userCount] = await db2.select({ n: sql7`count(*)::int` }).from(users);
    const [reqCount] = await db2.select({ n: sql7`count(*)::int` }).from(requests).where(gte2(requests.createdAt, since));
    const revenue = await db2.select({ total: sql7`coalesce(sum(${payments.amountPaise}),0)::bigint` }).from(payments).where(eq13(payments.status, "captured"));
    const spend = await db2.select({ total: sql7`coalesce(sum(-${walletTransactions.amountPaise}),0)::bigint` }).from(walletTransactions).where(eq13(walletTransactions.type, "usage"));
    const balance = await db2.select({ total: sql7`coalesce(sum(${wallets.balancePaise}),0)::bigint` }).from(wallets);
    const [redemptions] = await db2.select({ n: sql7`count(*)::int` }).from(giftCodeRedemptions);
    const [ents] = await db2.select({ n: sql7`count(*)::int` }).from(astraEntitlements).where(gte2(astraEntitlements.expiresAt, /* @__PURE__ */ new Date()));
    const [freeReqs] = await db2.select({ n: sql7`count(*)::int` }).from(requests).where(and7(gte2(requests.createdAt, since), eq13(requests.isFree, true)));
    return {
      users: userCount?.n ?? 0,
      requests30d: reqCount?.n ?? 0,
      freeRequests30d: freeReqs?.n ?? 0,
      revenuePaise: Number(revenue[0]?.total ?? 0),
      revenueFormatted: formatMoney(Number(revenue[0]?.total ?? 0)),
      creditsConsumedPaise: Number(spend[0]?.total ?? 0),
      walletBalancePaise: Number(balance[0]?.total ?? 0),
      astraRedemptions: redemptions?.n ?? 0,
      activeAstraUsers: ents?.n ?? 0
    };
  });
  app.get("/admin/requests", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const q = request.query;
    const db2 = await getDb();
    const rows = await db2.select({ r: requests, u: email(users), m: slug(models), p: slug(providers) }).from(requests).leftJoin(users, eq13(users.id, requests.userId)).leftJoin(models, eq13(models.id, requests.modelId)).leftJoin(providers, eq13(providers.id, requests.providerId)).orderBy(desc7(requests.createdAt)).limit(Math.min(Number(q.limit ?? 50), 200));
    return { items: rows.map((x) => ({ id: x.r.id, createdAt: x.r.createdAt.toISOString(), user: x.u, model: x.m, provider: x.p, status: x.r.status, httpStatus: x.r.httpStatus, latencyMs: x.r.latencyMs, costPaise: x.r.costPaise, tokens: x.r.totalTokens, errorCode: x.r.errorCode })) };
  });
  app.get("/admin/providers", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    const rows = await db2.select().from(providers).orderBy(providers.priority);
    const creds = await db2.select().from(providerCredentials);
    return { items: rows.map((p) => ({ ...p, hasCredential: creds.some((c) => c.providerId === p.id), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) };
  });
  app.post("/admin/providers", async (request, reply) => {
    const admin = await requireRole(request, ["admin"]);
    const body = providerSchema.parse(request.body);
    const db2 = await getDb();
    const rows = await db2.insert(providers).values(body).returning();
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "provider.create", targetType: "provider", targetId: rows[0].id, metadata: { slug: body.slug } });
    return reply.status(201).send({ provider: rows[0] });
  });
  app.patch("/admin/providers/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = providerSchema.partial().partial().parse(request.body);
    const db2 = await getDb();
    const rows = await db2.update(providers).set({ ...body, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(providers.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Provider not found.");
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "provider.update", targetType: "provider", targetId: id, metadata: body });
    return { provider: rows[0] };
  });
  app.put("/admin/providers/:id/credential", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = z7.object({ apiKey: z7.string().min(1).max(512) }).parse(request.body);
    const db2 = await getDb();
    const prov = await db2.select().from(providers).where(eq13(providers.id, id));
    if (!prov[0]) throw new ApiError("not_found", "Provider not found.");
    const enc = encryptSecret(body.apiKey);
    await db2.insert(providerCredentials).values({ providerId: id, keyName: "default", ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true }).onConflictDoUpdate({ target: [providerCredentials.providerId, providerCredentials.keyName], set: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true } });
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "provider.credential_set", targetType: "provider", targetId: id });
    return { ok: true, message: "Credential stored encrypted." };
  });
  app.post("/admin/providers/:id/check", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const { id } = request.params;
    return runHealthCheck(id);
  });
  app.get("/admin/models", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    const rows = await db2.select({ m: models, p: modelPricing, t: pricingTiers }).from(models).leftJoin(modelPricing, eq13(modelPricing.modelId, models.id)).leftJoin(pricingTiers, eq13(pricingTiers.slug, models.pricingTier)).orderBy(models.rank);
    return { items: rows.map((r) => ({ ...r.m, pricing: r.p, tier: r.t })) };
  });
  app.post("/admin/models", async (request, reply) => {
    const admin = await requireRole(request, ["admin"]);
    const body = modelSchema.parse(request.body);
    const db2 = await getDb();
    const exists = await db2.select({ id: models.id }).from(models).where(eq13(models.slug, body.slug));
    if (exists[0]) throw new ApiError("invalid_request", "A model with this slug already exists.");
    const pricingTier = body.pricingTier ?? null;
    if (pricingTier) await assertPricingTier(pricingTier);
    const [model] = await db2.insert(models).values({ slug: body.slug, name: body.name, description: body.description, status: body.status, isFree: body.isFree, contextWindow: body.contextWindow, maxOutputTokens: body.maxOutputTokens, rank: body.rank, pricingTier, type: "chat" }).returning();
    if (!pricingTier) {
      await db2.insert(modelPricing).values({ modelId: model.id, inputPerMillion: body.inputPerMillion, outputPerMillion: body.outputPerMillion, currency: "INR" });
    }
    await db2.insert(modelCapabilities).values({ modelId: model.id, reasoning: body.reasoning, toolCalls: body.toolCalls, vision: body.vision, structuredOutputs: body.structuredOutputs, streaming: true, jsonMode: true });
    if (body.isFree) await db2.insert(modelLimits).values({ modelId: model.id, perMinute: 1, perHour: 30, perDay: 200, concurrency: 1, queuePriority: 5 });
    for (const link of body.links) {
      const prov = (await db2.select().from(providers).where(eq13(providers.slug, link.providerSlug)))[0];
      if (!prov) continue;
      await db2.insert(modelProviders).values({ modelId: model.id, providerId: prov.id, providerModelId: link.providerModelId, priority: link.priority, status: "active" }).onConflictDoNothing();
    }
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "model.create", targetType: "model", targetId: model.id, metadata: { slug: body.slug } });
    return reply.status(201).send({ model });
  });
  app.patch("/admin/models/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = z7.object({
      name: z7.string().optional(),
      description: z7.string().optional(),
      status: z7.enum(["active", "coming_soon", "disabled", "archived"]).optional(),
      isFree: z7.boolean().optional(),
      rank: z7.number().int().optional(),
      contextWindow: z7.number().int().optional(),
      pricingTier: z7.string().min(1).max(48).regex(/^[a-z0-9-]+$/).nullable().optional(),
      inputPerMillion: z7.number().int().min(0).optional(),
      outputPerMillion: z7.number().int().min(0).optional()
    }).parse(request.body);
    const db2 = await getDb();
    const { inputPerMillion, outputPerMillion, pricingTier, ...modelFields } = body;
    if (pricingTier) await assertPricingTier(pricingTier);
    const updated = await db2.update(models).set({ ...modelFields, ...pricingTier !== void 0 && { pricingTier }, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(models.id, id)).returning();
    if (!updated[0]) throw new ApiError("not_found", "Model not found.");
    if (inputPerMillion !== void 0 || outputPerMillion !== void 0) {
      await db2.update(modelPricing).set({ ...inputPerMillion !== void 0 && { inputPerMillion }, ...outputPerMillion !== void 0 && { outputPerMillion } }).where(eq13(modelPricing.modelId, id));
    }
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "model.update", targetType: "model", targetId: id, metadata: body });
    return { model: updated[0] };
  });
  app.get("/admin/pricing-tiers", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    const items = await db2.select().from(pricingTiers).orderBy(pricingTiers.sortOrder);
    const usdToInrRate = await getNumber("USD_TO_INR_RATE", 97);
    return { items, usdToInrRate };
  });
  app.post("/admin/pricing-tiers", async (request, reply) => {
    const admin = await requireRole(request, ["admin"]);
    const body = pricingTierSchema.parse(request.body);
    const db2 = await getDb();
    const exists = await db2.select({ id: pricingTiers.id }).from(pricingTiers).where(eq13(pricingTiers.slug, body.slug));
    if (exists[0]) throw new ApiError("invalid_request", "A pricing tier with this slug already exists.");
    const [tier] = await db2.insert(pricingTiers).values(body).returning();
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "pricing_tier.create", targetType: "pricing_tier", targetId: tier.id, metadata: { slug: body.slug } });
    return reply.status(201).send({ tier });
  });
  app.patch("/admin/pricing-tiers/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = pricingTierPatchSchema.parse(request.body);
    const db2 = await getDb();
    const rows = await db2.update(pricingTiers).set({ ...body, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(pricingTiers.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Pricing tier not found.");
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "pricing_tier.update", targetType: "pricing_tier", targetId: id, metadata: body });
    return { tier: rows[0] };
  });
  app.get("/admin/users", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const q = request.query;
    const db2 = await getDb();
    let rows;
    if (q.q) {
      const pattern = `%${q.q.toLowerCase()}%`;
      rows = await db2.select().from(users).where(sql7`lower(${users.email}) LIKE ${pattern}`).orderBy(desc7(users.createdAt)).limit(Math.min(Number(q.limit ?? 50), 200));
    } else {
      rows = await db2.select().from(users).orderBy(desc7(users.createdAt)).limit(Math.min(Number(q.limit ?? 50), 200));
    }
    return { items: rows.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt.toISOString() })) };
  });
  app.patch("/admin/users/:id", async (request) => {
    const admin = await requireRole(request, ["admin", "support"]);
    const { id } = request.params;
    const body = z7.object({ status: z7.enum(["active", "suspended", "pending"]).optional(), role: z7.enum(["user", "admin", "support"]).optional() }).parse(request.body);
    if (body.role && admin.role !== "admin") throw new ApiError("forbidden", "Only admins can change roles.");
    if (body.role && id === admin.id) throw new ApiError("invalid_request", "You cannot change your own role.");
    const db2 = await getDb();
    const rows = await db2.update(users).set({ ...body, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(users.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "User not found.");
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "user.update", targetType: "user", targetId: id, metadata: body });
    return { user: { id: rows[0].id, email: rows[0].email, status: rows[0].status, role: rows[0].role } };
  });
  app.post("/admin/users/:id/wallet", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = z7.object({ amountPaise: z7.number().int().min(-1e9).max(1e9).refine((n) => n !== 0, "Amount cannot be zero"), reason: z7.string().min(3).max(200) }).parse(request.body);
    const db2 = await getDb();
    const target = await db2.select().from(users).where(eq13(users.id, id));
    if (!target[0]) throw new ApiError("not_found", "User not found.");
    if (body.amountPaise > 0) {
      await creditWallet({ userId: id, amountPaise: body.amountPaise, type: "adjustment", reference: `admin:${admin.id}`, idempotencyKey: `adj:${admin.id}:${Date.now()}`, metadata: { reason: body.reason } });
    } else if (body.amountPaise < 0) {
      await db2.insert(walletTransactions).values({ userId: id, type: "adjustment", amountPaise: body.amountPaise, balanceAfterPaise: -1, reference: `admin:${admin.id}`, metadata: { reason: body.reason } });
      await db2.update(wallets).set({ balancePaise: sql7`GREATEST(${wallets.balancePaise} + ${body.amountPaise}, 0)`, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(wallets.userId, id));
    }
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "wallet.adjust", targetType: "user", targetId: id, metadata: { amountPaise: body.amountPaise, reason: body.reason } });
    const w = await db2.select().from(wallets).where(eq13(wallets.userId, id));
    return { balancePaise: w[0]?.balancePaise ?? 0 };
  });
  app.get("/admin/promotions/astra", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    const campaign = (await db2.select().from(astraCampaigns).orderBy(desc7(astraCampaigns.createdAt)))[0];
    if (!campaign) return { campaign: null, stats: null, codes: [] };
    const [codeCount] = await db2.select({ n: sql7`count(*)::int` }).from(giftCodes).where(eq13(giftCodes.campaignId, campaign.id));
    const [redCount] = await db2.select({ n: sql7`count(*)::int` }).from(giftCodeRedemptions).where(eq13(giftCodeRedemptions.campaignId, campaign.id));
    const [activeUsers] = await db2.select({ n: sql7`count(*)::int` }).from(astraEntitlements).where(and7(eq13(astraEntitlements.campaignId, campaign.id), eq13(astraEntitlements.status, "active"), gte2(astraEntitlements.expiresAt, /* @__PURE__ */ new Date())));
    const codes = await db2.select().from(giftCodes).where(eq13(giftCodes.campaignId, campaign.id)).orderBy(desc7(giftCodes.createdAt)).limit(200);
    return {
      campaign,
      stats: { totalCodes: codeCount?.n ?? 0, totalRedemptions: redCount?.n ?? 0, activeAstraUsers: activeUsers?.n ?? 0, conversions: codeCount?.n ? Math.round((redCount?.n ?? 0) / codeCount.n * 100) : 0 },
      codes: codes.map((c) => ({ id: c.id, code: c.code, status: c.status, redemptions: c.redemptionCount, maxRedemptions: c.maxRedemptions, ownerUserId: c.ownerUserId, createdAt: c.createdAt.toISOString() }))
    };
  });
  app.patch("/admin/promotions/astra", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const body = z7.object({
      active: z7.boolean().optional(),
      originalPricePaise: z7.number().int().min(0).optional(),
      discountPercent: z7.number().int().min(0).max(100).optional(),
      promoPricePaise: z7.number().int().min(0).optional(),
      trialDays: z7.number().int().min(1).max(365).optional(),
      endsAt: z7.string().datetime().nullable().optional(),
      allowMultiRedeem: z7.boolean().optional(),
      maxRedemptionsPerCode: z7.number().int().min(1).nullable().optional()
    }).parse(request.body);
    const db2 = await getDb();
    const campaign = (await db2.select().from(astraCampaigns).orderBy(desc7(astraCampaigns.createdAt)))[0];
    if (!campaign) throw new ApiError("not_found", "No campaign configured.");
    const rows = await db2.update(astraCampaigns).set({ ...body, endsAt: body.endsAt === null ? null : body.endsAt ? new Date(body.endsAt) : void 0, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(astraCampaigns.id, campaign.id)).returning();
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "campaign.update", targetType: "astra_campaign", targetId: campaign.id, metadata: body });
    await loadSettings(true);
    return { campaign: rows[0] };
  });
  app.post("/admin/promotions/astra/codes", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const body = z7.object({ count: z7.number().int().min(1).max(500), ownerUserId: z7.string().uuid().nullable().optional(), maxRedemptions: z7.number().int().min(1).nullable().optional() }).parse(request.body);
    const db2 = await getDb();
    const campaign = (await db2.select().from(astraCampaigns).orderBy(desc7(astraCampaigns.createdAt)))[0];
    if (!campaign) throw new ApiError("not_found", "No campaign configured.");
    const created = [];
    for (let i = 0; i < body.count; i++) {
      let code = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        code = `PRO-${randomCode(6)}`;
        const clash = await db2.select({ id: giftCodes.id }).from(giftCodes).where(eq13(giftCodes.code, code));
        if (!clash[0]) break;
      }
      await db2.insert(giftCodes).values({ campaignId: campaign.id, code, ownerUserId: body.ownerUserId ?? null, maxRedemptions: body.maxRedemptions ?? null, status: "active" });
      created.push(code);
    }
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "codes.generate", targetType: "astra_campaign", targetId: campaign.id, metadata: { count: body.count } });
    return { created, count: created.length };
  });
  app.patch("/admin/promotions/astra/codes/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = z7.object({ status: z7.enum(["active", "suspended", "revoked"]) }).parse(request.body);
    const db2 = await getDb();
    const rows = await db2.update(giftCodes).set({ status: body.status }).where(eq13(giftCodes.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Code not found.");
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "code.status", targetType: "gift_code", targetId: id, metadata: { status: body.status } });
    return { code: rows[0] };
  });
  app.get("/admin/plans", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    return { items: await db2.select().from(plans).orderBy(plans.sortOrder) };
  });
  app.patch("/admin/plans/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = z7.object({ pricePaise: z7.number().int().min(0).optional(), freeRpm: z7.number().int().min(1).optional(), freeRph: z7.number().int().min(1).optional(), freeRpd: z7.number().int().min(1).optional(), concurrency: z7.number().int().min(1).optional(), queuePriority: z7.number().int().min(1).max(10).optional(), active: z7.boolean().optional(), features: z7.array(z7.string()).optional() }).parse(request.body);
    const db2 = await getDb();
    const rows = await db2.update(plans).set(body).where(eq13(plans.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Plan not found.");
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "plan.update", targetType: "plan", targetId: id, metadata: body });
    return { plan: rows[0] };
  });
  app.get("/admin/packages", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db2 = await getDb();
    return { items: await db2.select().from(creditPackages).orderBy(creditPackages.sortOrder) };
  });
  app.patch("/admin/packages/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params;
    const body = z7.object({ name: z7.string().optional(), pricePaise: z7.number().int().min(0).optional(), bonusPaise: z7.number().int().min(0).optional(), active: z7.boolean().optional() }).parse(request.body);
    const db2 = await getDb();
    const rows = await db2.update(creditPackages).set(body).where(eq13(creditPackages.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Package not found.");
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "package.update", targetType: "credit_package", targetId: id, metadata: body });
    return { package: rows[0] };
  });
  app.get("/admin/settings", async (request) => {
    await requireRole(request, ["admin"]);
    const db2 = await getDb();
    const [settings2, flags2] = [await db2.select().from(systemSettings), await db2.select().from(featureFlags)];
    return { settings: settings2, flags: flags2 };
  });
  app.patch("/admin/settings/:key", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { key } = request.params;
    const body = z7.object({ value: z7.unknown() }).parse(request.body);
    const db2 = await getDb();
    await db2.update(systemSettings).set({ value: body.value, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(systemSettings.key, key));
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "setting.update", targetType: "system_setting", targetId: key });
    await loadSettings(true);
    return { ok: true };
  });
  app.patch("/admin/flags/:key", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { key } = request.params;
    const body = z7.object({ enabled: z7.boolean() }).parse(request.body);
    const db2 = await getDb();
    await db2.update(featureFlags).set({ enabled: body.enabled, updatedAt: /* @__PURE__ */ new Date() }).where(eq13(featureFlags.key, key));
    await db2.insert(auditLogs).values({ actorUserId: admin.id, action: "flag.update", targetType: "feature_flag", targetId: key, metadata: { enabled: body.enabled } });
    await loadSettings(true);
    return { ok: true };
  });
  app.get("/admin/audit", async (request) => {
    await requireRole(request, ["admin"]);
    const db2 = await getDb();
    const rows = await db2.select().from(auditLogs).orderBy(desc7(auditLogs.createdAt)).limit(200);
    return { items: rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })) };
  });
}
function email(u) {
  return u.email;
}
function slug(m) {
  return m.slug;
}

// apps/api/src/routes/dashboard.ts
import { and as and8, desc as desc8, eq as eq14, gte as gte3, sql as sql8 } from "drizzle-orm";
import { and as and22, eq as eq22, gte as gte22 } from "drizzle-orm";
async function dashboardRoutes(app) {
  app.get("/dashboard/overview", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    const now = /* @__PURE__ */ new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const balance = await getBalance(user.id);
    const [today] = await db2.select({ n: sql8`count(*)::int`, tokens: sql8`coalesce(sum(${requests.totalTokens}),0)::int`, cost: sql8`coalesce(sum(${requests.costPaise}),0)::bigint` }).from(requests).where(and8(eq14(requests.userId, user.id), gte3(requests.createdAt, startOfDay)));
    const [month] = await db2.select({ n: sql8`count(*)::int`, tokens: sql8`coalesce(sum(${requests.totalTokens}),0)::int`, cost: sql8`coalesce(sum(${requests.costPaise}),0)::bigint` }).from(requests).where(and8(eq14(requests.userId, user.id), gte3(requests.createdAt, startOfMonth)));
    const [keys] = await db2.select({ n: sql8`count(*)::int` }).from(apiKeys).where(and8(eq14(apiKeys.userId, user.id), sql8`${apiKeys.revokedAt} IS NULL`));
    const subRows = await db2.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq22(subscriptions.planId, plans.id)).where(eq22(subscriptions.userId, user.id));
    const plan = subRows.find((s) => s.plan)?.plan ?? null;
    const [freeToday] = await db2.select({ n: sql8`coalesce(sum(count),0)::int` }).from(freeUsage).where(eq22(freeUsage.userId, user.id));
    const astraRows = await db2.select().from(astraEntitlements).where(and22(eq22(astraEntitlements.userId, user.id), eq22(astraEntitlements.status, "active"), gte22(astraEntitlements.expiresAt, now)));
    const astra = astraRows[0] ?? null;
    return {
      balancePaise: balance,
      balanceFormatted: formatMoney(balance),
      today: { requests: today?.n ?? 0, tokens: today?.tokens ?? 0, costPaise: Number(today?.cost ?? 0) },
      month: { requests: month?.n ?? 0, tokens: month?.tokens ?? 0, costPaise: Number(month?.cost ?? 0) },
      activeKeys: keys?.n ?? 0,
      freeUsed: freeToday?.n ?? 0,
      plan: plan ? { slug: plan.slug, name: plan.name, freeRpm: plan.freeRpm, queuePriority: plan.queuePriority } : null,
      astra: astra ? { active: true, expiresAt: astra.expiresAt.toISOString(), daysLeft: Math.max(0, Math.ceil((astra.expiresAt.getTime() - now.getTime()) / 864e5)) } : { active: false, expiresAt: null },
      queue: queueSnapshot()
    };
  });
  app.get("/dashboard/series", async (request) => {
    const user = await requireUser(request);
    const q = request.query;
    const days = Math.min(Math.max(Number(q.days ?? 7), 1), 90);
    const db2 = await getDb();
    const since = new Date(Date.now() - days * 864e5);
    const rows = await db2.select().from(requests).where(and8(eq14(requests.userId, user.id), gte3(requests.createdAt, since)));
    const buckets2 = /* @__PURE__ */ new Map();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 864e5);
      const key = d.toISOString().slice(0, 10);
      buckets2.set(key, { date: key, requests: 0, tokens: 0, costPaise: 0, errors: 0 });
    }
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const b = buckets2.get(key);
      if (!b) continue;
      b.requests++;
      b.tokens += r.totalTokens;
      b.costPaise += r.costPaise;
      if (r.status === "error") b.errors++;
    }
    return { items: [...buckets2.values()] };
  });
  app.get("/dashboard/activity", async (request) => {
    const user = await requireUser(request);
    const q = request.query;
    const db2 = await getDb();
    const conditions = [eq14(requests.userId, user.id)];
    if (q.status === "errors") conditions.push(eq14(requests.status, "error"));
    if (q.status === "success") conditions.push(eq14(requests.status, "success"));
    const rows = await db2.select({ r: requests, m: models, p: providers }).from(requests).leftJoin(models, eq22(models.id, requests.modelId)).leftJoin(providers, eq22(providers.id, requests.providerId)).where(and8(...conditions)).orderBy(desc8(requests.createdAt)).limit(Math.min(Number(q.limit ?? 25), 100)).offset(Number(q.offset ?? 0));
    const [total] = await db2.select({ n: sql8`count(*)::int` }).from(requests).where(and8(...conditions));
    return {
      total: total?.n ?? 0,
      items: rows.map((x) => ({
        id: x.r.id,
        createdAt: x.r.createdAt.toISOString(),
        model: x.m?.slug ?? null,
        modelName: x.m?.name ?? null,
        provider: x.p?.slug ?? null,
        status: x.r.status,
        httpStatus: x.r.httpStatus,
        inputTokens: x.r.inputTokens,
        outputTokens: x.r.outputTokens,
        totalTokens: x.r.totalTokens,
        latencyMs: x.r.latencyMs,
        ttftMs: x.r.ttftMs,
        costPaise: x.r.costPaise,
        isFree: x.r.isFree,
        streaming: x.r.streaming,
        errorCode: x.r.errorCode,
        route: x.r.route,
        queueWaitMs: x.r.queueWaitMs
      }))
    };
  });
  app.get("/dashboard/activity/:id", async (request) => {
    const user = await requireUser(request);
    const { id } = request.params;
    const db2 = await getDb();
    const rows = await db2.select({ r: requests, m: models, p: providers, k: apiKeys }).from(requests).leftJoin(models, eq22(models.id, requests.modelId)).leftJoin(providers, eq22(providers.id, requests.providerId)).leftJoin(apiKeys, eq22(apiKeys.id, requests.apiKeyId)).where(eq22(requests.id, id));
    const row = rows[0];
    if (!row || row.r.userId !== user.id) throw new ApiError("not_found", "Request not found.");
    const attempts = await db2.select().from(requestAttempts).where(eq22(requestAttempts.requestId, id)).orderBy(requestAttempts.attempt);
    return {
      request: {
        id: row.r.id,
        createdAt: row.r.createdAt.toISOString(),
        model: row.m?.slug ?? null,
        provider: row.p?.slug ?? null,
        status: row.r.status,
        httpStatus: row.r.httpStatus,
        route: row.r.route,
        latencyMs: row.r.latencyMs,
        ttftMs: row.r.ttftMs,
        queueWaitMs: row.r.queueWaitMs,
        inputTokens: row.r.inputTokens,
        outputTokens: row.r.outputTokens,
        totalTokens: row.r.totalTokens,
        costPaise: row.r.costPaise,
        streaming: row.r.streaming,
        isFree: row.r.isFree,
        errorCode: row.r.errorCode,
        errorMessage: row.r.errorMessage,
        apiKey: row.k ? { name: row.k.name, prefix: row.k.prefix } : null
      },
      attempts: attempts.map((a, i) => ({ step: a.attempt, provider: null, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error, at: a.createdAt.toISOString() })),
      timeline: [
        { step: "Request received", at: row.r.createdAt.toISOString() },
        { step: "Authentication", ok: true },
        { step: "Model resolution", model: row.m?.slug ?? null },
        { step: "Provider selection", provider: row.p?.slug ?? null, route: row.r.route },
        ...row.r.queueWaitMs ? [{ step: "Free queue wait", ms: row.r.queueWaitMs }] : [],
        ...row.r.ttftMs ? [{ step: "First token", ms: row.r.ttftMs }] : [],
        { step: "Completion", status: row.r.status, ms: row.r.latencyMs },
        { step: "Billing", costPaise: row.r.costPaise }
      ]
    };
  });
  app.get("/dashboard/usage", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    const since = new Date(Date.now() - 30 * 864e5);
    const byModel = await db2.select({ model: models.slug, n: sql8`count(*)::int`, tokens: sql8`coalesce(sum(${requests.totalTokens}),0)::int`, cost: sql8`coalesce(sum(${requests.costPaise}),0)::bigint` }).from(requests).leftJoin(models, eq22(models.id, requests.modelId)).where(and8(eq22(requests.userId, user.id), gte22(requests.createdAt, since))).groupBy(models.slug).orderBy(desc8(sql8`count(*)`));
    const byProvider = await db2.select({ provider: providers.slug, n: sql8`count(*)::int`, tokens: sql8`coalesce(sum(${requests.totalTokens}),0)::int` }).from(requests).leftJoin(providers, eq22(providers.id, requests.providerId)).where(and8(eq22(requests.userId, user.id), gte22(requests.createdAt, since))).groupBy(providers.slug).orderBy(desc8(sql8`count(*)`));
    return { byModel: byModel.map((r) => ({ ...r, cost: Number(r.cost) })), byProvider };
  });
  app.get("/notifications", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    const rows = await db2.select().from(notifications).where(eq14(notifications.userId, user.id)).orderBy(desc8(notifications.createdAt)).limit(30);
    return { items: rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null })) };
  });
  app.post("/notifications/read", async (request) => {
    const user = await requireUser(request);
    const db2 = await getDb();
    await db2.update(notifications).set({ readAt: /* @__PURE__ */ new Date() }).where(and8(eq14(notifications.userId, user.id), sql8`${notifications.readAt} IS NULL`));
    return { ok: true };
  });
  app.get("/status", async () => {
    const db2 = await getDb();
    const providerRows = await db2.select().from(providers);
    const healthRows = await db2.select().from(providerHealth).orderBy(desc8(providerHealth.checkedAt)).limit(50);
    const incidentRows = await db2.select().from(incidents).orderBy(desc8(incidents.startedAt)).limit(20);
    const snapshot = queueSnapshot();
    const services = [
      { name: "API", operational: true },
      { name: "Chat completions", operational: true },
      { name: "Dashboard", operational: true },
      { name: "Billing", operational: true },
      { name: "Free model queue", operational: true }
    ];
    return {
      services: services.map((s) => ({ ...s, status: s.operational ? "operational" : "degraded" })),
      providers: providerRows.map((p) => {
        const h = healthRows.find((x) => x.providerId === p.id);
        const status = p.status === "active" ? "operational" : p.status === "degraded" ? "degraded" : p.status === "disabled" ? "major_outage" : "unknown";
        return { slug: p.slug, name: p.name, status, lastChecked: p.lastHealthAt?.toISOString() ?? null, latencyMs: h?.latencyMs ?? null, message: p.healthMessage };
      }),
      queue: snapshot,
      incidents: incidentRows.map((i) => ({ id: i.id, service: i.service, severity: i.severity, status: i.status, title: i.title, body: i.body, startedAt: i.startedAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null }))
    };
  });
}

// apps/api/src/routes/plans.ts
import { eq as eq15 } from "drizzle-orm";
async function planRoutes(app) {
  app.get("/plans", async () => {
    const db2 = await getDb();
    const rows = await db2.select().from(plans).where(eq15(plans.active, true)).orderBy(plans.sortOrder);
    return {
      items: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        pricePaise: p.pricePaise,
        priceFormatted: formatMoney(p.pricePaise),
        currency: p.currency,
        period: p.period,
        freeRpm: p.freeRpm,
        freeRph: p.freeRph,
        freeRpd: p.freeRpd,
        concurrency: p.concurrency,
        queuePriority: p.queuePriority,
        features: p.features,
        sortOrder: p.sortOrder
      }))
    };
  });
}

// apps/api/src/routes/usage.ts
import { z as z8 } from "zod";
import { and as and9, desc as desc9, eq as eq16, gte as gte4, lte, sql as sql9 } from "drizzle-orm";
var usageQuery = z8.object({
  limit: z8.coerce.number().int().min(1).max(100).default(50),
  offset: z8.coerce.number().int().min(0).default(0),
  model: z8.string().min(1).optional(),
  status: z8.enum(["success", "error", "rate_limited", "blocked", "queued"]).optional(),
  from: z8.string().datetime().optional(),
  to: z8.string().datetime().optional()
});
async function usageRoutes(app) {
  app.get("/v1/account/balance", async (request) => {
    const auth = await authenticateRequest(request);
    const db2 = await getDb();
    const rows = await db2.select().from(wallets).where(eq16(wallets.userId, auth.user.id));
    const wallet = rows[0];
    const balancePaise = wallet?.balancePaise ?? 0;
    return {
      object: "balance",
      currency: "INR",
      balance_paise: balancePaise,
      balance: balancePaise / 100,
      updated_at: wallet?.updatedAt.toISOString() ?? null
    };
  });
  app.get("/v1/usage", async (request) => {
    const auth = await authenticateRequest(request);
    const q = usageQuery.parse(request.query);
    const db2 = await getDb();
    const conditions = [eq16(requests.userId, auth.user.id)];
    if (q.model) conditions.push(eq16(models.slug, q.model));
    if (q.status) conditions.push(eq16(requests.status, q.status));
    if (q.from) conditions.push(gte4(requests.createdAt, new Date(q.from)));
    if (q.to) conditions.push(lte(requests.createdAt, new Date(q.to)));
    const where = and9(...conditions);
    const totalRows = await db2.select({ n: sql9`count(*)::int` }).from(requests).leftJoin(models, eq16(models.id, requests.modelId)).where(where);
    const rows = await db2.select({
      request: requests,
      modelSlug: models.slug,
      providerSlug: providers.slug
    }).from(requests).leftJoin(models, eq16(models.id, requests.modelId)).leftJoin(providers, eq16(providers.id, requests.providerId)).where(where).orderBy(desc9(requests.createdAt)).limit(q.limit).offset(q.offset);
    return {
      object: "list",
      data: rows.map(toUsageRecord),
      total: totalRows[0]?.n ?? 0,
      limit: q.limit,
      offset: q.offset
    };
  });
  app.get("/v1/usage/:request_id", async (request) => {
    const auth = await authenticateRequest(request);
    const params = z8.object({ request_id: z8.string().min(1) }).parse(request.params);
    const db2 = await getDb();
    const rows = await db2.select({ request: requests, modelSlug: models.slug, providerSlug: providers.slug }).from(requests).leftJoin(models, eq16(models.id, requests.modelId)).leftJoin(providers, eq16(providers.id, requests.providerId)).where(and9(eq16(requests.id, params.request_id), eq16(requests.userId, auth.user.id)));
    const row = rows[0];
    if (!row) throw new ApiError("not_found", "Usage record not found.");
    return { ...toUsageRecord(row), route: row.request.route, queue_wait_ms: row.request.queueWaitMs };
  });
}
function toUsageRecord(row) {
  const r = row.request;
  return {
    id: r.id,
    object: "usage.record",
    created: r.createdAt.toISOString(),
    model: row.modelSlug,
    provider: row.providerSlug,
    status: r.status,
    http_status: r.httpStatus,
    usage: {
      prompt_tokens: r.inputTokens,
      completion_tokens: r.outputTokens,
      total_tokens: r.totalTokens
    },
    cost_paise: r.costPaise,
    is_free: r.isFree,
    streaming: r.streaming,
    usage_source: r.usageSource,
    latency_ms: r.latencyMs,
    ttft_ms: r.ttftMs,
    error: r.errorCode ? { code: r.errorCode, message: r.errorMessage } : null
  };
}

// apps/api/src/app.ts
import { randomBytes as randomBytes4 } from "node:crypto";
function isAllowedOrigin(origin) {
  if (!origin) return true;
  const allowed = [
    env.webBaseUrl,
    env.apiBaseUrl,
    env.publicApiBaseUrl,
    "https://prorouter.in",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:4100",
    "http://127.0.0.1:4100"
  ];
  if (origin.includes("vercel.app") || origin.includes("onrender.com")) return true;
  return allowed.includes(origin);
}
async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.logLevel
    },
    trustProxy: true,
    bodyLimit: 4 * 1024 * 1024
  });
  await app.register(cors, {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    exposedHeaders: ["x-request-id", "retry-after", "x-prorouter-usage-source"]
  });
  await app.register(cookie, { secret: env.authSecret });
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    req.rawBody = typeof body === "string" ? body : body.toString("utf8");
    try {
      done(null, JSON.parse(req.rawBody));
    } catch (err) {
      done(err, void 0);
    }
  });
  app.addHook("onRequest", async (request, reply) => {
    const incoming = request.headers["x-request-id"];
    const rid = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : `req_${randomBytes4(12).toString("hex")}`;
    request.requestId = rid;
    reply.header("x-request-id", rid);
  });
  app.addHook("onRequest", async (request) => {
    if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return;
    if (request.headers.authorization) return;
    const origin = request.headers.origin;
    if (!origin) return;
    if (!isAllowedOrigin(origin)) {
      throw new ApiError("forbidden", "Cross-origin request blocked.");
    }
  });
  app.setErrorHandler((err, request, reply) => {
    const rid = request.requestId ?? "unknown";
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: { code: "invalid_request", message: "Request validation failed.", request_id: rid, details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }
      });
    }
    if (isApiError(err)) {
      if (err.retryAfter !== void 0) reply.header("retry-after", String(err.retryAfter));
      request.log.warn({ code: err.code, status: err.status, rid }, "api error");
      return reply.status(err.status).send(err.toBody(rid));
    }
    const fastifyErr = err;
    if (fastifyErr.statusCode === 413) {
      return reply.status(413).send(new ApiError("payload_too_large", "Request body too large.").toBody(rid));
    }
    if (fastifyErr.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
      return reply.status(400).send(new ApiError("invalid_request", "Content-Type must be application/json.").toBody(rid));
    }
    request.log.error({ err, rid }, "unhandled error");
    return reply.status(500).send(new ApiError("internal_error", "An unexpected error occurred.").toBody(rid));
  });
  app.setNotFoundHandler((request, reply) => {
    const rid = request.requestId ?? "unknown";
    return reply.status(404).send({ error: { code: "not_found", message: `Route ${request.method} ${request.url} not found.`, request_id: rid } });
  });
  app.get("/health", async () => ({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() }));
  app.get("/", async () => ({ status: "ok", service: "prorouter-backend", time: (/* @__PURE__ */ new Date()).toISOString() }));
  app.get("/api/health", async () => ({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() }));
  await app.register(authRoutes);
  await app.register(keyRoutes);
  await app.register(catalogRoutes);
  await app.register(planRoutes);
  await app.register(chatRoutes);
  await app.register(usageRoutes);
  await app.register(walletRoutes);
  await app.register(promotionRoutes);
  await app.register(adminRoutes);
  await app.register(dashboardRoutes);
  return app;
}

// apps/api/src/server.ts
try {
  const app = await buildApp();
  await app.listen({ port: env.apiPort, host: "0.0.0.0" });
  console.log(`[prorouter] API listening on http://0.0.0.0:${env.apiPort}`);
  runMigrations().then(async () => {
    console.log("[prorouter] Migrations completed successfully.");
    try {
      await seedDatabase(false);
      console.log("[prorouter] Catalog seeded successfully.");
    } catch (e) {
      console.warn("[prorouter] Seed notice:", e?.message || e);
    }
  }).catch((err) => {
    console.warn("[prorouter] Migrations non-fatal warning:", err?.message || err);
  });
} catch (err) {
  console.error("[prorouter] Failed to start API:", err);
  process.exit(1);
}
