/**
 * Typed collection accessors. Collection names match the SQL table names so
 * the PGlite→Mongo migration script and humans can map them 1:1.
 */

import type { Collection, Db } from "mongodb";
import type {
  AstraCampaignDoc,
  AstraEntitlementDoc,
  ApiKeyDoc,
  AuditLogDoc,
  ConversationDoc,
  CreditPackageDoc,
  EmailLogDoc,
  EventLogDoc,
  FeatureFlagDoc,
  FreeUsageDoc,
  GiftCodeDoc,
  GiftCodeRedemptionDoc,
  IncidentDoc,
  MessageDoc,
  ModelCapabilitiesDoc,
  ModelLimitsDoc,
  ModelPricingDoc,
  ModelProviderDoc,
  ModelDoc,
  NotificationDoc,
  NotificationPrefDoc,
  PaymentDoc,
  PaymentWebhookDoc,
  PlanDoc,
  ProviderCredentialDoc,
  ProviderDoc,
  ProviderHealthDoc,
  RequestAttemptDoc,
  RequestDoc,
  RoutingRuleDoc,
  SessionDoc,
  SubscriptionDoc,
  SystemSettingDoc,
  UserDoc,
  WalletDoc,
  WalletTransactionDoc,
} from "./types.js";

export interface Collections {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;
  apiKeys: Collection<ApiKeyDoc>;
  wallets: Collection<WalletDoc>;
  walletTransactions: Collection<WalletTransactionDoc>;
  creditPackages: Collection<CreditPackageDoc>;
  plans: Collection<PlanDoc>;
  subscriptions: Collection<SubscriptionDoc>;
  payments: Collection<PaymentDoc>;
  paymentWebhooks: Collection<PaymentWebhookDoc>;
  providers: Collection<ProviderDoc>;
  providerCredentials: Collection<ProviderCredentialDoc>;
  providerHealth: Collection<ProviderHealthDoc>;
  models: Collection<ModelDoc>;
  modelPricing: Collection<ModelPricingDoc>;
  modelCapabilities: Collection<ModelCapabilitiesDoc>;
  modelProviders: Collection<ModelProviderDoc>;
  modelLimits: Collection<ModelLimitsDoc>;
  routingRules: Collection<RoutingRuleDoc>;
  systemSettings: Collection<SystemSettingDoc>;
  featureFlags: Collection<FeatureFlagDoc>;
  auditLogs: Collection<AuditLogDoc>;
  notifications: Collection<NotificationDoc>;
  notificationPrefs: Collection<NotificationPrefDoc>;
  incidents: Collection<IncidentDoc>;
  emailLog: Collection<EmailLogDoc>;
  requests: Collection<RequestDoc>;
  requestAttempts: Collection<RequestAttemptDoc>;
  freeUsage: Collection<FreeUsageDoc>;
  conversations: Collection<ConversationDoc>;
  messages: Collection<MessageDoc>;
  astraCampaigns: Collection<AstraCampaignDoc>;
  giftCodes: Collection<GiftCodeDoc>;
  giftCodeRedemptions: Collection<GiftCodeRedemptionDoc>;
  astraEntitlements: Collection<AstraEntitlementDoc>;
  eventLogs: Collection<EventLogDoc>;
}

/** Wire camelCase accessors to the snake_case collection names on the server. */
export function getCollections(db: Db): Collections {
  return {
    users: db.collection<UserDoc>("users"),
    sessions: db.collection<SessionDoc>("sessions"),
    apiKeys: db.collection<ApiKeyDoc>("api_keys"),
    wallets: db.collection<WalletDoc>("wallets"),
    walletTransactions: db.collection<WalletTransactionDoc>("wallet_transactions"),
    creditPackages: db.collection<CreditPackageDoc>("credit_packages"),
    plans: db.collection<PlanDoc>("plans"),
    subscriptions: db.collection<SubscriptionDoc>("subscriptions"),
    payments: db.collection<PaymentDoc>("payments"),
    paymentWebhooks: db.collection<PaymentWebhookDoc>("payment_webhooks"),
    providers: db.collection<ProviderDoc>("providers"),
    providerCredentials: db.collection<ProviderCredentialDoc>("provider_credentials"),
    providerHealth: db.collection<ProviderHealthDoc>("provider_health"),
    models: db.collection<ModelDoc>("models"),
    modelPricing: db.collection<ModelPricingDoc>("model_pricing"),
    modelCapabilities: db.collection<ModelCapabilitiesDoc>("model_capabilities"),
    modelProviders: db.collection<ModelProviderDoc>("model_providers"),
    modelLimits: db.collection<ModelLimitsDoc>("model_limits"),
    routingRules: db.collection<RoutingRuleDoc>("routing_rules"),
    systemSettings: db.collection<SystemSettingDoc>("system_settings"),
    featureFlags: db.collection<FeatureFlagDoc>("feature_flags"),
    auditLogs: db.collection<AuditLogDoc>("audit_logs"),
    notifications: db.collection<NotificationDoc>("notifications"),
    notificationPrefs: db.collection<NotificationPrefDoc>("notification_prefs"),
    incidents: db.collection<IncidentDoc>("incidents"),
    emailLog: db.collection<EmailLogDoc>("email_log"),
    requests: db.collection<RequestDoc>("requests"),
    requestAttempts: db.collection<RequestAttemptDoc>("request_attempts"),
    freeUsage: db.collection<FreeUsageDoc>("free_usage"),
    conversations: db.collection<ConversationDoc>("conversations"),
    messages: db.collection<MessageDoc>("messages"),
    astraCampaigns: db.collection<AstraCampaignDoc>("astra_campaigns"),
    giftCodes: db.collection<GiftCodeDoc>("gift_codes"),
    giftCodeRedemptions: db.collection<GiftCodeRedemptionDoc>("gift_code_redemptions"),
    astraEntitlements: db.collection<AstraEntitlementDoc>("astra_entitlements"),
    eventLogs: db.collection<EventLogDoc>("event_logs"),
  };
}
