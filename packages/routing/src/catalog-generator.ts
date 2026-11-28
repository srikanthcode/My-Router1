import type {
  FrontendModelProfile,
  CapabilityProfile,
  ProfileBehavior,
  RoutingPolicy,
  ModelCategory,
} from "./types.js";
import { CURATED_MODELS } from "./model-alias-registry.js";

function caps(overrides: Partial<CapabilityProfile> = {}): CapabilityProfile {
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

export function generateProfiles(): FrontendModelProfile[] {
  return CURATED_MODELS.map((m) => {
    const isCoding = m.category === "coding";
    const isReasoning = m.category === "reasoning";
    const isVision = m.category === "vision";

    const behavior: ProfileBehavior = {
      reasoning_style: isReasoning ? "step_by_step" : "structured",
      answer_style: isCoding ? "code_first" : "clear_and_precise",
      verbosity: "adaptive",
      instruction_following: "strict",
      tool_usage: m.supportsNativeTools ? "always" : "never",
      formatting: isCoding ? "code_focused" : "chat_assistant",
      uncertainty_handling: "transparent",
    };

    const routingPolicy: RoutingPolicy = {
      primaryBackend: m.backendTarget,
      secondaryBackend: m.fallbackChain[1] !== m.backendTarget ? m.fallbackChain[1] : undefined,
      finalFallback: "prorouter/deepseek-v4.1-flash",
      requiredCapabilities: isCoding ? ["tool_calling"] : isVision ? ["vision"] : [],
    };

    const capabilities = caps({
      coding: isCoding ? "supported" : "unknown",
      agentic_coding: isCoding && m.supportsNativeTools ? "supported" : "unknown",
      tool_calling: m.supportsNativeTools ? "supported" : "unsupported",
      function_calling: m.supportsNativeTools ? "supported" : "unsupported",
      vision: m.supportsVision ? "supported" : "unsupported",
      image_understanding: m.supportsVision ? "supported" : "unsupported",
      reasoning: m.supportsReasoning ? "supported" : "unknown",
      deep_reasoning: isReasoning ? "supported" : "unknown",
      long_context: m.contextWindow >= 200000 ? "supported" : "unknown",
      streaming: m.supportsStreamingTools ? "supported" : "supported",
      low_latency: m.category === "fast" ? "supported" : "unknown",
    });

    const tags = [
      m.category,
      m.family.toLowerCase(),
      ...(m.recommendedForAgents ? ["agent-ready", "tools", "coding"] : []),
      ...(m.isFree ? ["free-tier", "1m-free-daily"] : []),
    ];

    return {
      id: m.slug,
      canonicalModelId: m.slug,
      name: m.name,
      provider: m.family.toLowerCase(),
      category: m.category as ModelCategory,
      categoryLabel: m.categoryLabel,
      description: m.description,
      status: "production",
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      pricingTier: isCoding ? "code" : isReasoning ? "reason" : m.category === "fast" ? "flash" : "standard",
      isFree: m.isFree,
      pricingStatus: "approved",
      customerPricingUsd: {
        inputPerMillion: m.pricing.usd.prompt,
        outputPerMillion: m.pricing.usd.completion,
        cachedInputPerMillion: m.pricing.usd.cachedPrompt,
      },
      upstreamCostUsd: {
        inputPerMillion: Number((m.pricing.usd.prompt * 0.7).toFixed(4)),
        outputPerMillion: Number((m.pricing.usd.completion * 0.7).toFixed(4)),
        cachedInputPerMillion: m.pricing.usd.cachedPrompt ? Number((m.pricing.usd.cachedPrompt * 0.7).toFixed(4)) : undefined,
      },
      capabilities,
      behavior,
      routingPolicy,
      rank: m.recommendedForAgents ? 1 : 10,
      popularity: m.isFree ? 10000 : 9000,
      rating: 98,
      tags,
    };
  });
}
