/**
 * Index definitions — mirrors the SQL unique constraints and the hot query
 * patterns from the route layer. Idempotent: createIndexes with the same
 * spec is a no-op on an existing cluster.
 */

import type { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    // ── Auth ────────────────────────────────────────────────────────────
    db.collection("users").createIndexes([
      { key: { email: 1 }, unique: true, name: "users_email_uq" },
      { key: { role: 1 }, name: "users_role_idx" },
      { key: { createdAt: -1 }, name: "users_created_idx" },
    ]),
    db.collection("sessions").createIndexes([
      { key: { tokenHash: 1 }, unique: true, name: "sessions_token_uq" },
      { key: { userId: 1, expiresAt: -1 }, name: "sessions_user_expires_idx" },
      { key: { expiresAt: 1 }, name: "sessions_expires_idx" },
    ]),
    db.collection("api_keys").createIndexes([
      { key: { keyHash: 1 }, unique: true, name: "api_keys_hash_uq" },
      { key: { userId: 1, createdAt: -1 }, name: "api_keys_user_idx" },
      { key: { prefix: 1 }, name: "api_keys_prefix_idx" },
    ]),

    // ── Billing ─────────────────────────────────────────────────────────
    // wallets: _id IS the userId — no extra unique index needed.
    db.collection("wallet_transactions").createIndexes([
      { key: { userId: 1, createdAt: -1 }, name: "wallet_tx_user_idx" },
      {
        key: { idempotencyKey: 1 },
        unique: true,
        name: "wallet_tx_idem_uq",
        partialFilterExpression: { idempotencyKey: { $type: "string" } },
      },
    ]),
    db.collection("credit_packages").createIndexes([{ key: { slug: 1 }, unique: true, name: "credit_packages_slug_uq" }]),
    db.collection("plans").createIndexes([{ key: { slug: 1 }, unique: true, name: "plans_slug_uq" }]),
    db.collection("subscriptions").createIndexes([
      { key: { userId: 1, createdAt: -1 }, name: "subscriptions_user_idx" },
      { key: { planId: 1 }, name: "subscriptions_plan_idx" },
    ]),
    db.collection("payments").createIndexes([
      {
        key: { idempotencyKey: 1 },
        unique: true,
        name: "payments_idem_uq",
        partialFilterExpression: { idempotencyKey: { $type: "string" } },
      },
      { key: { invoiceNumber: 1 }, unique: true, name: "payments_invoice_uq" },
      { key: { userId: 1, createdAt: -1 }, name: "payments_user_idx" },
      { key: { gatewayOrderId: 1 }, name: "payments_gateway_order_idx" },
    ]),
    db.collection("payment_webhooks").createIndexes([{ key: { eventId: 1 }, unique: true, name: "payment_webhooks_event_uq" }]),

    // ── Catalog ─────────────────────────────────────────────────────────
    db.collection("providers").createIndexes([
      { key: { slug: 1 }, unique: true, name: "providers_slug_uq" },
      { key: { priority: 1 }, name: "providers_priority_idx" },
    ]),
    db.collection("provider_credentials").createIndexes([
      { key: { providerId: 1, active: 1 }, name: "provider_credentials_provider_idx" },
    ]),
    db.collection("provider_health").createIndexes([
      { key: { providerId: 1, checkedAt: -1 }, name: "provider_health_provider_idx" },
    ]),
    db.collection("models").createIndexes([
      { key: { slug: 1 }, unique: true, name: "models_slug_uq" },
      { key: { status: 1 }, name: "models_status_idx" },
      { key: { rank: 1, popularity: -1 }, name: "models_rank_idx" },
      { key: { isFree: 1 }, name: "models_free_idx" },
    ]),
    // model_pricing / model_capabilities / model_limits: _id = modelId.
    db.collection("model_providers").createIndexes([
      { key: { modelId: 1, providerId: 1 }, unique: true, name: "model_providers_uq" },
      { key: { providerId: 1 }, name: "model_providers_provider_idx" },
    ]),
    db.collection("routing_rules").createIndexes([{ key: { priority: 1, active: -1 }, name: "routing_rules_priority_idx" }]),

    // ── Requests ────────────────────────────────────────────────────────
    db.collection("requests").createIndexes([
      { key: { userId: 1, createdAt: -1 }, name: "requests_user_idx" },
      { key: { modelId: 1, createdAt: -1 }, name: "requests_model_idx" },
      { key: { providerId: 1, createdAt: -1 }, name: "requests_provider_idx" },
      { key: { apiKeyId: 1 }, name: "requests_apikey_idx" },
      { key: { status: 1, createdAt: -1 }, name: "requests_status_idx" },
      { key: { createdAt: -1 }, name: "requests_created_idx" },
    ]),
    db.collection("request_attempts").createIndexes([
      { key: { requestId: 1 }, name: "request_attempts_request_idx" },
      { key: { requestId: 1, attempt: 1 }, unique: true, name: "request_attempts_uq" },
    ]),
    db.collection("free_usage").createIndexes([
      { key: { userId: 1, bucketKey: 1 }, unique: true, name: "free_usage_uq" },
      { key: { updatedAt: 1 }, name: "free_usage_updated_idx" },
    ]),
    db.collection("conversations").createIndexes([
      { key: { userId: 1, updatedAt: -1 }, name: "conversations_user_idx" },
    ]),
    db.collection("messages").createIndexes([
      { key: { conversationId: 1, createdAt: 1 }, name: "messages_conversation_idx" },
    ]),

    // ── Platform ────────────────────────────────────────────────────────
    // system_settings / feature_flags: _id IS the key.
    db.collection("audit_logs").createIndexes([
      { key: { actorUserId: 1, createdAt: -1 }, name: "audit_logs_actor_idx" },
      { key: { action: 1, createdAt: -1 }, name: "audit_logs_action_idx" },
      { key: { createdAt: -1 }, name: "audit_logs_created_idx" },
    ]),
    db.collection("notifications").createIndexes([
      { key: { userId: 1, createdAt: -1 }, name: "notifications_user_idx" },
      { key: { readAt: 1 }, name: "notifications_unread_idx", partialFilterExpression: { readAt: null } },
    ]),
    db.collection("notification_prefs").createIndexes([
      { key: { userId: 1, type: 1 }, unique: true, name: "notification_prefs_uq" },
    ]),
    db.collection("incidents").createIndexes([{ key: { service: 1, startedAt: -1 }, name: "incidents_service_idx" }]),
    db.collection("email_log").createIndexes([{ key: { userId: 1, sentAt: -1 }, name: "email_log_user_idx" }]),

    // ── Promotions ──────────────────────────────────────────────────────
    db.collection("astra_campaigns").createIndexes([{ key: { slug: 1 }, unique: true, name: "astra_campaigns_slug_uq" }]),
    db.collection("gift_codes").createIndexes([
      { key: { code: 1 }, unique: true, name: "gift_codes_code_uq" },
      { key: { ownerUserId: 1 }, name: "gift_codes_owner_idx" },
      { key: { campaignId: 1 }, name: "gift_codes_campaign_idx" },
    ]),
    db.collection("gift_code_redemptions").createIndexes([
      { key: { codeId: 1, redeemerUserId: 1 }, unique: true, name: "redemptions_code_user_uq" },
      { key: { redeemerUserId: 1, redeemedAt: -1 }, name: "redemptions_redeemer_idx" },
      { key: { campaignId: 1 }, name: "redemptions_campaign_idx" },
    ]),
    db.collection("astra_entitlements").createIndexes([
      { key: { userId: 1, status: 1, expiresAt: -1 }, name: "astra_entitlements_user_idx" },
      {
        key: { sourceCodeId: 1, userId: 1 },
        unique: true,
        name: "astra_entitlements_code_user_uq",
        partialFilterExpression: { sourceCodeId: { $type: "string" } },
      },
    ]),

    // ── Tracking (new) ──────────────────────────────────────────────────
    db.collection("event_logs").createIndexes([
      { key: { userId: 1, createdAt: -1 }, name: "event_logs_user_idx" },
      { key: { type: 1, createdAt: -1 }, name: "event_logs_type_idx" },
      { key: { requestId: 1 }, name: "event_logs_request_idx", sparse: true },
      { key: { createdAt: -1 }, name: "event_logs_created_idx" },
    ]),
  ]);
}
