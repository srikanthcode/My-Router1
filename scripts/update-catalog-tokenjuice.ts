import { eq } from "drizzle-orm";
import {
  getDb,
  closeDb,
  models,
  providers,
  providerCredentials,
  modelProviders,
  modelPricing,
  modelCapabilities,
  modelLimits,
  type Database,
} from "@pro/database";
import { encryptSecret } from "@pro/shared";

const TOKENJUICE_BASE_URL = "https://api.tokenjuice.ai/v1";
const TOKENJUICE_API_KEY = "tj_m0sow5S81J10HmZLkIC-lPXWmIl8ojnREQ9Mo_Xd3ts";
const UPSTREAM_MODEL_ID = "deepseek-ai/DeepSeek-V4.1-Flash-1017";

console.log("[update-catalog] Connecting to DB...");
const db = (await getDb()) as Database;

// 1. Update or ensure prorouter-gateway provider
const provRows = await db.select().from(providers).where(eq(providers.slug, "prorouter-gateway"));
let gatewayId = provRows[0]?.id;

if (!gatewayId) {
  const [created] = await db.insert(providers).values({
    slug: "prorouter-gateway",
    name: "ProRouter Gateway",
    endpointUrl: TOKENJUICE_BASE_URL,
    adapterType: "openai",
    priority: 5,
    status: "active",
    region: "global",
    capabilities: ["chat", "tool_calls", "vision", "reasoning"],
    description: "Primary model gateway.",
  }).returning();
  gatewayId = created!.id;
  console.log("[update-catalog] Created prorouter-gateway provider:", gatewayId);
} else {
  await db.update(providers).set({
    endpointUrl: TOKENJUICE_BASE_URL,
    status: "active",
  }).where(eq(providers.id, gatewayId));
  console.log("[update-catalog] Updated prorouter-gateway provider URL:", TOKENJUICE_BASE_URL);
}

// 2. Encrypt and store API key
const enc = encryptSecret(TOKENJUICE_API_KEY);
await db.insert(providerCredentials).values({
  providerId: gatewayId,
  keyName: "default",
  ciphertext: enc.ciphertext,
  iv: enc.iv,
  authTag: enc.authTag,
  active: true,
}).onConflictDoUpdate({
  target: [providerCredentials.providerId, providerCredentials.keyName],
  set: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true },
});
console.log("[update-catalog] Stored encrypted API key for prorouter-gateway");

// 3. Define the full set of models requested by the user
const modelsToSeed = [
  {
    slug: "deepseek-v4.1-flash-1017",
    name: "DeepSeek-V4.1-Flash-1017",
    description: "DeepSeek V4.1 Flash — state-of-the-art fast reasoning, coding, and multilingual intelligence.",
    isFree: true,
    contextWindow: 262144,
    maxOutputTokens: 128000,
    rank: 1,
    popularity: 9900,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    description: "DeepSeek V4.1 Flash — high-speed reasoning and code synthesis.",
    isFree: true,
    contextWindow: 262144,
    maxOutputTokens: 128000,
    rank: 2,
    popularity: 9880,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "qwen3.8-27b",
    name: "Qwen3.8-27B",
    description: "Alibaba Qwen3.8 27B — high-performance open-weight model with strong multilingual and reasoning abilities.",
    isFree: true,
    contextWindow: 131072,
    maxOutputTokens: 64000,
    rank: 3,
    popularity: 9850,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "glm-5.3",
    name: "GLM-5.3",
    description: "Zhipu GLM-5.3 — flagship bilingual reasoning, analytical thinking, and tool execution.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 128000,
    rank: 4,
    popularity: 9800,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "kimi-k3",
    name: "Kimi K3",
    description: "Moonshot Kimi K3 — ultra long-context frontier model with high-speed reasoning and deep comprehension.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    rank: 5,
    popularity: 9820,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "mimo-v2.6-pro",
    name: "MiMo-V2.6-Pro",
    description: "Xiaomi MiMo V2.6 Pro — flagship multimodal reasoning model for advanced synthesis and coding.",
    isFree: true,
    contextWindow: 1048576,
    maxOutputTokens: 131072,
    rank: 6,
    popularity: 9750,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "minimax-m3.1-flash",
    name: "MiniMax M3.1 Flash",
    description: "MiniMax M3.1 Flash — fast multimodal model with reliable tool calling and low latency.",
    isFree: true,
    contextWindow: 1000000,
    maxOutputTokens: 131072,
    rank: 7,
    popularity: 9700,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "qwen3-coder-next",
    name: "Qwen3-Coder-Next",
    description: "Alibaba Qwen3 Coder Next — specialized coding model for repository synthesis and multi-file debugging.",
    isFree: true,
    contextWindow: 131072,
    maxOutputTokens: 64000,
    rank: 8,
    popularity: 9780,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "deepseek-v4-pro-0813",
    name: "DeepSeek-V4-Pro-0813",
    description: "DeepSeek V4 Pro — high-throughput frontier reasoning and deep architectural coding.",
    isFree: true,
    contextWindow: 262144,
    maxOutputTokens: 128000,
    rank: 9,
    popularity: 9720,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    description: "Moonshot Kimi K2.7 Code — specialized code intelligence and agentic workflow automation.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    rank: 10,
    popularity: 9680,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "devstral-24b",
    name: "Devstral 24B",
    description: "Mistral Devstral 24B — developer-tuned open weights optimized for software engineering workflows.",
    isFree: true,
    contextWindow: 128000,
    maxOutputTokens: 64000,
    rank: 11,
    popularity: 9650,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "claude-sonnet",
    name: "Claude Sonnet",
    description: "Anthropic Claude Sonnet — balanced intelligence, high coding precision, and nuanced creative writing.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    rank: 12,
    popularity: 9950,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "claude-opus",
    name: "Claude Opus",
    description: "Anthropic Claude Opus — deep analysis, nuanced reasoning, and complex task decomposition.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    rank: 13,
    popularity: 9930,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "gemini-pro",
    name: "Gemini Pro",
    description: "Google Gemini Pro — powerful multimodal model with vast context window and world knowledge.",
    isFree: true,
    contextWindow: 1000000,
    maxOutputTokens: 64000,
    rank: 14,
    popularity: 9910,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "grok",
    name: "Grok",
    description: "xAI Grok — direct, truthful AI with real-time insight and witty demeanor.",
    isFree: true,
    contextWindow: 131072,
    maxOutputTokens: 64000,
    rank: 15,
    popularity: 9890,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "mistral-large",
    name: "Mistral Large",
    description: "Mistral Large — flagship model for complex multilingual reasoning and precise instruction following.",
    isFree: true,
    contextWindow: 128000,
    maxOutputTokens: 64000,
    rank: 16,
    popularity: 9810,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "glm-5.3-flash",
    name: "GLM-5.3-Flash",
    description: "Zhipu GLM 5.3 Flash — fast multilingual reasoning with high-speed tool execution.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 128000,
    rank: 17,
    popularity: 9790,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "gpt-6.1-sol",
    name: "GPT-6.1 Sol",
    description: "OpenAI GPT-6.1 Sol — frontier cloud model optimized for high-speed reasoning and synthesis.",
    isFree: true,
    contextWindow: 256000,
    maxOutputTokens: 64000,
    rank: 18,
    popularity: 9970,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "gpt-6.1-terra",
    name: "GPT-6.1 Terra",
    description: "OpenAI GPT-6.1 Terra — flagship multimodal intelligence with deep scientific knowledge.",
    isFree: true,
    contextWindow: 256000,
    maxOutputTokens: 64000,
    rank: 19,
    popularity: 9960,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "claude-opus-5",
    name: "Claude Opus 5",
    description: "Anthropic Claude Opus 5 — next-generation frontier intelligence for research and coding.",
    isFree: true,
    contextWindow: 250000,
    maxOutputTokens: 64000,
    rank: 20,
    popularity: 9990,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "mimo-v2.6-flash",
    name: "MiMo-V2.6-Flash",
    description: "Xiaomi MiMo Flash — quick responses with solid reasoning.",
    isFree: true,
    contextWindow: 1048576,
    maxOutputTokens: 131072,
    rank: 21,
    popularity: 9760,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "gpt-6-luna",
    name: "GPT-6 Luna",
    description: "OpenAI GPT-6 Luna — low-latency next-gen assistant for rapid task execution.",
    isFree: true,
    contextWindow: 256000,
    maxOutputTokens: 64000,
    rank: 22,
    popularity: 9940,
    reasoning: true,
    vision: true,
    toolCalls: true,
  },
  {
    slug: "beam",
    name: "Beam",
    description: "Fast general-purpose model for everyday chat and drafting.",
    isFree: true,
    contextWindow: 200000,
    maxOutputTokens: 64000,
    rank: 23,
    popularity: 9050,
    reasoning: false,
    vision: false,
    toolCalls: true,
  },
];

console.log("[update-catalog] Seeding/updating models...");
for (const m of modelsToSeed) {
  const [upserted] = await db
    .insert(models)
    .values({
      slug: m.slug,
      name: m.name,
      description: m.description,
      providerId: gatewayId,
      type: "chat",
      status: "active",
      isFree: m.isFree,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      rank: m.rank,
      popularity: m.popularity,
      rating: Math.max(0, 100 - m.rank * 2),
    })
    .onConflictDoUpdate({
      target: models.slug,
      set: {
        name: m.name,
        description: m.description,
        providerId: gatewayId,
        status: "active",
        isFree: m.isFree,
        contextWindow: m.contextWindow,
        maxOutputTokens: m.maxOutputTokens,
        rank: m.rank,
        popularity: m.popularity,
      },
    })
    .returning();

  const modelRow = upserted ?? (await db.select().from(models).where(eq(models.slug, m.slug)))[0]!;

  // Pricing
  await db.insert(modelPricing).values({
    modelId: modelRow.id,
    inputPerMillion: 0,
    outputPerMillion: 0,
    cachedInputPerMillion: 0,
    currency: "INR",
  }).onConflictDoUpdate({
    target: modelPricing.modelId,
    set: { inputPerMillion: 0, outputPerMillion: 0, cachedInputPerMillion: 0 },
  });

  // Capabilities
  await db.insert(modelCapabilities).values({
    modelId: modelRow.id,
    modalities: m.vision ? ["text", "image"] : ["text"],
    streaming: true,
    toolCalls: m.toolCalls,
    structuredOutputs: true,
    reasoning: m.reasoning,
    vision: m.vision,
    imageGeneration: false,
    audio: false,
    jsonMode: true,
  }).onConflictDoUpdate({
    target: modelCapabilities.modelId,
    set: {
      modalities: m.vision ? ["text", "image"] : ["text"],
      streaming: true,
      toolCalls: m.toolCalls,
      structuredOutputs: true,
      reasoning: m.reasoning,
      vision: m.vision,
      jsonMode: true,
    },
  });

  // Free limits: generous for new users
  await db.insert(modelLimits).values({
    modelId: modelRow.id,
    perMinute: 20,
    perHour: 300,
    perDay: 3000,
    concurrency: 5,
    queuePriority: 1,
  }).onConflictDoUpdate({
    target: modelLimits.modelId,
    set: {
      perMinute: 20,
      perHour: 300,
      perDay: 3000,
      concurrency: 5,
      queuePriority: 1,
    },
  });

  // Link to prorouter-gateway with upstream model deepseek-ai/DeepSeek-V4.1-Flash-1017
  await db.insert(modelProviders).values({
    modelId: modelRow.id,
    providerId: gatewayId,
    providerModelId: UPSTREAM_MODEL_ID,
    priority: 5,
    status: "active",
  }).onConflictDoUpdate({
    target: [modelProviders.modelId, modelProviders.providerId],
    set: {
      providerModelId: UPSTREAM_MODEL_ID,
      priority: 5,
      status: "active",
    },
  });
}

// 4. Update ALL other model-provider links pointing to prorouter-gateway
const updatedLinks = await db.update(modelProviders).set({
  providerModelId: UPSTREAM_MODEL_ID,
  status: "active",
}).where(eq(modelProviders.providerId, gatewayId)).returning();
console.log(`[update-catalog] Set ${updatedLinks.length} modelProvider links to ${UPSTREAM_MODEL_ID}`);

console.log("[update-catalog] Done! All models successfully seeded and linked to TokenJuice backend.");
await closeDb();

