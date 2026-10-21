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
  uuid,
} from "drizzle-orm/pg-core";

export const providerStatusEnum = pgEnum("provider_status", ["active", "degraded", "disabled", "unknown"]);
export const modelStatusEnum = pgEnum("model_status", ["active", "coming_soon", "disabled", "archived"]);
export const modelTypeEnum = pgEnum("model_type", ["chat", "completion", "embedding", "image", "audio"]);
export const linkStatusEnum = pgEnum("link_status", ["active", "degraded", "disabled"]);

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    region: text("region").notNull().default("global"),
    endpointUrl: text("endpoint_url").notNull(),
    adapterType: text("adapter_type").notNull().default("openai"),
    status: providerStatusEnum("status").notNull().default("unknown"),
    priority: integer("priority").notNull().default(100),
    timeoutMs: integer("timeout_ms").notNull().default(60000),
    retryCount: integer("retry_count").notNull().default(2),
    retentionPolicy: text("retention_policy").notNull().default("zero_retention"),
    capabilities: jsonb("capabilities").$type<string[]>().notNull().default([]),
    healthMessage: text("health_message"),
    lastHealthAt: timestamp("last_health_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("providers_slug_uq").on(t.slug)],
);

/** Encrypted upstream credentials — never exposed to the frontend (§42). */
export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    keyName: text("key_name").notNull(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    alg: text("alg").notNull().default("aes-256-gcm"),
    authTag: text("auth_tag"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("provider_credentials_uq").on(t.providerId, t.keyName)],
);

export const providerHealth = pgTable(
  "provider_health",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    available: boolean("available").notNull().default(false),
    latencyMs: integer("latency_ms"),
    successRateBp: integer("success_rate_bp").notNull().default(0),
    errorRateBp: integer("error_rate_bp").notNull().default(10000),
    message: text("message"),
  },
  (t) => [index("provider_health_idx").on(t.providerId, t.checkedAt)],
);

export const models = pgTable(
  "models",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    type: modelTypeEnum("type").notNull().default("chat"),
    status: modelStatusEnum("status").notNull().default("active"),
    isFree: boolean("is_free").notNull().default(false),
    contextWindow: integer("context_window").notNull().default(128000),
    maxOutputTokens: integer("max_output_tokens").notNull().default(8192),
    rank: integer("rank").notNull().default(100),
    popularity: integer("popularity").notNull().default(0),
    rating: integer("rating").notNull().default(0),
    benchmarks: jsonb("benchmarks").$type<Record<string, number>>().notNull().default({}),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("models_slug_uq").on(t.slug),
    index("models_status_idx").on(t.status),
    index("models_rank_idx").on(t.rank),
  ],
);

export const modelPricing = pgTable(
  "model_pricing",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    inputPerMillion: bigint("input_per_million", { mode: "number" }).notNull().default(0),
    outputPerMillion: bigint("output_per_million", { mode: "number" }).notNull().default(0),
    cachedInputPerMillion: bigint("cached_input_per_million", { mode: "number" }),
    currency: text("currency").notNull().default("INR"),
  },
  (t) => [uniqueIndex("model_pricing_model_uq").on(t.modelId)],
);

export const modelCapabilities = pgTable("model_capabilities", {
  modelId: uuid("model_id")
    .primaryKey()
    .references(() => models.id, { onDelete: "cascade" }),
  modalities: jsonb("modalities").$type<string[]>().notNull().default(["text"]),
  streaming: boolean("streaming").notNull().default(true),
  toolCalls: boolean("tool_calls").notNull().default(false),
  structuredOutputs: boolean("structured_outputs").notNull().default(false),
  reasoning: boolean("reasoning").notNull().default(false),
  vision: boolean("vision").notNull().default(false),
  imageGeneration: boolean("image_generation").notNull().default(false),
  audio: boolean("audio").notNull().default(false),
  jsonMode: boolean("json_mode").notNull().default(false),
});

/** Which upstream providers can serve a model, and under which upstream ID. */
export const modelProviders = pgTable(
  "model_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelId: uuid("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    providerModelId: text("provider_model_id").notNull(),
    priority: integer("priority").notNull().default(100),
    status: linkStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("model_providers_uq").on(t.modelId, t.providerId),
    index("model_providers_provider_idx").on(t.providerId),
  ],
);

/** Free-model platform limits (§21) — configurable per model by admin. */
export const modelLimits = pgTable("model_limits", {
  modelId: uuid("model_id")
    .primaryKey()
    .references(() => models.id, { onDelete: "cascade" }),
  perMinute: integer("per_minute").notNull().default(1),
  perHour: integer("per_hour").notNull().default(30),
  perDay: integer("per_day").notNull().default(200),
  concurrency: integer("concurrency").notNull().default(1),
  queuePriority: integer("queue_priority").notNull().default(5),
});

/** Database-driven routing rules (§90). */
export const routingRules = pgTable(
  "routing_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    priority: integer("priority").notNull().default(100),
    conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull().default({}),
    action: jsonb("action").$type<Record<string, unknown>>().notNull().default({}),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("routing_rules_priority_idx").on(t.priority)],
);