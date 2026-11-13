import { and, eq } from "drizzle-orm";
import {
  closeDb,
  getDb,
  runMigrations,
  astraCampaigns,
  creditPackages,
  featureFlags,
  modelCapabilities,
  modelLimits,
  modelPricing,
  modelProviders,
  models,
  plans,
  pricingTiers,
  providerCredentials,
  providers,
  systemSettings,
  users,
  wallets,
  exchangeRates,
  providerCosts,
  pricingVersions,
  modelAliases,
} from "./index.js";
import { encryptSecret, hashPassword, env } from "@pro/shared";
import {
  PRICING_TIER_SEEDS,
  PRO_ALIASES,
  PRO_ALIAS_CONTEXT_WINDOW,
  PRO_ALIAS_MAX_OUTPUT_TOKENS,
  PRO_ALIAS_PROVIDER_SLUG,
  PRO_ALIAS_UPSTREAM_MODEL_ID,
} from "./catalog-aliases.js";
import type { Database } from "./index.js";

export async function seedDatabase(closeAtEnd = false): Promise<void> {
  console.log("[prorouter] Seeding database…");
  await runMigrations();
  const db = (await getDb()) as Database;

  async function upsert(
    table: typeof systemSettings | typeof featureFlags | typeof plans | typeof creditPackages | typeof providers,
    values: Record<string, unknown>,
    conflictTarget: unknown,
  ) {
    await (db as any)
      .insert(table)
      .values(values)
      .onConflictDoNothing({ target: conflictTarget });
  }

  // ── System settings (§68) ───────────────────────────────────────────────
  const settings: Array<{ key: string; value: unknown; description: string }> = [
    { key: "USD_TO_INR_RATE", value: Number(process.env.USD_TO_INR_RATE || 97), description: "INR per 1 USD (admin display policy rate)" },
    { key: "USD_TO_INR_MARKET_RATE", value: 88, description: "True market INR per 1 USD exchange rate" },
    { key: "OPERATIONAL_RESERVE_PERCENT", value: 10, description: "Pricing engine operational reserve percentage" },
    { key: "TARGET_GROSS_MARGIN_PERCENT", value: 30, description: "Pricing engine target gross margin percentage" },
    { key: "PLATFORM_FEE_PERCENT", value: 0, description: "Optional platform fee applied to paid requests" },
    { key: "FREE_REQUESTS_PER_MINUTE", value: 1, description: "Default free-model requests per minute" },
    { key: "FREE_QUEUE_PRIORITY", value: 5, description: "Default queue priority for free-tier requests" },
    { key: "ASTRA_TRIAL_DAYS", value: 7, description: "Days of GPT Astra access granted per redemption" },
    { key: "ASTRA_DISCOUNT_PERCENT", value: 80, description: "Astra campaign discount percentage" },
    { key: "ASTRA_ORIGINAL_PRICE_PAISE", value: 400000, description: "Astra normal price (paise)" },
    { key: "ASTRA_PROMO_PRICE_PAISE", value: 80000, description: "Astra promotional price (paise)" },
    { key: "MAX_API_KEYS", value: 20, description: "Maximum API keys per user" },
    { key: "DEFAULT_TIMEOUT_MS", value: 60000, description: "Default upstream provider timeout" },
    { key: "MAX_RETRIES", value: 2, description: "Default provider retry attempts" },
    { key: "PLATFORM_NAME", value: "ProRouter", description: "Platform display name" },
    { key: "PUBLIC_API_BASE_URL", value: env.publicApiBaseUrl, description: "Public API base URL shown in docs" },
    { key: "BILL_ESTIMATED_USAGE", value: false, description: "Bill requests whose token counts were estimated locally instead of reported upstream" },
  ];
  for (const s of settings) await upsert(systemSettings, s, systemSettings.key);

  // ── Exchange Rates (§7) ────────────────────────────────────────────────
  await db.insert(exchangeRates).values([
    { baseCurrency: "USD", targetCurrency: "INR", rate: 8800, isDisplayPolicy: false, source: "market" },
    { baseCurrency: "USD", targetCurrency: "INR", rate: 8000, isDisplayPolicy: true, source: "admin_display_policy" },
  ]).onConflictDoNothing();

  // ── Feature flags (§69) ────────────────────────────────────────────────
  const flags = [
    { key: "astra_promotion", enabled: true, description: "Astra 7-day promotion & redeem codes" },
    { key: "image_generation", enabled: false, description: "Image playground endpoints" },
    { key: "public_rankings", enabled: true, description: "Public model rankings page" },
    { key: "auto_router", enabled: true, description: "uno/auto model routing" },
    { key: "provider_fallback", enabled: true, description: "Automatic provider fallback" },
    { key: "referral_system", enabled: true, description: "Personal referral codes" },
    { key: "international_payments", enabled: false, description: "Stripe international payments" },
  ];
  for (const f of flags) await upsert(featureFlags, f, featureFlags.key);

  // ── Plans (§23) — all values admin-configurable ────────────────────────
  const planSeeds = [
    {
      slug: "free", name: "Free", tagline: "Start building with free models",
      pricePaise: 0, freeRpm: 1, freeRph: 20, freeRpd: 100, concurrency: 1, queuePriority: 5, sortOrder: 10,
      features: ["1 free-model request / minute", "Standard free queue", "Basic API access", "Community support"],
    },
    {
      slug: "boost", name: "Boost", tagline: "Faster free-model access",
      pricePaise: 199900, freeRpm: 5, freeRph: 120, freeRpd: 1500, concurrency: 3, queuePriority: 3, sortOrder: 20,
      features: ["5 free-model requests / minute", "Faster queue", "Higher concurrency", "Email support"],
    },
    {
      slug: "ultra", name: "Ultra", tagline: "Priority routing for serious workloads",
      pricePaise: 499900, freeRpm: 10, freeRph: 300, freeRpd: 5000, concurrency: 5, queuePriority: 1, sortOrder: 30,
      features: ["10 free-model requests / minute", "Priority routing — no scheduled queue delay", "Highest concurrency", "Premium support"],
    },
  ];
  for (const p of planSeeds) await upsert(plans, { ...p, currency: "INR", period: "month", active: true }, plans.slug);

  // ── Credit packages (§20) ──────────────────────────────────────────────
  const packageSeeds = [
    { slug: "starter-100", name: "Starter Pack", pricePaise: 10000, bonusPaise: 0, sortOrder: 5 },
    { slug: "pro-500", name: "Pro Pack", pricePaise: 50000, bonusPaise: 5000, sortOrder: 6 },
    { slug: "scale-1000", name: "Scale Pack", pricePaise: 100000, bonusPaise: 20000, sortOrder: 7 },
    { slug: "power-2500", name: "Power Pack", pricePaise: 250000, bonusPaise: 65000, sortOrder: 8 },
    { slug: "starter", name: "Starter", pricePaise: 49900, bonusPaise: 0, sortOrder: 10 },
    { slug: "builder", name: "Builder", pricePaise: 99900, bonusPaise: 5100, sortOrder: 20 },
    { slug: "pro", name: "Pro", pricePaise: 249900, bonusPaise: 25100, sortOrder: 30 },
    { slug: "power", name: "Power", pricePaise: 499900, bonusPaise: 75100, sortOrder: 40 },
  ];
  for (const p of packageSeeds) await upsert(creditPackages, { ...p, currency: "INR", active: true }, creditPackages.slug);

  // ── Pricing tiers (§75) — retail USD prices, converted at request time ──
  for (const tier of PRICING_TIER_SEEDS) {
    await db
      .insert(pricingTiers)
      .values({ ...tier, active: true })
      .onConflictDoNothing({ target: pricingTiers.slug });
  }

  // ── Providers (§10, §42) ────────────────
  const providerSeeds = [
    {
      slug: "nabh",
      name: "Nabh Cloud",
      endpointUrl: process.env.PROVIDER_NABH_BASE_URL || "https://api.nabh.cloud/v1",
      adapterType: "openai",
      priority: 12,
      region: "global",
      capabilities: ["chat", "reasoning"],
      description: "Nabh Cloud high-throughput AI gateway.",
    },
    {
      slug: "prorouter-gateway",
      name: "ProRouter Gateway",
      endpointUrl: process.env.PROVIDER_PROROUTER_GATEWAY_BASE_URL || "https://api.tokenjuice.ai/v1",
      adapterType: "openai",
      priority: 5,
      region: "global",
      capabilities: ["chat", "tool_calls", "vision", "reasoning"],
      description: "Primary model gateway.",
    },
    { slug: "openrouter", name: "OpenRouter", endpointUrl: "https://openrouter.ai/api/v1", adapterType: "openai", priority: 10, region: "global", capabilities: ["chat", "tool_calls", "vision"], description: "Aggregated multi-model gateway." },
    { slug: "openai", name: "OpenAI", endpointUrl: "https://api.openai.com/v1", adapterType: "openai", priority: 20, region: "us", capabilities: ["chat", "tool_calls", "vision", "embeddings"], description: "OpenAI platform API." },
    { slug: "groq", name: "Groq", endpointUrl: "https://api.groq.com/openai/v1", adapterType: "openai", priority: 30, region: "us", capabilities: ["chat", "tool_calls"], description: "High-throughput inference." },
    { slug: "mistral", name: "Mistral AI", endpointUrl: "https://api.mistral.ai/v1", adapterType: "openai", priority: 40, region: "eu", capabilities: ["chat", "tool_calls", "vision"], description: "Mistral models, OpenAI-compatible API." },
    { slug: "anthropic", name: "Anthropic", endpointUrl: "https://api.anthropic.com/v1", adapterType: "anthropic", priority: 25, region: "us", capabilities: ["chat", "tool_calls", "vision"], description: "Claude models." },
    { slug: "ollama", name: "Ollama (local)", endpointUrl: "http://localhost:11434/v1", adapterType: "openai", priority: 90, region: "local", capabilities: ["chat"], description: "Local Ollama server (OpenAI-compatible)." },
    { slug: "freemodels", name: "FreeModels", endpointUrl: "https://freemodels-chat.freemodels.workers.dev/v1", adapterType: "freemodels", priority: 15, region: "global", capabilities: ["chat", "reasoning", "vision", "tool_calls"], description: "FreeModels gateway — free access to frontier chat models." },
    {
      slug: "requesty",
      name: "Requesty AI",
      endpointUrl: process.env.PROVIDER_REQUESTY_BASE_URL || "https://router.requesty.ai/v1",
      adapterType: "openai",
      priority: 8,
      region: "global",
      capabilities: ["chat", "tool_calls", "vision", "reasoning"],
      description: "Requesty AI multi-model router gateway.",
    },
  ];
  for (const p of providerSeeds) {
    await upsert(providers, { ...p, status: "unknown" }, providers.slug);
  }

  for (const slug of ["prorouter-gateway", "freemodels", "requesty", "groq", "openrouter", "nabh"]) {
    await db
      .update(providers)
      .set({ status: "active" })
      .where(and(eq(providers.slug, slug), eq(providers.status, "unknown")));
  }

  const envKeyFor: Record<string, string | undefined> = {
    "prorouter-gateway": process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY,
    requesty: process.env.PROVIDER_REQUESTY_API_KEY?.split(/[\s,;\n]+/)[0] || process.env.PROVIDER_REQUESTY_API_KEY,
    openrouter: process.env.PROVIDER_OPENROUTER_API_KEY?.split(/[\s,;\n]+/)[0] || process.env.PROVIDER_OPENROUTER_API_KEY,
    nabh: process.env.PROVIDER_NABH_API_KEY?.split(/[\s,;\n]+/)[0] || process.env.PROVIDER_NABH_API_KEY,
    openai: env.openaiApiKey,
    groq: (process.env.GROQ_API_KEY || env.groqApiKey)?.split(/[\s,;\n]+/)[0],
    mistral: env.mistralApiKey,
    anthropic: env.anthropicApiKey,
    ollama: undefined,
  };

  const providerRows = await db.select().from(providers);
  const providerBySlug = new Map(providerRows.map((p) => [p.slug, p]));
  for (const [slug, secret] of Object.entries(envKeyFor)) {
    if (!secret) continue;
    const row = providerBySlug.get(slug);
    if (!row) continue;
    const enc = encryptSecret(secret);
    await db
      .insert(providerCredentials)
      .values({ providerId: row.id, keyName: "default", ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag })
      .onConflictDoUpdate({
        target: [providerCredentials.providerId, providerCredentials.keyName],
        set: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true },
      });
  }

  // ── Seed Upstream Provider Costs (§4) ────────────────────────────────
  const verifiedUpstreamCosts = [
    { provider: "prorouter-gateway", modelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", inCents: 14, outCents: 28, source: "TokenJuice verified gateway" },
    { provider: "groq", modelId: "qwen/qwen3.8-27b", inCents: 20, outCents: 80, source: "Groq official pricing" },
    { provider: "groq", modelId: "openai/gpt-oss-120b", inCents: 30, outCents: 120, source: "Groq official pricing" },
    { provider: "groq", modelId: "openai/gpt-oss-20b", inCents: 8, outCents: 24, source: "Groq official pricing" },
    { provider: "groq", modelId: "allam-2-7b", inCents: 5, outCents: 15, source: "Groq official pricing" },
    { provider: "requesty", modelId: "mistral/leanstral-1-5", inCents: 12, outCents: 36, source: "Requesty verified router" },
    { provider: "requesty", modelId: "novita/ling-3.1-flash", inCents: 8, outCents: 24, source: "Requesty verified router" },
    { provider: "requesty", modelId: "google/gemma-4-31b-it", inCents: 14, outCents: 42, source: "Requesty verified router" },
    { provider: "requesty", modelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", inCents: 15, outCents: 45, source: "Requesty verified router" },
    { provider: "requesty", modelId: "nvidia/nemotron-3.5-lightning-30b-a3b", inCents: 10, outCents: 30, source: "Requesty verified router" },
    { provider: "requesty", modelId: "nvidia/nemotron-3-ultra-550b-a55b", inCents: 70, outCents: 210, source: "Requesty verified router" },
    { provider: "openrouter", modelId: "nvidia/nemotron-3.5-super-vl:free", inCents: 20, outCents: 60, source: "OpenRouter verified gateway" },
    { provider: "nabh", modelId: "gpt-oss-20b", inCents: 8, outCents: 24, source: "Nabh Cloud verified gateway" },
  ];

  for (const c of verifiedUpstreamCosts) {
    const prov = providerBySlug.get(c.provider);
    if (!prov) continue;
    await db.insert(providerCosts).values({
      providerId: prov.id,
      providerModelId: c.modelId,
      inputCostUsdCentsPerMillion: c.inCents,
      outputCostUsdCentsPerMillion: c.outCents,
      cachedInputCostUsdCentsPerMillion: Math.round(c.inCents / 2),
      sourceIdentifier: c.source,
      currency: "USD",
      verifiedBy: "system_audit",
    }).onConflictDoNothing();
  }

  // ── Model catalog (§75) — STRICT 48-HOUR PROMOTION ENFORCEMENT ─────────
  type SeedModel = {
    slug: string;
    canonicalId: string;
    name: string;
    description: string;
    provider: string;
    isFree: boolean;
    contextWindow: number;
    maxOutputTokens: number;
    input: number; // in paise
    output: number; // in paise
    rank: number;
    popularity: number;
    reasoning?: boolean;
    vision?: boolean;
    toolCalls?: boolean;
    structured?: boolean;
    status?: "active" | "coming_soon";
    pricingStatus?: "approved" | "pricing_pending" | "disabled";
    links: Array<{ provider: string; providerModelId: string; priority?: number }>;
    freeLimits?: { perMinute: number; perHour: number; perDay: number };
  };

  // ONLY TWO CANONICAL IDENTITIES ARE PROMOTIONAL:
  // 1. deepseek-v4.1-flash (and exact checkpoint 1017)
  // 2. qwen3.8-27b (and exact namespace qwen/qwen3.8-27b)
  // ALL OTHER MODELS ARE STRICTLY PAID.
  const catalog: SeedModel[] = [
    {
      slug: "deepseek-v4.1-flash-1017",
      canonicalId: "deepseek-v4.1-flash",
      name: "DeepSeek-V4.1-Flash-1017",
      description: "DeepSeek V4.1 Flash — state-of-the-art fast reasoning, coding, and multilingual intelligence.",
      provider: "prorouter-gateway",
      isFree: true, // Promotional canonical model
      contextWindow: 262144,
      maxOutputTokens: 128000,
      input: 1760,
      output: 3520,
      rank: 1,
      popularity: 9900,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
      freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 },
    },
    {
      slug: "deepseek-v4.1-flash",
      canonicalId: "deepseek-v4.1-flash",
      name: "DeepSeek V4.1 Flash",
      description: "DeepSeek V4.1 Flash — high-speed reasoning and code synthesis.",
      provider: "prorouter-gateway",
      isFree: true, // Promotional canonical model
      contextWindow: 262144,
      maxOutputTokens: 128000,
      input: 1760,
      output: 3520,
      rank: 2,
      popularity: 9880,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
      freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 },
    },
    {
      slug: "qwen/qwen3.8-27b",
      canonicalId: "qwen3.8-27b",
      name: "Qwen 3.8 27B",
      description: "Alibaba Qwen3.8 27B — high-performance open-weight model with strong multilingual and reasoning abilities running on Groq LPU.",
      provider: "groq",
      isFree: true, // Promotional canonical model
      contextWindow: 131072,
      maxOutputTokens: 64000,
      input: 2510,
      output: 10060,
      rank: 4,
      popularity: 9850,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "groq", providerModelId: "qwen/qwen3.8-27b", priority: 10 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
      freeLimits: { perMinute: 15, perHour: 150, perDay: 1500 },
    },
    {
      slug: "qwen3.8-27b",
      canonicalId: "qwen3.8-27b",
      name: "Qwen3.8-27B",
      description: "Alibaba Qwen3.8 27B — high-performance open-weight model with strong multilingual and reasoning abilities.",
      provider: "groq",
      isFree: true, // Promotional canonical model
      contextWindow: 131072,
      maxOutputTokens: 64000,
      input: 2510,
      output: 10060,
      rank: 3,
      popularity: 9850,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "groq", providerModelId: "qwen/qwen3.8-27b", priority: 10 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
      freeLimits: { perMinute: 15, perHour: 150, perDay: 1500 },
    },
    // ALL OTHER MODELS ARE STRICTLY PAID
    {
      slug: "claude-sonnet",
      canonicalId: "claude-3-5-sonnet",
      name: "Claude Sonnet",
      description: "Anthropic Claude Sonnet — balanced intelligence, high coding precision, and nuanced creative writing.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 200000,
      maxOutputTokens: 64000,
      input: 37700,
      output: 188600,
      rank: 12,
      popularity: 9950,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "claude-opus",
      canonicalId: "claude-3-opus",
      name: "Claude Opus",
      description: "Anthropic Claude Opus — deep analysis, nuanced reasoning, and complex task decomposition.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 200000,
      maxOutputTokens: 64000,
      input: 62900,
      output: 314300,
      rank: 13,
      popularity: 9930,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "gemini-pro",
      canonicalId: "gemini-1.5-pro",
      name: "Gemini Pro",
      description: "Google Gemini Pro — powerful multimodal model with vast context window and world knowledge.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 1000000,
      maxOutputTokens: 64000,
      input: 1900,
      output: 7500,
      rank: 14,
      popularity: 9910,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "grok",
      canonicalId: "grok-2",
      name: "Grok",
      description: "xAI Grok — direct, truthful AI with real-time insight and witty demeanor.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 131072,
      maxOutputTokens: 64000,
      input: 6300,
      output: 25100,
      rank: 15,
      popularity: 9890,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "mistral-large",
      canonicalId: "mistral-large-2407",
      name: "Mistral Large",
      description: "Mistral Large — flagship model for complex multilingual reasoning and precise instruction following.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 128000,
      maxOutputTokens: 64000,
      input: 25100,
      output: 75400,
      rank: 16,
      popularity: 9810,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "glm-5.3",
      canonicalId: "glm-5.3",
      name: "GLM-5.3",
      description: "Zhipu GLM-5.3 — flagship bilingual reasoning, analytical thinking, and tool execution.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 200000,
      maxOutputTokens: 128000,
      input: 7540,
      output: 22630,
      rank: 5,
      popularity: 9800,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "kimi-k3",
      canonicalId: "kimi-k3",
      name: "Kimi K3",
      description: "Moonshot Kimi K3 — ultra long-context frontier model with high-speed reasoning and deep comprehension.",
      provider: "prorouter-gateway",
      isFree: false,
      contextWindow: 200000,
      maxOutputTokens: 64000,
      input: 10060,
      output: 30170,
      rank: 6,
      popularity: 9820,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }],
    },
    {
      slug: "gpt-oss-120b",
      canonicalId: "gpt-oss-120b",
      name: "GPT OSS 120B",
      description: "OpenAI open-weight 120B parameter MoE reasoning architecture with high throughput on Groq LPU.",
      provider: "groq",
      isFree: false,
      contextWindow: 131072,
      maxOutputTokens: 32768,
      input: 3770,
      output: 15090,
      rank: 35,
      popularity: 9800,
      reasoning: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "groq", providerModelId: "openai/gpt-oss-120b", priority: 10 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
    {
      slug: "gpt-oss-20b",
      canonicalId: "gpt-oss-20b",
      name: "GPT OSS 20B",
      description: "Open-weight 20B parameter reasoning and chat model with high speed and chain-of-thought capabilities.",
      provider: "nabh",
      isFree: false,
      contextWindow: 131072,
      maxOutputTokens: 16384,
      input: 1010,
      output: 3020,
      rank: 34,
      popularity: 9750,
      reasoning: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "nabh", providerModelId: "gpt-oss-20b", priority: 10 }, { provider: "groq", providerModelId: "openai/gpt-oss-20b", priority: 20 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
    {
      slug: "nemotron-3-ultra-550b-a55b",
      canonicalId: "nemotron-3-ultra-550b",
      name: "Nemotron 3 Ultra 550B A55B",
      description: "NVIDIA Nemotron 3 Ultra 550B A55B — ultra-scale frontier reasoning engine with 1M context.",
      provider: "requesty",
      isFree: false,
      contextWindow: 1048576,
      maxOutputTokens: 65536,
      input: 8800,
      output: 26400,
      rank: 32,
      popularity: 9880,
      reasoning: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "requesty", providerModelId: "nvidia/nemotron-3-ultra-550b-a55b", priority: 10 }, { provider: "openrouter", providerModelId: "nvidia/nemotron-3-ultra-550b-a55b:free", priority: 20 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
    {
      slug: "nemotron-3-nano-omni-30b-a3b-reasoning",
      canonicalId: "nemotron-3-nano-omni-30b",
      name: "Nemotron 3 Nano Omni 30B Reasoning",
      description: "NVIDIA Nemotron 3 Nano Omni 30B — deep chain-of-thought reasoning and multimodal STEM problem-solving with 131K context.",
      provider: "requesty",
      isFree: false,
      contextWindow: 131072,
      maxOutputTokens: 20480,
      input: 1890,
      output: 5660,
      rank: 30,
      popularity: 9700,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "requesty", providerModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", priority: 10 }, { provider: "openrouter", providerModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", priority: 20 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
    {
      slug: "gemma-4-31b-it",
      canonicalId: "gemma-4-31b-it",
      name: "Gemma 4 31B IT",
      description: "Google Gemma 4 31B Instruction-Tuned — Google's latest open frontier architecture featuring 262K context.",
      provider: "requesty",
      isFree: false,
      contextWindow: 262144,
      maxOutputTokens: 8192,
      input: 1760,
      output: 5280,
      rank: 33,
      popularity: 9820,
      reasoning: true,
      vision: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "requesty", providerModelId: "google/gemma-4-31b-it", priority: 10 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
    {
      slug: "leanstral-1-5",
      canonicalId: "leanstral-1-5",
      name: "Leanstral 1.5",
      description: "Mistral Leanstral 1.5 — high-efficiency reasoning model with massive 262K context.",
      provider: "requesty",
      isFree: false,
      contextWindow: 262144,
      maxOutputTokens: 32768,
      input: 1510,
      output: 4530,
      rank: 28,
      popularity: 9600,
      reasoning: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "requesty", providerModelId: "mistral/leanstral-1-5", priority: 10 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
    {
      slug: "ling-3.1-flash",
      canonicalId: "ling-3.1-flash",
      name: "Ling 3.1 Flash",
      description: "Novita Ling 3.1 Flash — ultra-responsive 262K context model for conversational speed.",
      provider: "requesty",
      isFree: false,
      contextWindow: 262144,
      maxOutputTokens: 32768,
      input: 1010,
      output: 3020,
      rank: 29,
      popularity: 9580,
      reasoning: true,
      toolCalls: true,
      structured: true,
      pricingStatus: "approved",
      links: [{ provider: "requesty", providerModelId: "novita/ling-3.1-flash", priority: 10 }, { provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 50 }],
    },
  ];

  for (const m of catalog) {
    const providerRow = providerBySlug.get(m.provider);
    const [inserted] = await db
      .insert(models)
      .values({
        slug: m.slug,
        name: m.name,
        canonicalModelId: m.canonicalId,
        description: m.description,
        providerId: providerRow?.id ?? null,
        type: "chat",
        status: m.status ?? "active",
        pricingStatus: m.pricingStatus ?? "approved",
        isFree: m.isFree,
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        rank: m.rank,
        popularity: m.popularity,
        rating: Math.max(0, 100 - m.rank * 3),
      })
      .onConflictDoNothing({ target: models.slug })
      .returning();

    const existing = inserted ?? (await db.select().from(models).where(eq(models.slug, m.slug)))[0];
    if (!existing) continue;

    await db.insert(modelPricing).values({
      modelId: existing.id,
      inputPerMillion: m.input,
      outputPerMillion: m.output,
      cachedInputPerMillion: m.isFree ? 0 : Math.round(m.input / 2),
      currency: "INR",
    }).onConflictDoNothing({ target: modelPricing.modelId });

    // Insert initial pricing version (§10)
    await db.insert(pricingVersions).values({
      modelId: existing.id,
      version: 1,
      inputUsdCentsPerMillion: Math.round(m.input / 80),
      outputUsdCentsPerMillion: Math.round(m.output / 80),
      cachedInputUsdCentsPerMillion: Math.round(m.input / 160),
      inputPaisePerMillion: m.input,
      outputPaisePerMillion: m.output,
      targetGrossMarginBp: 3000,
      operationalReserveBp: 1000,
      active: true,
      approvedBy: "system_seed",
    }).onConflictDoNothing();

    await db.insert(modelCapabilities).values({
      modelId: existing.id,
      modalities: m.vision ? ["text", "image"] : ["text"],
      streaming: true,
      toolCalls: m.toolCalls ?? false,
      structuredOutputs: m.structured ?? false,
      reasoning: m.reasoning ?? false,
      vision: m.vision ?? false,
      imageGeneration: false,
      audio: false,
      jsonMode: true,
    }).onConflictDoNothing({ target: modelCapabilities.modelId });

    if (m.isFree) {
      await db.insert(modelLimits).values({
        modelId: existing.id,
        perMinute: m.freeLimits?.perMinute ?? 1,
        perHour: m.freeLimits?.perHour ?? 30,
        perDay: m.freeLimits?.perDay ?? 200,
        concurrency: 1,
        queuePriority: 5,
      }).onConflictDoNothing({ target: modelLimits.modelId });
    }

    for (const link of m.links) {
      const linkProvider = providerBySlug.get(link.provider);
      if (!linkProvider) continue;
      await db.insert(modelProviders).values({
        modelId: existing.id,
        providerId: linkProvider.id,
        providerModelId: link.providerModelId,
        priority: link.priority ?? 100,
        status: "active",
      }).onConflictDoUpdate({
        target: [modelProviders.modelId, modelProviders.providerId],
        set: { providerModelId: link.providerModelId, priority: link.priority ?? 100, status: "active" },
      });
    }
  }

  // ── Pro alias series (§75) — 300 public aliases on the shared gateway ───
  const aliasProvider = providerBySlug.get(PRO_ALIAS_PROVIDER_SLUG);
  if (!aliasProvider) {
    console.warn(`[prorouter] Provider '${PRO_ALIAS_PROVIDER_SLUG}' missing — skipping Pro aliases.`);
  } else {
    for (const alias of PRO_ALIASES) {
      const [inserted] = await db
        .insert(models)
        .values({
          slug: alias.slug,
          canonicalModelId: "deepseek-v4.1-flash",
          name: alias.name,
          description: alias.description,
          providerId: aliasProvider.id,
          type: "chat",
          status: "active",
          pricingStatus: "approved",
          isFree: false, // Strict policy: Pro aliases are paid
          pricingTier: alias.pricingTier,
          contextWindow: PRO_ALIAS_CONTEXT_WINDOW,
          maxOutputTokens: PRO_ALIAS_MAX_OUTPUT_TOKENS,
          rank: alias.rank,
          popularity: alias.popularity,
          rating: 85,
        })
        .onConflictDoNothing({ target: models.slug })
        .returning();

      const existing = inserted ?? (await db.select().from(models).where(eq(models.slug, alias.slug)))[0];
      if (!existing) continue;

      // Seed alias mapping in model_aliases table
      await db.insert(modelAliases).values({
        alias: alias.slug,
        canonicalModelId: "deepseek-v4.1-flash",
        providerSlug: PRO_ALIAS_PROVIDER_SLUG,
        description: alias.description,
        active: true,
      }).onConflictDoNothing();

      await db.insert(modelCapabilities).values({
        modelId: existing.id,
        modalities: ["text", "image"],
        streaming: true,
        toolCalls: true,
        structuredOutputs: true,
        reasoning: true,
        vision: true,
        imageGeneration: false,
        audio: false,
        jsonMode: true,
      }).onConflictDoNothing({ target: modelCapabilities.modelId });

      await db.insert(modelProviders).values({
        modelId: existing.id,
        providerId: aliasProvider.id,
        providerModelId: alias.upstreamModelId || PRO_ALIAS_UPSTREAM_MODEL_ID,
        priority: 10,
        status: "active",
      }).onConflictDoNothing({ target: [modelProviders.modelId, modelProviders.providerId] });
    }
    console.log(`[prorouter] Pro alias series ready: ${PRO_ALIASES.length} models.`);
  }

  // ── Astra campaign (§25) — configured from env/admin ───────────────────
  await db.insert(astraCampaigns).values({
    slug: "astra-7day-launch",
    name: "Astra 7-Day Access",
    originalPricePaise: Number(env.isProd ? 400000 : process.env.ASTRA_ORIGINAL_PRICE_PAISE || 400000),
    discountPercent: Number(process.env.ASTRA_DISCOUNT_PERCENT || 80),
    promoPricePaise: Number(process.env.ASTRA_PROMO_PRICE_PAISE || 80000),
    trialDays: Number(process.env.ASTRA_TRIAL_DAYS || 7),
    allowMultiRedeem: true,
    active: true,
  }).onConflictDoNothing({ target: astraCampaigns.slug });

  // ── Development admin account (§76 — env-provided, never hard-coded) ───
  if (env.adminEmail && env.adminPassword) {
    const existingAdmin = await db.select().from(users).where(eq(users.email, env.adminEmail.toLowerCase()));
    if (existingAdmin.length === 0) {
      const [admin] = await db.insert(users).values({
        email: env.adminEmail.toLowerCase(),
        passwordHash: await hashPassword(env.adminPassword),
        name: "Administrator",
        role: "admin",
        emailVerified: true,
      }).returning();
      await db.insert(wallets).values({ userId: admin!.id, balancePaise: 0 }).onConflictDoNothing();
      console.log(`[prorouter] Seeded admin account: ${env.adminEmail}`);
    }
  } else {
    console.log("[prorouter] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed.");
  }

  console.log("[prorouter] Seed complete.");
  if (closeAtEnd) await closeDb();
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  void seedDatabase(true).catch((err) => { console.error("Seed error:", err); process.exit(1); });
}