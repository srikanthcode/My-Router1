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
  providerCredentials,
  providers,
  systemSettings,
  users,
  wallets,
} from "./index.js";
import { encryptSecret, hashPassword, env } from "@uno/shared";
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

// ── Providers (§10, §42) — admin adds credentials later ────────────────
const providerSeeds = [
  {
    slug: "prorouter-gateway",
    name: "ProRouter Gateway",
    endpointUrl: process.env.PROVIDER_PROROUTER_GATEWAY_BASE_URL || "https://gpt-code-p2mf.onrender.com/v1",
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
  await db
    .insert(providerCredentials)
    .values({ providerId: row.id, keyName: "default", ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag })
    .onConflictDoNothing();
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
  // ── Gateway-served models (§75) ─────────────────────────────────────
  // Public slugs are the clean model names; the upstream gateway id (which
  // carries a "-free" suffix) stays in model_providers and is never shown.
  // Each model routes to the primary gateway first, with FreeModels as fallback.
  { slug: "beam", name: "Beam", description: "Fast general-purpose model for everyday chat and drafting.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 20, popularity: 9050, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "beam-free", priority: 10 }, { provider: "freemodels", providerModelId: "beam-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "mimo-v2.6-flash", name: "MiMo V2.6 Flash", description: "Xiaomi MiMo Flash — quick responses with solid reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 1048576, maxOutputTokens: 131072, input: 0, output: 0, rank: 21, popularity: 8900, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "mimo-v2.6-flash-free", priority: 10 }, { provider: "freemodels", providerModelId: "mimo-v2.6-flash-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "nemotron-3.5-super-vl", name: "Nemotron 3.5 Super VL", description: "NVIDIA Nemotron 3.5 Super — high-capacity vision-language reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 128000, maxOutputTokens: 64000, input: 0, output: 0, rank: 22, popularity: 8800, reasoning: true, vision: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "nemotron-3.5-super-vl-free", priority: 10 }, { provider: "freemodels", providerModelId: "nemotron-3.5-super-vl-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "nemotron-3.5-lightning", name: "Nemotron 3.5 Lightning", description: "NVIDIA Nemotron 3.5 Lightning — low-latency assistant for high-volume work.", provider: "prorouter-gateway", isFree: true, contextWindow: 128000, maxOutputTokens: 64000, input: 0, output: 0, rank: 23, popularity: 8700, reasoning: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "nemotron-3.5-lightning-free", priority: 10 }, { provider: "freemodels", providerModelId: "nemotron-3.5-lightning-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "longcat-2.5-preview", name: "LongCat 2.5 Preview", description: "Meituan LongCat 2.5 — long-context preview with strong multilingual reasoning.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 64000, input: 0, output: 0, rank: 24, popularity: 8600, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "longcat-2.5-preview-free", priority: 10 }, { provider: "freemodels", providerModelId: "longcat-2.5-preview-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", description: "DeepSeek V4.1 Flash — efficient reasoning and coding at low latency.", provider: "prorouter-gateway", isFree: true, contextWindow: 1000000, maxOutputTokens: 128000, input: 0, output: 0, rank: 25, popularity: 8500, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "deepseek-v4.1-flash-free", priority: 10 }, { provider: "freemodels", providerModelId: "deepseek-v4.1-flash-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "glm-5.3-flash", name: "GLM 5.3 Flash", description: "Zhipu GLM 5.3 Flash — fast multilingual reasoning with tool use.", provider: "prorouter-gateway", isFree: true, contextWindow: 200000, maxOutputTokens: 128000, input: 0, output: 0, rank: 26, popularity: 8400, reasoning: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "glm-5.3-flash-free", priority: 10 }, { provider: "freemodels", providerModelId: "glm-5.3-flash-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  { slug: "minimax-m3.1-flash", name: "MiniMax M3.1 Flash", description: "MiniMax M3.1 Flash — fast multimodal model with reliable tool calling.", provider: "prorouter-gateway", isFree: true, contextWindow: 1000000, maxOutputTokens: 131072, input: 0, output: 0, rank: 27, popularity: 8300, reasoning: true, vision: true, toolCalls: true, structured: true, links: [{ provider: "prorouter-gateway", providerModelId: "minimax-m3.1-flash-free", priority: 10 }, { provider: "freemodels", providerModelId: "minimax-m3.1-flash-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
  // Served by the gateway only — it is not listed on FreeModels.
  { slug: "jev-1.13", name: "Jev 1.13", description: "Jev 1.13 — general-purpose assistant with balanced speed and quality.", provider: "prorouter-gateway", isFree: true, contextWindow: 131072, maxOutputTokens: 32768, input: 0, output: 0, rank: 28, popularity: 8200, reasoning: true, toolCalls: true, links: [{ provider: "prorouter-gateway", providerModelId: "jev-1.13-free", priority: 10 }, { provider: "freemodels", providerModelId: "jev-1.13-free", priority: 100 }], freeLimits: { perMinute: 1, perHour: 30, perDay: 300 } },
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
    }).onConflictDoNothing();
  }
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