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
import { users } from "./auth.js";

export const codeStatusEnum = pgEnum("code_status", ["active", "suspended", "revoked"]);
export const entitlementStatusEnum = pgEnum("entitlement_status", ["active", "expired", "revoked"]);

/**
 * Astra campaign (§25). All prices/discounts are configurable by admin —
 * nothing is hard-coded in application logic.
 */
export const astraCampaigns = pgTable(
  "astra_campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    originalPricePaise: bigint("original_price_paise", { mode: "number" }).notNull().default(400000),
    discountPercent: integer("discount_percent").notNull().default(80),
    promoPricePaise: bigint("promo_price_paise", { mode: "number" }).notNull().default(80000),
    trialDays: integer("trial_days").notNull().default(7),
    allowMultiRedeem: boolean("allow_multi_redeem").notNull().default(true),
    maxRedemptionsPerCode: integer("max_redemptions_per_code"),
    startsAt: timestamp("starts_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true, mode: "date" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("astra_campaigns_slug_uq").on(t.slug)],
);

/**
 * Personal referral/gift codes (§26). A code may be redeemed by MANY distinct
 * users; (code_id, redeemer_user_id) is unique — NOT a global "used" boolean.
 */
export const giftCodes = pgTable(
  "gift_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => astraCampaigns.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    status: codeStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("gift_codes_code_uq").on(t.code),
    index("gift_codes_owner_idx").on(t.ownerUserId),
    index("gift_codes_campaign_idx").on(t.campaignId),
  ],
);

/** Uniqueness: one redemption per (code, redeemer). Owner cannot redeem own (§50). */
export const giftCodeRedemptions = pgTable(
  "gift_code_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => astraCampaigns.id, { onDelete: "cascade" }),
    codeId: uuid("code_id")
      .notNull()
      .references(() => giftCodes.id, { onDelete: "cascade" }),
    redeemerUserId: uuid("redeemer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("redemptions_code_user_uq").on(t.codeId, t.redeemerUserId),
    index("redemptions_redeemer_idx").on(t.redeemerUserId),
    index("redemptions_campaign_idx").on(t.campaignId),
  ],
);

/** GPT Astra access entitlement (§49) — verified server-side on every request. */
export const astraEntitlements = pgTable(
  "astra_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => astraCampaigns.id, { onDelete: "cascade" }),
    sourceCodeId: uuid("source_code_id").references(() => giftCodes.id, { onDelete: "set null" }),
    activatedAt: timestamp("activated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    status: entitlementStatusEnum("status").notNull().default("active"),
  },
  (t) => [
    index("astra_entitlements_user_idx").on(t.userId, t.status),
    uniqueIndex("astra_entitlements_code_user_uq").on(t.sourceCodeId, t.userId),
  ],
);