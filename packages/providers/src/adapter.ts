import type { ChatCompletionRequest, ChatMessage, ToolCall, Usage, UsageSource } from "@pro/shared";

/** Normalized upstream failure — adapters never leak provider-specific errors. */
export class ProviderError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly providerSlug: string;

  constructor(
    providerSlug: string,
    code: string,
    message: string,
    httpStatus: number,
    retryable?: boolean,
  ) {
    super(message);
    this.name = "ProviderError";
    this.providerSlug = providerSlug;
    this.code = code;
    this.httpStatus = httpStatus;
    // Any non-4xx-specific failure should let the router try the next provider.
    // 401/403 fall here too: the credential belongs to one provider, not the
    // request, so a healthy fallback can still serve it.
    this.retryable = retryable ?? (httpStatus === 429 || httpStatus >= 500 || httpStatus === 0 || httpStatus === 401 || httpStatus === 403);
  }
}

export interface ChatResult {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string;
  usage: Usage;
  usageSource: UsageSource;
  upstreamRequestId?: string;
}

export type StreamEvent =
  | { type: "start"; upstreamRequestId?: string }
  | { type: "delta"; text: string }
  | { type: "tool_call_delta"; index: number; id?: string; name?: string; arguments?: string }
  | { type: "reasoning_delta"; text: string }
  | { type: "usage"; usage: Usage; usageSource: UsageSource }
  | { type: "done"; finishReason: string };

export interface AdapterChatParams {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string[];
  tools?: unknown[];
  toolChoice?: unknown;
  responseFormat?: unknown;
  seed?: number;
  raw?: ChatCompletionRequest;
}

export interface HealthResult {
  available: boolean;
  latencyMs: number;
  message?: string;
}

/**
 * The contract every provider integration must implement (§12).
 * Adding a provider = implementing this interface, nothing else.
 */
export interface ProviderAdapter {
  readonly type: string;
  readonly providerSlug: string;
  chat(params: AdapterChatParams, signal?: AbortSignal): Promise<ChatResult>;
  chatStream(params: AdapterChatParams, signal?: AbortSignal): AsyncGenerator<StreamEvent>;
  listModels(signal?: AbortSignal): Promise<string[]>;
  healthCheck(signal?: AbortSignal): Promise<HealthResult>;
}

export interface AdapterConfig {
  providerSlug: string;
  endpointUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

/** Rough token estimate used ONLY when upstream returns no usage data. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateUsage(params: { messages: ChatMessage[]; completion: string }): Usage {
  let prompt = 0;
  for (const m of params.messages) {
    if (typeof m.content === "string") prompt += estimateTokens(m.content);
    else if (Array.isArray(m.content))
      for (const part of m.content) if (part.text) prompt += estimateTokens(part.text);
    if (m.name) prompt += estimateTokens(m.name);
  }
  const completion = estimateTokens(params.completion);
  return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion };
}

/** Parse a fetch Response body as SSE, yielding `data:` payload strings. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data) yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}