/**
 * One-time PGlite/Postgres → MongoDB data migration.
 *
 * Copies every table from the embedded SQL database into the matching Mongo
 * collection, mapping snake_case columns to the camelCase document fields
 * used by the app. Safe to re-run: documents are upserted by `_id`.
 *
 * Usage:
 *   npm run db:migrate:mongo           # migrate + create indexes
 *   npm run db:migrate:mongo -- --dry  # report only, write nothing
 */

import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../index.js";
import { getMongoDb, closeMongo, pingMongo } from "../mongo/client.js";
import { ensureIndexes } from "../mongo/indexes.js";
import { env } from "@uno/shared";

type Row = Record<string, unknown>;

/** snake_case column → camelCase document field. */
const FIELD_MAP: Record<string, string> = {
  user_id: "userId",
  user_agent: "userAgent",
  token_hash: "tokenHash",
  expires_at: "expiresAt",
  last_seen_at: "lastSeenAt",
  email_verified: "emailVerified",
  password_hash: "passwordHash",
  created_at: "createdAt",
  updated_at: "updatedAt",
  revoked_at: "revokedAt",
  last_used_at: "lastUsedAt",
  request_count: "requestCount",
  spend_paise: "spendPaise",
  spending_limit_paise: "spendingLimitPaise",
  allowed_models: "allowedModels",
  balance_paise: "balancePaise",
  balance_after_paise: "balanceAfterPaise",
  amount_paise: "amountPaise",
  idempotency_key: "idempotencyKey",
  balance_after: "balanceAfter",
  price_paise: "pricePaise",
  bonus_paise: "bonusPaise",
  original_price_paise: "originalPricePaise",
  discount_percent: "discountPercent",
  promo_price_paise: "promoPricePaise",
  trial_days: "trialDays",
  allow_multi_redeem: "allowMultiRedeem",
  max_redemptions_per_code: "maxRedemptionsPerCode",
  max_redemptions: "maxRedemptions",
  redemption_count: "redemptionCount",
  starts_at: "startsAt",
  ends_at: "endsAt",
  plan_id: "planId",
  package_id: "packageId",
  gateway_order_id: "gatewayOrderId",
  gateway_payment_id: "gatewayPaymentId",
  invoice_number: "invoiceNumber",
  credited_at: "creditedAt",
  payment_id: "paymentId",
  event_id: "eventId",
  signature_valid: "signatureValid",
  processed_at: "processedAt",
  provider_id: "providerId",
  key_name: "keyName",
  auth_tag: "authTag",
  checked_at: "checkedAt",
  latency_ms: "latencyMs",
  success_rate_bp: "successRateBp",
  error_rate_bp: "errorRateBp",
  health_message: "healthMessage",
  endpoint_url: "endpointUrl",
  adapter_type: "adapterType",
  retry_count: "retryCount",
  timeout_ms: "timeoutMs",
  retention_policy: "retentionPolicy",
  is_free: "isFree",
  context_window: "contextWindow",
  max_output_tokens: "maxOutputTokens",
  input_per_million: "inputPerMillion",
  output_per_million: "outputPerMillion",
  cached_input_per_million: "cachedInputPerMillion",
  provider_model_id: "providerModelId",
  queue_priority: "queuePriority",
  per_minute: "perMinute",
  per_hour: "perHour",
  per_day: "perDay",
  free_rpm: "freeRpm",
  free_rph: "freeRph",
  free_rpd: "freeRpd",
  tool_calls: "toolCalls",
  structured_outputs: "structuredOutputs",
  image_generation: "imageGeneration",
  json_mode: "jsonMode",
  actor_user_id: "actorUserId",
  target_type: "targetType",
  target_id: "targetId",
  read_at: "readAt",
  in_app: "inApp",
  started_at: "startedAt",
  resolved_at: "resolvedAt",
  to_email: "toEmail",
  sent_at: "sentAt",
  api_key_id: "apiKeyId",
  model_id: "modelId",
  model_link_id: "modelLinkId",
  http_status: "httpStatus",
  ttft_ms: "ttftMs",
  queue_wait_ms: "queueWaitMs",
  input_tokens: "inputTokens",
  output_tokens: "outputTokens",
  total_tokens: "totalTokens",
  cost_paise: "costPaise",
  error_code: "errorCode",
  error_message: "errorMessage",
  request_id: "requestId",
  bucket_key: "bucketKey",
  conversation_id: "conversationId",
  model_slug: "modelSlug",
  campaign_id: "campaignId",
  owner_user_id: "ownerUserId",
  code_id: "codeId",
  redeemer_user_id: "redeemerUserId",
  redeemed_at: "redeemedAt",
  source_code_id: "sourceCodeId",
  activated_at: "activatedAt",
  sort_order: "sortOrder",
};

/** Tables whose primary key is not `id` — the natural key becomes `_id`. */
const NATURAL_KEY: Record<string, string> = {
  wallets: "user_id",
  model_pricing: "model_id",
  model_capabilities: "model_id",
  model_limits: "model_id",
  system_settings: "key",
  feature_flags: "key",
  notification_prefs: "user_id",
  free_usage: "user_id",
};

function camelize(column: string): string {
  const mapped = FIELD_MAP[column];
  if (mapped) return mapped;
  return column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Convert a SQL row into a Mongo document. */
function toDocument(table: string, row: Row): Row {
  const natural = NATURAL_KEY[table];
  const doc: Row = {};
  for (const [column, value] of Object.entries(row)) {
    if (value === undefined) continue;
    if (column === "id") {
      // Primary key: uuid → string _id (except natural-key tables).
      doc._id = natural ? undefined : String(value);
      continue;
    }
    if (natural && column === natural) {
      // natural-key tables: user_id/model_id/key → _id
      doc._id = String(value);
      continue;
    }
    doc[camelize(column)] = value;
  }
  if (!doc._id) {
    doc._id = `${table}:${JSON.stringify(row).slice(0, 64)}`;
  }
  // Date columns come back as Date objects from the pg driver; keep them.
  return doc;
}

/** Tables in dependency order (parents before children). */
const TABLES = [
  "users",
  "sessions",
  "api_keys",
  "wallets",
  "wallet_transactions",
  "credit_packages",
  "plans",
  "subscriptions",
  "payments",
  "payment_webhooks",
  "providers",
  "provider_credentials",
  "provider_health",
  "models",
  "model_pricing",
  "model_capabilities",
  "model_providers",
  "model_limits",
  "routing_rules",
  "system_settings",
  "feature_flags",
  "audit_logs",
  "notifications",
  "notification_prefs",
  "incidents",
  "email_log",
  "requests",
  "request_attempts",
  "free_usage",
  "conversations",
  "messages",
  "astra_campaigns",
  "gift_codes",
  "gift_code_redemptions",
  "astra_entitlements",
];

const dryRun = process.argv.includes("--dry");

const db = await getDb();
const mongo = await pingMongo();
if (!mongo) {
  console.error("[prorouter] MongoDB is unreachable — nothing migrated.");
  process.exit(1);
}
const target = await getMongoDb();

console.log(`[prorouter] Migrating SQL → MongoDB (${env.mongoDb})${dryRun ? " [DRY RUN]" : ""}`);

let totalDocs = 0;
for (const table of TABLES) {
  let rows: Row[];
  try {
    // Table names come from the fixed literal list above — not user input.
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(table)}`);
    rows = ((result as unknown as { rows?: Row[] }).rows ?? result as unknown as Row[]) ?? [];
  } catch (err) {
    console.log(`  ${table}: skipped (${(err as Error).message.slice(0, 60)})`);
    continue;
  }
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows`);
    continue;
  }
  const docs = rows.map((r) => toDocument(table, r));
  if (!dryRun) {
    // `_id` is a string in these documents (uuid primary keys), which the
    // driver's default `Document` type does not model — cast at the boundary.
    await target.collection(table).bulkWrite(
      docs.map((d) => ({
        replaceOne: {
          filter: { _id: d._id as string },
          replacement: d,
          upsert: true,
        },
      })) as unknown as import("mongodb").AnyBulkWriteOperation[],
      { ordered: false },
    );
  }
  totalDocs += docs.length;
  console.log(`  ${table}: ${docs.length} docs${dryRun ? " (not written)" : ""}`);
}

if (!dryRun) {
  console.log("[prorouter] Creating indexes…");
  await ensureIndexes(target);
}

console.log(`[prorouter] Done. ${totalDocs} documents${dryRun ? " would be written" : " written"}.`);

await closeDb();
await closeMongo();
process.exit(0);
