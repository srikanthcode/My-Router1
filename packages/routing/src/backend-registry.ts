import type { BackendModel, CapabilityProfile } from "./types.js";

function makeCaps(overrides: Partial<CapabilityProfile> = {}): CapabilityProfile {
  return {
    general_intelligence: "supported",
    reasoning: "supported",
    deep_reasoning: "unknown",
    mathematics: "unknown",
    coding: "unknown",
    agentic_coding: "unknown",
    tool_calling: "supported",
    function_calling: "supported",
    vision: "unsupported",
    image_understanding: "unsupported",
    document_understanding: "unknown",
    multilingual: "supported",
    tamil_language: "unknown",
    long_context: "unknown",
    json_structured: "supported",
    streaming: "supported",
    low_latency: "supported",
    complex_analysis: "unknown",
    research: "unknown",
    planning: "unknown",
    instruction_following: "supported",
    ...overrides,
  };
}

/**
 * Backend Model Registry (§2).
 * Source of truth for verified live models and their underlying providers.
 * Real upstream costs are recorded in integer paise per million tokens (based on USD upstream cost * ₹80/USD).
 * ONLY TWO canonical model backends are marked isFree: true for the 48-hour launch special:
 * 1. prorouter/deepseek-v4.1-flash
 * 2. groq/qwen3.8-27b
 */
export const VERIFIED_BACKEND_MODELS: Record<string, BackendModel> = {
  // ── 1. GPT OSS Models ──
  "nabh/gpt-oss-20b": {
    id: "nabh/gpt-oss-20b",
    name: "GPT OSS 20B (Nabh)",
    provider: "nabh",
    upstreamModelId: "gpt-oss-20b",
    contextWindow: 131072,
    maxOutputTokens: 16384,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      coding: "supported",
      mathematics: "supported",
      low_latency: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 64, output: 192 },
  },
  "groq/gpt-oss-20b": {
    id: "groq/gpt-oss-20b",
    name: "GPT OSS 20B (Groq LPU)",
    provider: "groq",
    upstreamModelId: "openai/gpt-oss-20b",
    contextWindow: 131072,
    maxOutputTokens: 16384,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      coding: "supported",
      mathematics: "supported",
      low_latency: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 64, output: 192 },
  },
  "groq/gpt-oss-120b": {
    id: "groq/gpt-oss-120b",
    name: "GPT OSS 120B (Groq LPU)",
    provider: "groq",
    upstreamModelId: "openai/gpt-oss-120b",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      coding: "supported",
      mathematics: "supported",
      complex_analysis: "supported",
      research: "supported",
      low_latency: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 240, output: 960 },
  },

  // ── 2. NVIDIA Nemotron Models ──
  "requesty/nemotron-3-ultra-550b-a55b": {
    id: "requesty/nemotron-3-ultra-550b-a55b",
    name: "Nemotron 3 Ultra 550B (Requesty)",
    provider: "requesty",
    upstreamModelId: "nvidia/nemotron-3-ultra-550b-a55b",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      mathematics: "supported",
      coding: "supported",
      agentic_coding: "supported",
      complex_analysis: "supported",
      research: "supported",
      planning: "supported",
      long_context: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 560, output: 1680 },
  },
  "openrouter/nemotron-3-ultra-550b-a55b": {
    id: "openrouter/nemotron-3-ultra-550b-a55b",
    name: "Nemotron 3 Ultra 550B (OpenRouter Free)",
    provider: "openrouter",
    upstreamModelId: "nvidia/nemotron-3-ultra-550b-a55b:free",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      mathematics: "supported",
      coding: "supported",
      agentic_coding: "supported",
      complex_analysis: "supported",
      research: "supported",
      planning: "supported",
      long_context: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 560, output: 1680 },
  },
  "requesty/nemotron-3-nano-omni-30b-a3b-reasoning": {
    id: "requesty/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron 3 Nano Omni 30B (Requesty)",
    provider: "requesty",
    upstreamModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    contextWindow: 131072,
    maxOutputTokens: 20480,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      mathematics: "supported",
      coding: "supported",
      vision: "supported",
      image_understanding: "supported",
      document_understanding: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 120, output: 360 },
  },
  "openrouter/nemotron-3-nano-omni-30b-a3b-reasoning": {
    id: "openrouter/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron 3 Nano Omni 30B (OpenRouter Free)",
    provider: "openrouter",
    upstreamModelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    contextWindow: 131072,
    maxOutputTokens: 20480,
    capabilities: makeCaps({
      reasoning: "supported",
      deep_reasoning: "supported",
      mathematics: "supported",
      coding: "supported",
      vision: "supported",
      image_understanding: "supported",
      document_understanding: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 120, output: 360 },
  },
  "requesty/nemotron-3.5-lightning-30b-a3b": {
    id: "requesty/nemotron-3.5-lightning-30b-a3b",
    name: "Nemotron 3.5 Lightning 30B (Requesty)",
    provider: "requesty",
    upstreamModelId: "nvidia/nemotron-3.5-lightning-30b-a3b",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: makeCaps({
      low_latency: "supported",
      long_context: "supported",
      coding: "supported",
      reasoning: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 80, output: 240 },
  },
  "openrouter/nemotron-3.5-lightning": {
    id: "openrouter/nemotron-3.5-lightning",
    name: "Nemotron 3.5 Lightning (OpenRouter Free)",
    provider: "openrouter",
    upstreamModelId: "nvidia/nemotron-3.5-lightning:free",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    capabilities: makeCaps({
      low_latency: "supported",
      long_context: "supported",
      coding: "supported",
      reasoning: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 80, output: 240 },
  },
  "openrouter/nemotron-3.5-super-vl": {
    id: "openrouter/nemotron-3.5-super-vl",
    name: "Nemotron 3.5 Super VL (OpenRouter Free)",
    provider: "openrouter",
    upstreamModelId: "nvidia/nemotron-3.5-super-vl:free",
    contextWindow: 128000,
    maxOutputTokens: 64000,
    capabilities: makeCaps({
      vision: "supported",
      image_understanding: "supported",
      document_understanding: "supported",
      reasoning: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 160, output: 480 },
  },

  // ── 3. High-Performance Open Weights ──
  "groq/qwen3.8-27b": {
    id: "groq/qwen3.8-27b",
    name: "Qwen 3.8 27B (Groq LPU)",
    provider: "groq",
    upstreamModelId: "qwen/qwen3.8-27b",
    contextWindow: 131072,
    maxOutputTokens: 64000,
    capabilities: makeCaps({
      coding: "supported",
      agentic_coding: "supported",
      multilingual: "supported",
      tamil_language: "supported",
      low_latency: "supported",
      reasoning: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: true, // Promotional canonical model
    costPaisePerMillion: { input: 160, output: 640 },
  },
  "requesty/gemma-4-31b-it": {
    id: "requesty/gemma-4-31b-it",
    name: "Gemma 4 31B IT (Requesty)",
    provider: "requesty",
    upstreamModelId: "google/gemma-4-31b-it",
    contextWindow: 262144,
    maxOutputTokens: 8192,
    capabilities: makeCaps({
      multilingual: "supported",
      tamil_language: "supported",
      reasoning: "supported",
      instruction_following: "supported",
      long_context: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 112, output: 336 },
  },
  "requesty/leanstral-1-5": {
    id: "requesty/leanstral-1-5",
    name: "Leanstral 1.5 (Requesty)",
    provider: "requesty",
    upstreamModelId: "mistral/leanstral-1-5",
    contextWindow: 262144,
    maxOutputTokens: 32768,
    capabilities: makeCaps({
      reasoning: "supported",
      long_context: "supported",
      instruction_following: "supported",
      complex_analysis: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 96, output: 288 },
  },
  "requesty/ling-3.1-flash": {
    id: "requesty/ling-3.1-flash",
    name: "Ling 3.1 Flash (Requesty)",
    provider: "requesty",
    upstreamModelId: "novita/ling-3.1-flash",
    contextWindow: 262144,
    maxOutputTokens: 32768,
    capabilities: makeCaps({
      low_latency: "supported",
      long_context: "supported",
      multilingual: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 64, output: 192 },
  },
  "groq/allam-2-7b": {
    id: "groq/allam-2-7b",
    name: "Allam 2 7B (Groq LPU)",
    provider: "groq",
    upstreamModelId: "allam-2-7b",
    contextWindow: 4096,
    maxOutputTokens: 2048,
    capabilities: makeCaps({
      low_latency: "supported",
      multilingual: "supported",
      tool_calling: "unsupported",
      function_calling: "unsupported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: false,
    costPaisePerMillion: { input: 40, output: 120 },
  },

  // ── 4. Primary Gateway Fallback Engine ──
  "prorouter/deepseek-v4.1-flash": {
    id: "prorouter/deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash (ProRouter Gateway)",
    provider: "prorouter-gateway",
    upstreamModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
    contextWindow: 262144,
    maxOutputTokens: 128000,
    capabilities: makeCaps({
      general_intelligence: "supported",
      reasoning: "supported",
      deep_reasoning: "supported",
      coding: "supported",
      agentic_coding: "supported",
      tool_calling: "supported",
      function_calling: "supported",
      multilingual: "supported",
      tamil_language: "supported",
      long_context: "supported",
      json_structured: "supported",
      streaming: "supported",
      low_latency: "supported",
      complex_analysis: "supported",
      research: "supported",
      planning: "supported",
      instruction_following: "supported",
    }),
    verified: true,
    healthStatus: "active",
    isFree: true, // Promotional canonical model
    costPaisePerMillion: { input: 112, output: 224 },
  },
};

export class BackendModelRegistry {
  private static backends = VERIFIED_BACKEND_MODELS;

  public static get(id: string): BackendModel | undefined {
    return this.backends[id];
  }

  public static getAll(): BackendModel[] {
    return Object.values(this.backends);
  }

  public static getByProvider(provider: string): BackendModel[] {
    return Object.values(this.backends).filter((b) => b.provider === provider);
  }

  public static findCompatible(
    requiredCaps: (keyof CapabilityProfile)[],
    excludeBackendIds: Set<string> = new Set()
  ): BackendModel[] {
    return Object.values(this.backends)
      .filter((b) => !excludeBackendIds.has(b.id))
      .filter((b) => b.healthStatus === "active")
      .filter((b) => {
        for (const cap of requiredCaps) {
          if (b.capabilities[cap] === "unsupported") {
            return false;
          }
        }
        return true;
      });
  }
}
