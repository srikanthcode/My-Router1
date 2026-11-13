import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { decryptSecret, env, ApiError, type ChatMessage, type Usage, type UsageSource } from "@pro/shared";
import { createAdapter, ProviderError, type AdapterChatParams, type ProviderAdapter, type StreamEvent } from "@pro/providers";
import { routeRequest, selectAutoModel, type RouteCandidate, type RouteDecision, ModelProfileRegistry, IntelligentModelRouter, ProviderHealthMonitor, ModelBehaviorEngine } from "@pro/routing";
import { getDb, modelProviders, models, providerCredentials, providers, providerHealth, modelPricing, modelCapabilities, modelLimits, pricingTiers } from "@pro/database";
import { getUsdToInrRate, resolveEffectivePricing, type PricingTierRow } from "./pricing.js";

export const MODEL_ALIASES: Record<string, string> = {
  // Pro Router Official Tiered Models
  "pr-zenith": "claude-opus-5",
  "zenith": "claude-opus-5",
  "pr-aura": "deepseek-v4.1-flash-1017",
  "aura": "deepseek-v4.1-flash-1017",
  "pr-nova": "deepseek-v4.1-flash",
  "nova": "deepseek-v4.1-flash",
  "pr-swift": "deepseek-v4.1-flash",
  "swift": "deepseek-v4.1-flash",
  "pr-echo": "deepseek-v4.1-flash",
  "echo": "deepseek-v4.1-flash",

  // DeepSeek
  "deepseek-v4.1-flash-1017": "deepseek-v4.1-flash-1017",
  "deepseek-ai/deepseek-v4.1-flash-1017": "deepseek-v4.1-flash-1017",
  "deepseek-ai/deepseek-v4.1-flash": "deepseek-v4.1-flash-1017",
  "deepseek-v4.1-flash": "deepseek-v4.1-flash",
  "deepseek-v4-pro-0813": "deepseek-v4-pro-0813",
  "deepseek-v4-pro": "deepseek-v4-pro-0813",
  "deepseek-v4": "deepseek-v4.1-flash-1017",
  "deepseek": "deepseek-v4.1-flash-1017",

  // Qwen
  "qwen3.8-27b": "qwen3.8-27b",
  "qwen-3.8-27b": "qwen3.8-27b",
  "qwen3.8": "qwen3.8-27b",
  "qwen3-coder-next": "qwen3-coder-next",
  "qwen-coder": "qwen3-coder-next",
  "qwen": "qwen3.8-27b",

  // GLM
  "glm-5.3": "glm-5.3",
  "glm5.3": "glm-5.3",
  "glm-5.3-flash": "glm-5.3-flash",
  "glm5.3-flash": "glm-5.3-flash",
  "glm": "glm-5.3",

  // Kimi
  "kimi-k3": "kimi-k3",
  "kimi-3": "kimi-k3",
  "kimi3": "kimi-k3",
  "kimik3": "kimi-k3",
  "kimi-k2.7-code": "kimi-k2.7-code",
  "kimi-code": "kimi-k2.7-code",
  "kimi": "kimi-k3",

  // MiMo
  "mimo-v2.6-pro": "mimo-v2.6-pro",
  "mimo-v2.6-flash": "mimo-v2.6-flash",
  "mimo-pro": "mimo-v2.6-pro",
  "mimo-flash": "mimo-v2.6-flash",
  "mimo": "mimo-v2.6-pro",

  // MiniMax
  "minimax-m3.1-flash": "minimax-m3.1-flash",
  "minimax-flash": "minimax-m3.1-flash",
  "minimax": "minimax-m3.1-flash",

  // Devstral
  "devstral-24b": "devstral-24b",
  "devstral": "devstral-24b",

  // Claude
  "claude-sonnet": "claude-sonnet",
  "claude-3-7-sonnet": "claude-sonnet",
  "claude-3-5-sonnet": "claude-sonnet",
  "claude-opus": "claude-opus",
  "claude-3-opus": "claude-opus",
  "claude-opus-5": "claude-opus-5",
  "claude": "claude-sonnet",

  // Gemini
  "gemini-pro": "gemini-pro",
  "gemini-1.5-pro": "gemini-pro",
  "gemini-2.0-flash": "gemini-pro",
  "gemini-2.0-pro": "gemini-pro",
  "gemini": "gemini-pro",

  // Grok
  "grok": "grok",
  "grok-2": "grok",
  "grok-3": "grok",

  // Mistral
  "mistral-large": "mistral-large",
  "mistral": "mistral-large",

  // GPT
  "gpt-6.1-sol": "gpt-6.1-sol",
  "gpt-6.1-terra": "gpt-6.1-terra",
  "gpt-6-luna": "gpt-6-luna",
  "gpt-4o": "gpt-6.1-sol",
  "gpt-4": "gpt-6.1-sol",
  // Requesty 6 models aliases
  "mistral/leanstral-1-5": "leanstral-1-5",
  "leanstral-1-5": "leanstral-1-5",
  "novita/ling-3.1-flash": "ling-3.1-flash",
  "ling-3.1-flash": "ling-3.1-flash",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": "nemotron-3-nano-omni-30b-a3b-reasoning",
  "nemotron-3-nano-omni-30b-a3b-reasoning": "nemotron-3-nano-omni-30b-a3b-reasoning",
  "nvidia/nemotron-3.5-lightning-30b-a3b": "nemotron-3.5-lightning-30b-a3b",
  "nemotron-3.5-lightning-30b-a3b": "nemotron-3.5-lightning-30b-a3b",
  "nvidia/nemotron-3-ultra-550b-a55b": "nemotron-3-ultra-550b-a55b",
  "nemotron-3-ultra-550b-a55b": "nemotron-3-ultra-550b-a55b",
  "google/gemma-4-31b-it": "gemma-4-31b-it",
  "gemma-4-31b-it": "gemma-4-31b-it",
  "qwen/qwen3.8-27b": "qwen3.8-27b",
  "openai/gpt-oss-20b": "gpt-oss-20b",
  "openai/gpt-oss-120b": "gpt-oss-120b",
};

/** Resolve user-supplied model id: "slug", "prorouter/slug", "provider/slug" or "prorouter/auto". */
export async function resolveModelInput(input: string): Promise<{ auto: boolean; slug: string; forcedProvider?: string }> {
  let raw = input.trim();
  if (raw === "prorouter/auto" || raw === "auto") return { auto: true, slug: "auto" };
  if (raw.startsWith("prorouter/")) raw = raw.slice(10);
  if (raw.startsWith("uno/")) raw = raw.slice(4); // legacy alias still accepted

  const lower = raw.toLowerCase();
  if (ModelProfileRegistry.has(lower)) return { auto: false, slug: lower };
  if (ModelProfileRegistry.has(raw)) return { auto: false, slug: raw };
  if (MODEL_ALIASES[lower]) {
    return { auto: false, slug: MODEL_ALIASES[lower] };
  }

  if (raw.includes("/")) {
    const idx = raw.indexOf("/");
    const maybeProvider = raw.slice(0, idx);
    const slug = raw.slice(idx + 1);
    if (maybeProvider !== "uno" && maybeProvider !== "prorouter" && maybeProvider !== "deepseek-ai") {
      return { auto: false, slug, forcedProvider: maybeProvider };
    }
    raw = slug;
  }

  const normalized = raw.toLowerCase().replace(/\s+/g, "-");
  if (MODEL_ALIASES[normalized]) {
    return { auto: false, slug: MODEL_ALIASES[normalized] };
  }

  return { auto: false, slug: raw };
}

export interface ModelContext {
  model: typeof models.$inferSelect;
  pricing: typeof modelPricing.$inferSelect | null;
  tier: PricingTierRow | null;
  caps: typeof modelCapabilities.$inferSelect | null;
  limits: typeof modelLimits.$inferSelect | null;
  pricingStatus?: string;
  canonicalModelId?: string | null;
}

export async function loadModelContext(slug: string): Promise<ModelContext | null> {
  const db = await getDb();
  const lowerSlug = slug.toLowerCase();
  const rows = await db.select({ model: models, pricing: modelPricing, tier: pricingTiers, caps: modelCapabilities, limits: modelLimits }).from(models)
    .leftJoin(modelPricing, eq(modelPricing.modelId, models.id))
    .leftJoin(pricingTiers, eq(pricingTiers.slug, models.pricingTier))
    .leftJoin(modelCapabilities, eq(modelCapabilities.modelId, models.id))
    .leftJoin(modelLimits, eq(modelLimits.modelId, models.id))
    .where(or(
      eq(models.slug, slug),
      sql`lower(${models.slug}) = ${lowerSlug}`,
      sql`lower(${models.name}) = ${lowerSlug}`
    ));
  let r = rows[0];
  if (!r) {
    const profile = ModelProfileRegistry.get(slug) || ModelProfileRegistry.get(lowerSlug);
    if (profile) {
      const fallbackRows = await db.select({ model: models, pricing: modelPricing, tier: pricingTiers, caps: modelCapabilities, limits: modelLimits }).from(models)
        .leftJoin(modelPricing, eq(modelPricing.modelId, models.id))
        .leftJoin(pricingTiers, eq(pricingTiers.slug, models.pricingTier))
        .leftJoin(modelCapabilities, eq(modelCapabilities.modelId, models.id))
        .leftJoin(modelLimits, eq(modelLimits.modelId, models.id))
        .where(eq(models.slug, "deepseek-v4.1-flash-1017"));
      const baseRow = fallbackRows[0];

      const inPriceUsd = profile.customerPricingUsd?.inputPerMillion ?? 0.20;
      const outPriceUsd = profile.customerPricingUsd?.outputPerMillion ?? 0.80;
      const cachedPriceUsd = profile.customerPricingUsd?.cachedInputPerMillion;
      const inputPaise = Math.ceil(inPriceUsd * 80 * 100);
      const outputPaise = Math.ceil(outPriceUsd * 80 * 100);
      const cachedPaise = cachedPriceUsd !== undefined ? Math.ceil(cachedPriceUsd * 80 * 100) : 0;

      return {
        model: {
          id: `profile-${profile.id}`,
          slug: profile.id,
          name: profile.name,
          description: profile.description,
          providerId: baseRow?.model.providerId ?? null,
          type: "chat",
          status: "active" as const,
          pricingStatus: profile.pricingStatus ?? "approved",
          canonicalModelId: profile.canonicalModelId ?? profile.id,
          isFree: profile.isFree,
          contextWindow: profile.contextWindow,
          maxOutputTokens: profile.maxOutputTokens,
          rank: profile.rank,
          popularity: profile.popularity,
          rating: 98,
          pricingTier: null,
          metadata: { category: profile.category },
          benchmarks: (profile.benchmarks ?? {}) as unknown as Record<string, unknown>,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        pricing: {
          id: `pricing-${profile.id}`,
          modelId: `profile-${profile.id}`,
          inputPerMillion: inputPaise,
          outputPerMillion: outputPaise,
          cachedInputPerMillion: cachedPaise,
          currency: "INR",
        },
        tier: null,
        caps: {
          modelId: `profile-${profile.id}`,
          modalities: profile.capabilities.vision === "supported" ? ["text", "image"] : ["text"],
          streaming: profile.capabilities.streaming === "supported",
          toolCalls: profile.capabilities.tool_calling === "supported",
          structuredOutputs: profile.capabilities.json_structured === "supported",
          reasoning: profile.capabilities.reasoning === "supported",
          vision: profile.capabilities.vision === "supported",
          imageGeneration: false,
          audio: false,
          jsonMode: true,
        },
        limits: {
          modelId: `profile-${profile.id}`,
          perMinute: 30,
          perHour: 300,
          perDay: 3000,
          concurrency: 5,
          queuePriority: 1,
        },
        pricingStatus: profile.pricingStatus ?? "approved",
        canonicalModelId: profile.canonicalModelId ?? profile.id,
      };
    }
    // Unknown models are rejected rather than silently routed to another model.
    return null;
  }
  return {
    model: r.model,
    pricing: r.pricing,
    tier: r.tier,
    caps: r.caps,
    limits: r.limits,
    pricingStatus: (r.model as any).pricingStatus ?? "approved",
    canonicalModelId: (r.model as any).canonicalModelId ?? r.model.slug,
  };
}

/** Hydrate routing candidates for a model from DB + latest health. */
export async function hydrateCandidates(
  modelId: string,
  forcedProvider?: string,
  requirements?: { tools?: boolean; reasoning?: boolean }
): Promise<RouteCandidate[]> {
  const db = await getDb();
  const linkRows = await db.select({ link: modelProviders, provider: providers }).from(modelProviders)
    .innerJoin(providers, eq(providers.id, modelProviders.providerId))
    .where(eq(modelProviders.modelId, modelId));
  const modelRows = await db.select().from(models).where(eq(models.id, modelId));
  const model = modelRows[0];
  const pricingRows = await db.select().from(modelPricing).where(eq(modelPricing.modelId, modelId));
  const pricing = pricingRows[0];
  const tier = model?.pricingTier
    ? (await db.select().from(pricingTiers).where(eq(pricingTiers.slug, model.pricingTier)))[0] ?? null
    : null;
  const effective = model ? resolveEffectivePricing(model, pricing ?? null, tier, await getUsdToInrRate()) : null;
  const providerIds = linkRows.map((l) => l.provider.id);
  const healthRows = providerIds.length ? await db.select().from(providerHealth).where(inArray(providerHealth.providerId, providerIds)).orderBy(desc(providerHealth.checkedAt)) : [];
  const latestHealth = new Map<string, typeof providerHealth.$inferSelect>();
  for (const h of healthRows) if (!latestHealth.has(h.providerId)) latestHealth.set(h.providerId, h);

  if (linkRows.length === 0) {
    const cleanId = modelId.startsWith("profile-") ? modelId.slice(8) : modelId;
    const profile = ModelProfileRegistry.get(cleanId);
    if (profile) {
      const decision = IntelligentModelRouter.route(cleanId, {
        requiresTools: requirements?.tools,
        requiresReasoning: requirements?.reasoning,
      });
      const chain = [decision.primary, ...decision.fallbackChain];
      const allProviders = await db.select().from(providers);
      const providerBySlug = new Map(allProviders.map((p) => [p.slug, p]));
      const dynamicCandidates: RouteCandidate[] = [];

      for (let i = 0; i < chain.length; i++) {
        const backend = chain[i];
        if (forcedProvider && backend.provider !== forcedProvider) continue;
        const dbProvider = providerBySlug.get(backend.provider);
        if (!dbProvider) continue;
        const isHealthy = ProviderHealthMonitor.isAvailable(backend.provider);
        dynamicCandidates.push({
          linkId: `dyn-${backend.id}-${i}`,
          providerId: dbProvider.id,
          providerSlug: dbProvider.slug,
          providerName: dbProvider.name,
          upstreamModelId: backend.upstreamModelId,
          linkPriority: (i + 1) * 10,
          providerPriority: dbProvider.priority,
          providerStatus: isHealthy ? "active" : "degraded",
          linkStatus: "active",
          timeoutMs: dbProvider.timeoutMs,
          retryCount: dbProvider.retryCount,
          health: {
            available: isHealthy,
            latencyMs: 180 + i * 50,
            successRateBp: isHealthy ? 10000 : 5000,
            checkedAt: new Date(),
          },
          inputPerMillion: 0,
          outputPerMillion: 0,
          isFree: true,
        });
      }
      if (dynamicCandidates.length > 0) return dynamicCandidates;
    }
  }

  return linkRows
    .filter((l) => !forcedProvider || l.provider.slug === forcedProvider)
    .map((l) => {
      const h = latestHealth.get(l.provider.id);
      return {
        linkId: l.link.id,
        providerId: l.provider.id,
        providerSlug: l.provider.slug,
        providerName: l.provider.name,
        upstreamModelId: l.link.providerModelId,
        linkPriority: l.link.priority,
        providerPriority: l.provider.priority,
        providerStatus: l.provider.status,
        linkStatus: l.link.status,
        timeoutMs: l.provider.timeoutMs,
        retryCount: l.provider.retryCount,
        health: h ? { available: h.available, latencyMs: h.latencyMs, successRateBp: h.successRateBp, checkedAt: h.checkedAt } : null,
        inputPerMillion: effective?.pricing.inputPerMillion ?? 0,
        outputPerMillion: effective?.pricing.outputPerMillion ?? 0,
        isFree: model?.isFree ?? false,
      } satisfies RouteCandidate;
    });
}

// ── ProRouter Gateway Key Pool (Loaded securely from process.env) ──
function getBackendGatewayPool(): string[] {
  const envVal = process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY || process.env.PROROUTER_GATEWAY_KEYS || "";
  if (!envVal.trim()) return [];
  return envVal
    .split(/[\s,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

let backendPoolIndex = 0;
export function getBackendGatewayKey(): string | undefined {
  const pool = getBackendGatewayPool();
  if (pool.length === 0) return process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
  const key = pool[backendPoolIndex % pool.length];
  backendPoolIndex = (backendPoolIndex + 1) % pool.length;
  return key;
}

function getBackendRequestyPool(): string[] {
  const envVal = process.env.PROVIDER_REQUESTY_API_KEY || "";
  if (!envVal.trim()) return [];
  return envVal
    .split(/[\s,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

let backendRequestyPoolIndex = 0;
export function getBackendRequestyKey(): string | undefined {
  const pool = getBackendRequestyPool();
  if (pool.length === 0) return undefined;
  const key = pool[backendRequestyPoolIndex % pool.length];
  backendRequestyPoolIndex = (backendRequestyPoolIndex + 1) % pool.length;
  return key;
}

function getBackendGroqPool(): string[] {
  const envVal = process.env.GROQ_API_KEY || "";
  if (!envVal.trim()) return [];
  return envVal
    .split(/[\s,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

let backendGroqPoolIndex = 0;
export function getBackendGroqKey(): string | undefined {
  const pool = getBackendGroqPool();
  if (pool.length === 0) return process.env.GROQ_API_KEY;
  const key = pool[backendGroqPoolIndex % pool.length];
  backendGroqPoolIndex = (backendGroqPoolIndex + 1) % pool.length;
  return key;
}

function getBackendOpenRouterPool(): string[] {
  const envVal = process.env.PROVIDER_OPENROUTER_API_KEY || "";
  if (!envVal.trim()) return [];
  return envVal
    .split(/[\s,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function getBackendNabhPool(): string[] {
  const envVal = process.env.PROVIDER_NABH_API_KEY || "";
  if (!envVal.trim()) return [];
  return envVal
    .split(/[\s,;\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

let backendNabhPoolIndex = 0;
export function getBackendNabhKey(): string | undefined {
  const pool = getBackendNabhPool();
  if (pool.length === 0) return process.env.PROVIDER_NABH_API_KEY;
  const key = pool[backendNabhPoolIndex % pool.length];
  backendNabhPoolIndex = (backendNabhPoolIndex + 1) % pool.length;
  return key;
}

let backendOpenRouterPoolIndex = 0;
export function getBackendOpenRouterKey(): string | undefined {
  const pool = getBackendOpenRouterPool();
  if (pool.length === 0) return process.env.PROVIDER_OPENROUTER_API_KEY;
  const key = pool[backendOpenRouterPoolIndex % pool.length];
  backendOpenRouterPoolIndex = (backendOpenRouterPoolIndex + 1) % pool.length;
  return key;
}

const ENV_KEY_MAP: Record<string, string | undefined> = {
  "prorouter-gateway": process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY,
  openai: env.openaiApiKey,
  groq: env.groqApiKey,
  mistral: env.mistralApiKey,
  anthropic: env.anthropicApiKey,
  openrouter: process.env.PROVIDER_OPENROUTER_API_KEY,
  requesty: process.env.PROVIDER_REQUESTY_API_KEY,
  nabh: process.env.PROVIDER_NABH_API_KEY,
};

/** Slugs that always require a server-side credential. */
const REQUIRES_API_KEY = new Set([
  "prorouter-gateway",
  "requesty",
  "groq",
  "openrouter",
  "nabh",
  "openai",
  "anthropic",
  "mistral",
]);

const credentialCursor = new Map<string, number>();

/** Build an adapter with decrypted credentials (secrets never leave the server). */
export async function getAdapter(candidate: RouteCandidate): Promise<ProviderAdapter> {
  const db = await getDb();
  const creds = await db.select().from(providerCredentials).where(and(eq(providerCredentials.providerId, candidate.providerId), eq(providerCredentials.active, true)));
  const providerRows = await db.select().from(providers).where(eq(providers.id, candidate.providerId));
  const provider = providerRows[0];
  if (!provider) throw new ApiError("provider_unavailable", "Provider configuration missing.");

  let apiKey: string | undefined;
  if (creds.length > 0) {
    const start = (credentialCursor.get(candidate.providerId) ?? 0) % creds.length;
    credentialCursor.set(candidate.providerId, start + 1);
    for (let offset = 0; offset < creds.length; offset++) {
      const cred = creds[(start + offset) % creds.length];
      try {
        apiKey = decryptSecret(cred.ciphertext, cred.iv, cred.authTag ?? "");
        if (apiKey) break;
      } catch {
        apiKey = undefined;
      }
    }
  }

  if (candidate.providerSlug === "prorouter-gateway") {
    apiKey = getBackendGatewayKey() || apiKey;
  } else if (candidate.providerSlug === "requesty") {
    apiKey = getBackendRequestyKey() || apiKey;
  } else if (candidate.providerSlug === "groq") {
    apiKey = getBackendGroqKey() || apiKey;
  } else if (candidate.providerSlug === "openrouter") {
    apiKey = getBackendOpenRouterKey() || apiKey;
  } else if (candidate.providerSlug === "nabh") {
    apiKey = getBackendNabhKey() || apiKey;
  } else if (!apiKey) {
    apiKey = ENV_KEY_MAP[candidate.providerSlug];
  }

  if (!apiKey && REQUIRES_API_KEY.has(candidate.providerSlug)) {
    throw new ProviderError(candidate.providerSlug, "no_credential", "No API key configured for this provider.", 503);
  }

  return createAdapter(provider.adapterType, {
    providerSlug: candidate.providerSlug,
    endpointUrl: provider.endpointUrl,
    apiKey,
    timeoutMs: candidate.timeoutMs,
  });
}

export interface ExecutionResult {
  content: string;
  toolCalls: unknown[];
  finishReason: string;
  usage: Usage;
  usageSource: UsageSource;
  providerSlug: string;
  providerId: string;
  providerModelId: string;
  attempts: Array<{ providerId: string; providerSlug: string; status: string; httpStatus: number | null; latencyMs: number; error: string | null }>;
}

/** Non-streaming execution with provider fallback (§54). */
export async function executeChat(decision: RouteDecision, params: AdapterChatParams, signal?: AbortSignal): Promise<ExecutionResult> {
  const chain = [decision.primary, ...decision.fallbackChain];
  const attempts: ExecutionResult["attempts"] = [];
  let lastError: ProviderError | null = null;
  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    if (signal?.aborted) {
      throw new ProviderError(candidate.providerSlug, "client_aborted", "Client disconnected", 499, false);
    }
    const startedAt = Date.now();
    try {
      const adapter = await getAdapter(candidate);
      const result = await adapter.chat(params, signal);
      ProviderHealthMonitor.recordSuccess(candidate.providerSlug, Date.now() - startedAt);
      attempts.push({ providerId: candidate.providerId, providerSlug: candidate.providerSlug, status: "success", httpStatus: 200, latencyMs: Date.now() - startedAt, error: null });
      return { ...result, providerSlug: candidate.providerSlug, providerId: candidate.providerId, providerModelId: candidate.upstreamModelId, attempts };
    } catch (err) {
      if (signal?.aborted) {
        throw new ProviderError(candidate.providerSlug, "client_aborted", "Client disconnected", 499, false);
      }
      const pErr = err instanceof ProviderError ? err : new ProviderError(candidate.providerSlug, "unknown", (err as Error).message, 500);
      lastError = pErr;
      ProviderHealthMonitor.recordFailure(candidate.providerSlug, pErr.code, Date.now() - startedAt);
      attempts.push({ providerId: candidate.providerId, providerSlug: candidate.providerSlug, status: "failed", httpStatus: pErr.httpStatus || null, latencyMs: Date.now() - startedAt, error: pErr.message });
      const isLast = i === chain.length - 1;
      if (isLast || !pErr.retryable) break;
    }
  }
  throw lastError ?? new ProviderError("unknown", "no_provider", "No provider available", 503);
}

export interface StreamOutcome {
  providerSlug: string;
  providerId: string;
  providerModelId: string;
  usage: Usage;
  usageSource: UsageSource;
  finishReason: string;
  attempts: ExecutionResult["attempts"];
}

/**
 * Streaming execution with fallback: fallback happens only BEFORE the first
 * content token reaches the client; after that an error event is emitted so
 * clients never see mixed output from two providers.
 */
export async function* streamChat(
  decision: RouteDecision,
  params: AdapterChatParams,
  onMeta?: (e: StreamEvent) => void,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent, StreamOutcome> {
  const chain = [decision.primary, ...decision.fallbackChain];
  const attempts: ExecutionResult["attempts"] = [];
  let lastError: ProviderError | null = null;
  let usage: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  let usageSource: UsageSource = "none";
  let finishReason = "stop";
  let started = false;

  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    if (signal?.aborted) {
      throw new ProviderError(candidate.providerSlug, "client_aborted", "Client disconnected", 499, false);
    }
    const startedAt = Date.now();
    try {
      const adapter = await getAdapter(candidate);
      const iterator = adapter.chatStream(params, signal)[Symbol.asyncIterator]();
      while (true) {
        const { value, done } = await iterator.next();
        if (done) break;
        if (value.type === "usage") {
          usage = value.usage;
          usageSource = value.usageSource;
        }
        if (value.type === "done") finishReason = value.finishReason;
        if ((value.type === "delta" || value.type === "tool_call_delta" || value.type === "reasoning_delta") && !started) {
          started = true;
        }
        onMeta?.(value);
        yield value;
      }
      attempts.push({ providerId: candidate.providerId, providerSlug: candidate.providerSlug, status: "success", httpStatus: 200, latencyMs: Date.now() - startedAt, error: null });
      return { providerSlug: candidate.providerSlug, providerId: candidate.providerId, providerModelId: candidate.upstreamModelId, usage, usageSource, finishReason, attempts };
    } catch (err) {
      if (signal?.aborted) {
        throw new ProviderError(candidate.providerSlug, "client_aborted", "Client disconnected", 499, false);
      }
      const pErr = err instanceof ProviderError ? err : new ProviderError(candidate.providerSlug, "unknown", (err as Error).message, 500);
      lastError = pErr;
      attempts.push({ providerId: candidate.providerId, providerSlug: candidate.providerSlug, status: "failed", httpStatus: pErr.httpStatus || null, latencyMs: Date.now() - startedAt, error: pErr.message });
      if (started || i === chain.length - 1 || !pErr.retryable) {
        yield { type: "done", finishReason: "error" };
        throw pErr;
      }
    }
  }
  throw lastError ?? new ProviderError("unknown", "no_provider", "No provider available", 503);
}

export interface AutoHints {
  wantsCoding?: boolean;
  wantsReasoning?: boolean;
  preferFree?: boolean;
}

/** Pick the best available model for "uno/auto". */
export async function resolveAutoModel(hints: AutoHints): Promise<string | null> {
  const db = await getDb();
  const all = await db.select({ model: models, caps: modelCapabilities }).from(models)
    .leftJoin(modelCapabilities, eq(modelCapabilities.modelId, models.id))
    .where(eq(models.status, "active"));
  const links = await db.select().from(modelProviders);
  const providerRows = await db.select().from(providers);
  const providerById = new Map(providerRows.map((p) => [p.id, p]));
  const options = all.map(({ model, caps }) => {
    const modelLinks = links.filter((l) => l.modelId === model.id);
    const available = modelLinks.some((l) => l.status === "active" && (providerById.get(l.providerId)?.status === "active"));
    return {
      slug: model.slug, name: model.name, isFree: model.isFree, rank: model.rank, popularity: model.popularity,
      reasoning: caps?.reasoning ?? false, toolCalls: caps?.toolCalls ?? false, available,
    };
  });
  const chosen = selectAutoModel(options, hints);
  return chosen?.slug ?? null;
}

/** Extract hints from the last user message for auto routing. */
export function extractHints(messages: ChatMessage[]): AutoHints {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const text = typeof last?.content === "string" ? last.content : Array.isArray(last?.content) ? last.content.map((p) => p.text ?? "").join(" ") : "";
  return {
    wantsCoding: /\b(code|coding|function|bug|debug|implement|refactor|typescript|python|sql)\b/i.test(text),
    wantsReasoning: /\b(reason|think step|analy[sz]e|prove|logic|puzzle|strategy)\b/i.test(text),
  };
}