import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { apiKeys, users } from "./auth.js";
import { modelProviders, models, providers } from "./catalog.js";

export const requestStatusEnum = pgEnum("request_status", [
  "success",
  "error",
  "rate_limited",
  "blocked",
  "queued",
]);

/** Request log (§17). Privacy: prompts/completions are NOT stored by default. */
export const requests = pgTable(
  "requests",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
    modelId: uuid("model_id").references(() => models.id, { onDelete: "set null" }),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    status: requestStatusEnum("status").notNull(),
    httpStatus: integer("http_status").notNull().default(200),
    route: text("route").notNull().default("direct"),
    latencyMs: integer("latency_ms"),
    ttftMs: integer("ttft_ms"),
    queueWaitMs: integer("queue_wait_ms"),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costPaise: bigint("cost_paise", { mode: "number" }).notNull().default(0),
    streaming: boolean("streaming").notNull().default(false),
    isFree: boolean("is_free").notNull().default(false),
    usageSource: text("usage_source").notNull().default("upstream"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("requests_user_idx").on(t.userId, t.createdAt),
    index("requests_model_idx").on(t.modelId, t.createdAt),
    index("requests_provider_idx").on(t.providerId, t.createdAt),
    index("requests_apikey_idx").on(t.apiKeyId),
  ],
);

/** Fallback/attempt trail for each request (§36, §54). */
export const requestAttempts = pgTable(
  "request_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: text("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id").references(() => providers.id, { onDelete: "set null" }),
    modelLinkId: uuid("model_link_id").references(() => modelProviders.id, { onDelete: "set null" }),
    attempt: integer("attempt").notNull().default(1),
    status: text("status").notNull(),
    httpStatus: integer("http_status"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("request_attempts_request_idx").on(t.requestId)],
);

/**
 * Free-request quota accounting (§51). One row per user+bucket; increments are
 * atomic UPDATE ... SET count = count + 1 so concurrent tabs cannot bypass.
 */
export const freeUsage = pgTable(
  "free_usage",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bucketKey: text("bucket_key").notNull(),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("free_usage_uq").on(t.userId, t.bucketKey)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    modelSlug: text("model_slug"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("conversations_user_idx").on(t.userId, t.updatedAt)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull().default(""),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costPaise: bigint("cost_paise", { mode: "number" }).notNull().default(0),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);