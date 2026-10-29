import type { Currency } from "./money.js";

export type UserRole = "user" | "admin" | "support";
export type ModelStatus = "active" | "coming_soon" | "disabled" | "archived";
export type ModelType = "chat" | "completion" | "embedding" | "image" | "audio";
export type ProviderStatus = "active" | "degraded" | "disabled" | "unknown";
export type Modality = "text" | "image" | "audio" | "video";
/** Whether token counts came from the upstream provider, our estimator, or nothing. */
export type UsageSource = "upstream" | "estimated" | "none";

export interface ModelPricing {
  /** Integer minor units (paise) per 1M input tokens. */
  inputPerMillion: number;
  /** Integer minor units (paise) per 1M output tokens. */
  outputPerMillion: number;
  /** Optional cached-input price per 1M tokens. */
  cachedInputPerMillion?: number;
  currency: Currency;
}

export interface ModelCapabilities {
  modalities: Modality[];
  streaming: boolean;
  toolCalls: boolean;
  structuredOutputs: boolean;
  reasoning: boolean;
  vision: boolean;
  imageGeneration: boolean;
  audio: boolean;
  jsonMode: boolean;
}

export interface ModelDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  providerName: string;
  providerSlug: string;
  type: ModelType;
  status: ModelStatus;
  isFree: boolean;
  pricing: ModelPricing;
  /** Retail pricing tier slug, when the model uses tier-based pricing. */
  pricingTier?: string | null;
  /** Human-readable pricing tier name. */
  pricingTierName?: string | null;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxOutputTokens: number;
  rank: number;
  popularity: number;
  rating: number;
  latencyMs: number | null;
  throughputTps: number | null;
  uptimePercent: number | null;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderDto {
  id: string;
  slug: string;
  name: string;
  region: string;
  status: ProviderStatus;
  modelCount: number;
  uptimePercent: number | null;
  avgLatencyMs: number | null;
  throughputTps: number | null;
  priority: number;
  supportedCapabilities: string[];
  retentionPolicy: string;
  description: string;
}

export interface ChatMessage {
  role: "system" | "developer" | "user" | "assistant" | "tool";
  content: string | null | Array<ChatContentPart>;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ChatContentPart {
  type: "text" | "image_url" | "input_audio";
  text?: string;
  image_url?: { url: string };
  input_audio?: { data: string; format: string };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  seed?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; request_id: string; details?: unknown };
}