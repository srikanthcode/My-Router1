/**
 * Core type definitions for the 500+ AI Model Catalog & Intelligent Routing Engine.
 */

export type CapabilityStatus = "supported" | "unsupported" | "unknown";

export interface CapabilityProfile {
  general_intelligence: CapabilityStatus;
  reasoning: CapabilityStatus;
  deep_reasoning: CapabilityStatus;
  mathematics: CapabilityStatus;
  coding: CapabilityStatus;
  agentic_coding: CapabilityStatus;
  tool_calling: CapabilityStatus;
  function_calling: CapabilityStatus;
  vision: CapabilityStatus;
  image_understanding: CapabilityStatus;
  document_understanding: CapabilityStatus;
  multilingual: CapabilityStatus;
  tamil_language: CapabilityStatus;
  long_context: CapabilityStatus;
  json_structured: CapabilityStatus;
  streaming: CapabilityStatus;
  low_latency: CapabilityStatus;
  complex_analysis: CapabilityStatus;
  research: CapabilityStatus;
  planning: CapabilityStatus;
  instruction_following: CapabilityStatus;
}

export type ModelCategory =
  | "general"
  | "reasoning"
  | "coding"
  | "agentic"
  | "research"
  | "math_science"
  | "multilingual"
  | "vision"
  | "fast"
  | "long_context"
  | "creative"
  | "business";

export type ProfileStatus = "production" | "preview" | "experimental";

export interface ProfileBehavior {
  reasoning_style: "structured" | "step_by_step" | "concise" | "academic" | "exploratory";
  answer_style: "clear_and_precise" | "authoritative" | "conversational" | "code_first" | "executive_brief";
  verbosity: "compact" | "adaptive" | "comprehensive" | "verbose";
  instruction_following: "strict" | "guided" | "creative";
  tool_usage: "always" | "when_needed" | "never";
  formatting: "chat_assistant" | "markdown_clean" | "code_focused" | "academic_paper" | "technical_memo";
  uncertainty_handling: "transparent" | "balanced" | "conservative";
  system_prompt_template?: string;
  custom_persona?: string;
}

export interface RoutingPolicy {
  primaryBackend: string;
  secondaryBackend?: string;
  finalFallback: string;
  requiredCapabilities: (keyof CapabilityProfile)[];
  preferredProvider?: string;
}

export interface ModelBenchmarkScore {
  name: string;
  score: number;
  source: string;
  evaluationDate: string;
}

export interface FrontendModelProfile {
  id: string;
  canonicalModelId?: string;
  name: string;
  provider?: string;
  category: ModelCategory;
  categoryLabel: string;
  description: string;
  status: ProfileStatus;
  contextWindow: number;
  maxOutputTokens: number;
  pricingTier: string;
  isFree: boolean;
  pricingStatus?: "approved" | "pricing_pending" | "disabled";
  customerPricingUsd?: {
    inputPerMillion: number;
    outputPerMillion: number;
    cachedInputPerMillion?: number;
  };
  upstreamCostUsd?: {
    inputPerMillion: number;
    outputPerMillion: number;
    cachedInputPerMillion?: number;
  };
  capabilities: CapabilityProfile;
  behavior: ProfileBehavior;
  routingPolicy: RoutingPolicy;
  rank: number;
  popularity: number;
  rating: number;
  benchmarks?: ModelBenchmarkScore[];
  tags: string[];
}

export interface BackendModel {
  id: string;
  name: string;
  provider: "groq" | "nabh" | "requesty" | "openrouter" | "prorouter-gateway";
  upstreamModelId: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: CapabilityProfile;
  verified: boolean;
  healthStatus: "active" | "degraded" | "disabled";
  isFree: boolean;
  costPaisePerMillion: {
    input: number;
    output: number;
  };
}

export interface UserRequestRequirements {
  hasImages?: boolean;
  requiresTools?: boolean;
  requiresReasoning?: boolean;
  requiresCoding?: boolean;
  requiresTamil?: boolean;
  requiresMultilingual?: boolean;
  estimatedTokens?: number;
  streaming?: boolean;
  preferFree?: boolean;
}

export interface IntelligentRouteDecision {
  profileId: string;
  profileName: string;
  primary: BackendModel;
  fallbackChain: BackendModel[];
  behavior: ProfileBehavior;
  trace: string[];
}

export interface FailureContext {
  backendId: string;
  provider: string;
  status: number | string;
  message: string;
  attemptNumber: number;
  isStreaming: boolean;
  tokensSent: number;
}

