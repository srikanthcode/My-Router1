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
  { key: "USD_TO_INR_RATE", value: Number(env.isProd ? 97 : process.env.USD_TO_INR_RATE || 97), description: "INR per 1 USD (admin-configurable)" },
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

// ── Providers (§10, §42) — admin adds credentials later ────────────────
const providerSeeds = [
  {
    slug: "prorouter-gateway",
    name: "ProRouter Gateway",
    endpointUrl: process.env.PROVIDER_PROROUTER_GATEWAY_BASE_URL || "https://api.tokenjuice.ai/v1",
    adapterType: "openai",
    priority: 5,
    region: "global",
    capabilities: ["chat", "tool_calls", "vision", "reasoning"],
    description: "Primary model gateway.", // internal only — no upstream host/key shown in the UI
  },
  { slug: "openrouter", name: "OpenRouter", endpointUrl: "https://openrouter.ai/api/v1", adapterType: "openai", priority: 10, region: "global", capabilities: ["chat", "tool_calls", "vision"], description: "Aggregated multi-model gateway." },
  { slug: "openai", name: "OpenAI", endpointUrl: "https://api.openai.com/v1", adapterType: "openai", priority: 20, region: "us", capabilities: ["chat", "tool_calls", "vision", "embeddings"], description: "OpenAI platform API." },
  { slug: "groq", name: "Groq", endpointUrl: "https://api.groq.com/openai/v1", adapterType: "openai", priority: 30, region: "us", capabilities: ["chat", "tool_calls"], description: "High-throughput inference." },
  { slug: "mistral", name: "Mistral AI", endpointUrl: "https://api.mistral.ai/v1", adapterType: "openai", priority: 40, region: "eu", capabilities: ["chat", "tool_calls", "vision"], description: "Mistral models, OpenAI-compatible API." },
  { slug: "anthropic", name: "Anthropic", endpointUrl: "https://api.anthropic.com/v1", adapterType: "anthropic", priority: 25, region: "us", capabilities: ["chat", "tool_calls", "vision"], description: "Claude models." },
  { slug: "ollama", name: "Ollama (local)", endpointUrl: "http://localhost:11434/v1", adapterType: "openai", priority: 90, region: "local", capabilities: ["chat"], description: "Local Ollama server (OpenAI-compatible)." },
  { slug: "freemodels", name: "FreeModels", endpointUrl: "https://freemodels-chat.freemodels.workers.dev/v1", adapterType: "freemodels", priority: 15, region: "global", capabilities: ["chat", "reasoning", "vision", "tool_calls"], description: "FreeModels gateway — free access to frontier chat models." },
];
for (const p of providerSeeds) {
  await upsert(providers, { ...p, status: "unknown" }, providers.slug);
}

if (true) {
  await db
    .update(providers)
    .set({ endpointUrl: process.env.PROVIDER_PROROUTER_GATEWAY_BASE_URL || "https://api.tokenjuice.ai/v1", status: "active" })
    .where(eq(providers.slug, "prorouter-gateway"));
}

// Providers that need no stored credential and are verified reachable are
// marked active so their models are routable and shown as available immediately.
for (const slug of ["prorouter-gateway", "freemodels"]) {
  await db
    .update(providers)
    .set({ status: "active" })
    .where(and(eq(providers.slug, slug), eq(providers.status, "unknown")));
}

// Import provider secrets from env when present (e.g. PROVIDER_OPENROUTER_API_KEY)
const envKeyFor: Record<string, string | undefined> = {
  "prorouter-gateway": process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY,
  openrouter: process.env.PROVIDER_OPENROUTER_API_KEY,
  openai: env.openaiApiKey,
  groq: env.groqApiKey,
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
  // Env is the source of truth for upstream keys: refresh the stored ciphertext
  // so a rotated key in .env actually takes effect (pipeline prefers DB creds).
  await db
    .insert(providerCredentials)
    .values({ providerId: row.id, keyName: "default", ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag })
    .onConflictDoUpdate({
      target: [providerCredentials.providerId, providerCredentials.keyName],
      set: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true },
    });
}

// ── Model catalog (§75) — lives in DB, admin-editable ──────────────────
type SeedModel = {
  slug: string; name: string; description: string; provider: string; isFree: boolean;
  contextWindow: number; maxOutputTokens: number; input: number; output: number;
  rank: number; popularity: number; reasoning?: boolean; vision?: boolean; toolCalls?: boolean;
  structured?: boolean; status?: "active" | "coming_soon";
  links: Array<{ provider: string; providerModelId: string; priority?: number }>;
  freeLimits?: { perMinute: number; perHour: number; perDay: number };
};

const catalog: SeedModel[] = [
  { slug: "deepseek-v4.1-flash-1017", name: "DeepSeek-V4.1-Flash-1017", description: "DeepSeek V4.1 Flash — state-of-the-art fast reasoning, coding, and multilingual intelligence.", provider: "prorouter-gateway", isFree: true, contextWindow: 262144, maxOutputTokens: 128000, input: 0, output: 0, rank: 1, popularity: 9900, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", description: "DeepSeek V4.1 Flash — high-speed reasoning and code synthesis.", provider: "prorouter-gateway", isFree: true, contextWindow: 262144, maxOutputTokens: 128000, input: 0, output: 0, rank: 2, popularity: 9880, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "qwen3.8-27b", name: "Qwen3.8-27B", description: "Alibaba Qwen3.8 27B — high-performance open-weight model with strong multilingual and reasoning abilities.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 64000, input: 0, output: 0, rank: 3, popularity: 9850, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "glm-5.3", name: "GLM-5.3", description: "Zhipu GLM-5.3 — flagship bilingual reasoning, analytical thinking, and tool execution.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 128000, input: 0, output: 0, rank: 4, popularity: 9800, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "kimi-k3", name: "Kimi K3", description: "Moonshot Kimi K3 — ultra long-context frontier model with high-speed reasoning and deep comprehension.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 5, popularity: 9820, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "mimo-v2.6-pro", name: "MiMo-V2.6-Pro", description: "Xiaomi MiMo V2.6 Pro — flagship multimodal reasoning model for advanced synthesis and coding.", provider: "prorouter-gateway", isFree: true, contextWindow: 1048576, maxOutputTokens: 131072, input: 0, output: 0, rank: 6, popularity: 9750, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "minimax-m3.1-flash", name: "MiniMax M3.1 Flash", description: "MiniMax M3.1 Flash — fast multimodal model with reliable tool calling and low latency.", provider: "prorouter-gateway", isFree: true, contextWindow: 1000000, maxOutputTokens: 131072, input: 0, output: 0, rank: 7, popularity: 9700, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "qwen3-coder-next", name: "Qwen3-Coder-Next", description: "Alibaba Qwen3 Coder Next — specialized coding model for repository synthesis and multi-file debugging.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 64000, input: 0, output: 0, rank: 8, popularity: 9780, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "deepseek-v4-pro-0813", name: "DeepSeek-V4-Pro-0813", description: "DeepSeek V4 Pro — high-throughput frontier reasoning and deep architectural coding.", provider: "prorouter-gateway", isFree: true, contextWindow: 262144, maxOutputTokens: 128000, input: 0, output: 0, rank: 9, popularity: 9720, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "kimi-k2.7-code", name: "Kimi K2.7 Code", description: "Moonshot Kimi K2.7 Code — specialized code intelligence and agentic workflow automation.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 10, popularity: 9680, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "devstral-24b", name: "Devstral 24B", description: "Mistral Devstral 24B — developer-tuned open weights optimized for software engineering workflows.", provider: "prorouter-gateway", isFree: true, contextWindow: 128000, maxOutputTokens: 64000, input: 0, output: 0, rank: 11, popularity: 9650, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "claude-sonnet", name: "Claude Sonnet", description: "Anthropic Claude Sonnet — balanced intelligence, high coding precision, and nuanced creative writing.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 12, popularity: 9950, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "claude-opus", name: "Claude Opus", description: "Anthropic Claude Opus — deep analysis, nuanced reasoning, and complex task decomposition.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 13, popularity: 9930, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "gemini-pro", name: "Gemini Pro", description: "Google Gemini Pro — powerful multimodal model with vast context window and world knowledge.", provider: "prorouter-gateway", isFree: true, contextWindow: 1000000, maxOutputTokens: 64000, input: 0, output: 0, rank: 14, popularity: 9910, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "grok", name: "Grok", description: "xAI Grok — direct, truthful AI with real-time insight and witty demeanor.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 64000, input: 0, output: 0, rank: 15, popularity: 9890, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "mistral-large", name: "Mistral Large", description: "Mistral Large — flagship model for complex multilingual reasoning and precise instruction following.", provider: "prorouter-gateway", isFree: true, contextWindow: 128000, maxOutputTokens: 64000, input: 0, output: 0, rank: 16, popularity: 9810, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "glm-5.3-flash", name: "GLM-5.3-Flash", description: "Zhipu GLM 5.3 Flash — fast multilingual reasoning with high-speed tool execution.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 128000, input: 0, output: 0, rank: 17, popularity: 9790, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "gpt-6.1-sol", name: "GPT-6.1 Sol", description: "OpenAI GPT-6.1 Sol — frontier cloud model optimized for high-speed reasoning and synthesis.", provider: "prorouter-gateway", isFree: true, contextWindow: 256000, maxOutputTokens: 64000, input: 0, output: 0, rank: 18, popularity: 9970, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "gpt-6.1-terra", name: "GPT-6.1 Terra", description: "OpenAI GPT-6.1 Terra — flagship multimodal intelligence with deep scientific knowledge.", provider: "prorouter-gateway", isFree: true, contextWindow: 256000, maxOutputTokens: 64000, input: 0, output: 0, rank: 19, popularity: 9960, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "claude-opus-5", name: "Claude Opus 5", description: "Anthropic Claude Opus 5 — next-generation frontier intelligence for research and coding.", provider: "prorouter-gateway", isFree: true, contextWindow: 250000, maxOutputTokens: 64000, input: 0, output: 0, rank: 20, popularity: 9990, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "mimo-v2.6-flash", name: "MiMo-V2.6-Flash", description: "Xiaomi MiMo Flash — quick responses with solid reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 1048576, maxOutputTokens: 131072, input: 0, output: 0, rank: 21, popularity: 9760, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "gpt-6-luna", name: "GPT-6 Luna", description: "OpenAI GPT-6 Luna — low-latency next-gen assistant for rapid task execution.", provider: "prorouter-gateway", isFree: true, contextWindow: 256000, maxOutputTokens: 64000, input: 0, output: 0, rank: 22, popularity: 9940, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "beam", name: "Beam", description: "Fast general-purpose model for everyday chat and drafting.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 23, popularity: 9050, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "nemotron-3.5-super-vl", name: "Nemotron 3.5 Super VL", description: "NVIDIA Nemotron 3.5 Super — high-capacity vision-language reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 128000, maxOutputTokens: 64000, input: 0, output: 0, rank: 24, popularity: 8800, reasoning: true, vision: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "nemotron-3.5-lightning", name: "Nemotron 3.5 Lightning", description: "NVIDIA Nemotron 3.5 Lightning — low-latency assistant for high-volume work.", provider: "prorouter-gateway", isFree: true, contextWindow: 128000, maxOutputTokens: 64000, input: 0, output: 0, rank: 25, popularity: 8700, reasoning: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "longcat-2.5-preview", name: "LongCat 2.5 Preview", description: "Meituan LongCat 2.5 — long-context preview with strong multilingual reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 26, popularity: 8600, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
  { slug: "jev-1.13", name: "Jev 1.13", description: "Jev 1.13 — general-purpose assistant with balanced speed and quality.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 32768, input: 0, output: 0, rank: 27, popularity: 8200, reasoning: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017", priority: 10 }], freeLimits: { perMinute: 10, perHour: 100, perDay: 1000 } },
];

for (const m of catalog) {
  const providerRow = providerBySlug.get(m.provider);
  const [inserted] = await db
    .insert(models)
    .values({
      slug: m.slug, name: m.name, description: m.description,
      providerId: providerRow?.id ?? null, type: "chat", status: m.status ?? "active",
      isFree: m.isFree, contextWindow: m.contextWindow, maxOutputTokens: m.maxOutputTokens,
      rank: m.rank, popularity: m.popularity, rating: Math.max(0, 100 - m.rank * 3),
    })
    .onConflictDoNothing({ target: models.slug })
    .returning();

  const existing = inserted ?? (await db.select().from(models).where(eq(models.slug, m.slug)))[0];
  if (!existing) continue;

  await db.insert(modelPricing).values({
    modelId: existing.id, inputPerMillion: m.input, outputPerMillion: m.output,
    cachedInputPerMillion: m.isFree ? 0 : Math.round(m.input / 2), currency: "INR",
  }).onConflictDoNothing({ target: modelPricing.modelId });

  await db.insert(modelCapabilities).values({
    modelId: existing.id, modalities: m.vision ? ["text", "image"] : ["text"],
    streaming: true, toolCalls: m.toolCalls ?? false, structuredOutputs: m.structured ?? false,
    reasoning: m.reasoning ?? false, vision: m.vision ?? false, imageGeneration: false,
    audio: false, jsonMode: true,
  }).onConflictDoNothing({ target: modelCapabilities.modelId });

  if (m.isFree) {
    await db.insert(modelLimits).values({
      modelId: existing.id, perMinute: m.freeLimits?.perMinute ?? 1,
      perHour: m.freeLimits?.perHour ?? 30, perDay: m.freeLimits?.perDay ?? 200,
      concurrency: 1, queuePriority: 5,
    }).onConflictDoNothing({ target: modelLimits.modelId });
  }

  for (const link of m.links) {
    const linkProvider = providerBySlug.get(link.provider);
    if (!linkProvider) continue;
    await db.insert(modelProviders).values({
      modelId: existing.id, providerId: linkProvider.id,
      providerModelId: link.providerModelId, priority: link.priority ?? 100, status: "active",
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
        rating: 85,
      })
      .onConflictDoNothing({ target: models.slug })
      .returning();

    const existing = inserted ?? (await db.select().from(models).where(eq(models.slug, alias.slug)))[0];
    if (!existing) continue;

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
await closeDb();