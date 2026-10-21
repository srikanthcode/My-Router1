import type { ChatMessage, ToolCall, Usage } from "@uno/shared";
import {
  ProviderError,
  type AdapterChatParams,
  type AdapterConfig,
  type ChatResult,
  type HealthResult,
  type ProviderAdapter,
  type StreamEvent,
  estimateUsage,
  parseSse,
} from "./adapter.js";

/** OpenAI-compatible adapter — works for OpenAI, Groq, Mistral, Ollama, OpenRouter, etc. */
export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly type: string = "openai";
  readonly providerSlug: string;
  protected readonly baseUrl: string;
  protected readonly apiKey?: string;
  protected readonly timeoutMs: number;

  constructor(config: AdapterConfig) {
    this.providerSlug = config.providerSlug;
    this.baseUrl = config.endpointUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 60000;
  }

  protected headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (this.apiKey) h.authorization = `Bearer ${this.apiKey}`;
    return h;
  }

  protected buildBody(params: AdapterChatParams): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages satisfies ChatMessage[],
      stream: params.stream,
    };
    if (params.stream) body.stream_options = { include_usage: true };
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.maxTokens !== undefined) body.max_tokens = params.maxTokens;
    if (params.stop !== undefined) body.stop = params.stop;
    if (params.tools !== undefined) body.tools = params.tools;
    if (params.toolChoice !== undefined) body.tool_choice = params.toolChoice;
    if (params.responseFormat !== undefined) body.response_format = params.responseFormat;
    if (params.seed !== undefined) body.seed = params.seed;
    return body;
  }

  protected async fail(res: Response): Promise<never> {
    let detail = "";
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        detail = json?.error?.message ?? text;
      } catch {
        detail = text;
      }
    } catch {
      /* ignore */
    }
    // 401/403 mean *this provider's* credential was rejected — the next
    // provider in the chain may still serve the request, so do not stop there.
    const retryable = res.status === 429 || res.status >= 500 || res.status === 401 || res.status === 403;
    throw new ProviderError(
      this.providerSlug,
      res.status === 429 ? "rate_limited" : res.status >= 500 ? "server_error" : "request_rejected",
      detail.slice(0, 500) || `Upstream returned HTTP ${res.status}`,
      res.status,
      retryable,
    );
  }

  async chat(params: AdapterChatParams, signal?: AbortSignal): Promise<ChatResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...this.buildBody(params), stream: false }),
        signal: controller.signal,
      });
      if (!res.ok) await this.fail(res);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] }; finish_reason?: string }>;
        usage?: Usage;
        id?: string;
      };
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? "";
      const toolCalls = choice?.message?.tool_calls ?? [];
      const usage = json.usage ?? estimateUsage({ messages: params.messages, completion: content });
      return {
        content,
        toolCalls,
        finishReason: choice?.finish_reason ?? "stop",
        usage,
        upstreamRequestId: json.id,
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out" : `Network error: ${(err as Error).message}`,
        0,
        true,
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  async *chatStream(params: AdapterChatParams, signal?: AbortSignal): AsyncGenerator<StreamEvent> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody({ ...params, stream: true })),
        signal: controller.signal,
      });
      if (!res.ok) await this.fail(res);
      if (!res.body) throw new ProviderError(this.providerSlug, "empty_body", "Empty streaming response", 502);
      yield { type: "start", upstreamRequestId: res.headers.get("x-request-id") ?? undefined };
      let usage: Usage | null = null;
      let finishReason = "stop";
      for await (const data of parseSse(res.body)) {
        if (data === "[DONE]") break;
        let chunk: {
          choices?: Array<{
            delta?: {
              content?: string | null;
              reasoning?: string;
              tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }>;
            };
            finish_reason?: string | null;
          }>;
          usage?: Usage;
        };
        try {
          chunk = JSON.parse(data);
        } catch {
          continue;
        }
        if (chunk.usage) usage = chunk.usage;
        const choice = chunk.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;
        const delta = choice.delta;
        if (delta?.reasoning) yield { type: "reasoning_delta", text: delta.reasoning };
        if (delta?.content) yield { type: "delta", text: delta.content };
        for (const tc of delta?.tool_calls ?? []) {
          yield { type: "tool_call_delta", index: tc.index, id: tc.id, name: tc.function?.name, arguments: tc.function?.arguments };
        }
      }
      if (usage) yield { type: "usage", usage };
      yield { type: "done", finishReason };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ProviderError(
        this.providerSlug,
        aborted ? "timeout" : "network_error",
        aborted ? "Provider timed out while streaming" : `Network error: ${(err as Error).message}`,
        0,
        true,
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers(), signal });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => m.id);
    } catch {
      return [];
    }
  }

  async healthCheck(signal?: AbortSignal): Promise<HealthResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
        signal: signal ?? controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      if (res.ok) return { available: true, latencyMs };
      if (res.status === 401 || res.status === 403) return { available: false, latencyMs, message: "Invalid or missing API key" };
      if (res.status === 404) return { available: true, latencyMs, message: "Endpoint reachable (no /models)" };
      return { available: false, latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, message: (err as Error).message };
    }
  }
}