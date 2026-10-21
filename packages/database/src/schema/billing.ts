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
import { users } from "./auth.js";

export const walletTxTypeEnum = pgEnum("wallet_tx_type", [
  "topup",
  "refund",
  "promotional",
  "gift",
  "usage",
  "adjustment",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "created",
  "authorized",
  "captured",
  "failed",
  "refunded",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled"]);

/** Every user has exactly one wallet. Balance is integer paise (§48). */
export const wallets = pgTable("wallets", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balancePaise: bigint("balance_paise", { mode: "number" }).notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

/**
 * Immutable ledger (§48). Rows are never updated or deleted; balance changes
 * are performed inside a DB transaction that inserts a new row here.
 */
export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: walletTxTypeEnum("type").notNull(),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    balanceAfterPaise: bigint("balance_after_paise", { mode: "number" }).notNull(),
    currency: text("currency").notNull().default("INR"),
    reference: text("reference"),
    idempotencyKey: text("idempotency_key"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("wallet_tx_user_idx").on(t.userId, t.createdAt),
    uniqueIndex("wallet_tx_idem_uq").on(t.idempotencyKey),
  ],
);

/** Admin-configurable credit packages (§20) — no hard-coded pricing. */
export const creditPackages = pgTable(
  "credit_packages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    pricePaise: bigint("price_paise", { mode: "number" }).notNull(),
    bonusPaise: bigint("bonus_paise", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("credit_packages_slug_uq").on(t.slug)],
);

/** Plans (§23) — free/boost/ultra with configurable free-model limits. */
export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    pricePaise: bigint("price_paise", { mode: "number" }).notNull().default(0),
    currency: text("currency").notNull().default("INR"),
    period: text("period").notNull().default("month"),
    freeRpm: integer("free_rpm").notNull().default(1),
    freeRph: integer("free_rph").notNull().default(20),
    freeRpd: integer("free_rpd").notNull().default(100),
    concurrency: integer("concurrency").notNull().default(1),
    queuePriority: integer("queue_priority").notNull().default(5),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("plans_slug_uq").on(t.slug)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("subscriptions_user_idx").on(t.userId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    packageId: uuid("package_id").references(() => creditPackages.id),
    gateway: text("gateway").notNull(),
    gatewayOrderId: text("gateway_order_id"),
    gatewayPaymentId: text("gateway_payment_id"),
    amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
    status: paymentStatusEnum("status").notNull().default("created"),
    idempotencyKey: text("idempotency_key"),
    invoiceNumber: text("invoice_number").notNull(),
    creditedAt: timestamp("credited_at", { withTimezone: true, mode: "date" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_idem_uq").on(t.idempotencyKey),
    uniqueIndex("payments_invoice_uq").on(t.invoiceNumber),
    index("payments_user_idx").on(t.userId),
    index("payments_gateway_order_idx").on(t.gatewayOrderId),
  ],
);

/** Webhook events are idempotent: unique event id prevents double-credit (§55). */
export const paymentWebhooks = pgTable(
  "payment_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id").references(() => payments.id),
    eventId: text("event_id").notNull(),
    gateway: text("gateway").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    signatureValid: boolean("signature_valid").notNull().default(false),
    processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_webhooks_event_uq").on(t.eventId)],
);