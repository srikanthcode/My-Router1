import type { ChatMessage, ToolCall, Usage } from "@uno/shared";
import {
  ProviderError,
  type AdapterChatParams,
  type AdapterConfig,
  type HealthResult,
  type ProviderAdapter,
  type StreamEvent,
  estimateUsage,
  parseSse,
} from "./adapter.js";

const ANTHROPIC_VERSION = "2023-06-01";

/** Anthropic Messages API adapter — normalizes to ProRouter's OpenAI-style interface. */
export class AnthropicAdapter implements ProviderAdapter {
  readonly type = "anthropic";
  readonly providerSlug: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(config: AdapterConfig) {
    this.providerSlug = config.providerSlug;
    this.baseUrl = config.endpointUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? 60000;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "content-type": "application/json",
      "anthropic-version": ANTHROPIC_VERSION,
    };
    if (this.apiKey) h["x-api-key"] = this.apiKey;
    return h;
  }

  /** Convert OpenAI-style messages into Anthropic's system/messages shape. */
  private splitMessages(messages: ChatMessage[]): { system?: string; messages: unknown[] } {
    let system: string | undefined;
    const out: unknown[] = [];
    for (const m of messages) {
      if (m.role === "system" || m.role === "developer") {
        const text = typeof m.content === "string" ? m.content : "";
        system = system ? `${system}\n\n${text}` : text;
        continue;
      }
      const text =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.content)
            ? m.content.map((p) => p.text ?? "").join("")
            : "";
      out.push({ role: m.role === "assistant" ? "assistant" : "user", content: text });
    }
    return { system, messages: out };
  }

  private buildBody(params: AdapterChatParams): Record<string, unknown> {
    const { system, messages } = this.splitMessages(params.messages);
    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 4096,
      stream: params.stream,
    };
    if (system) body.system = system;
    if (params.temperature !== undefined) body.temperature = params.temperature;
    if (params.topP !== undefined) body.top_p = params.topP;
    if (params.stop !== undefined) body.stop_sequences = params.stop;
    return body;
  }

  private async fail(res: Response): Promise<never> {
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
    throw new ProviderError(
      this.providerSlug,
      res.status === 429 ? "rate_limited" : res.status >= 500 ? "server_error" : "request_rejected",
      detail.slice(0, 500) || `Upstream returned HTTP ${res.status}`,
      res.status,
    );
  }

  async chat(params: AdapterChatParams, signal?: AbortSignal) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...this.buildBody(params), stream: false }),
        signal: controller.signal,
      });
      if (!res.ok) await this.fail(res);
      const json = (await res.json()) as {
        content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
        stop_reason?: string;
        usage?: { input_tokens?: number; output_tokens?: number };
      };
      const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      const toolCalls: ToolCall[] = (json.content ?? [])
        .filter((b) => b.type === "tool_use")
        .map((b, i) => ({
          id: b.id ?? `tool_${i}`,
          type: "function" as const,
          function: { name: b.name ?? "", arguments: JSON.stringify(b.input ?? {}) },
        }));
      const usage: Usage = {
        prompt_tokens: json.usage?.input_tokens ?? estimateUsage({ messages: params.messages, completion: text }).prompt_tokens,
        completion_tokens: json.usage?.output_tokens ?? 0,
        total_tokens: (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0),
      };
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
      return { content: text, toolCalls, finishReason: json.stop_reason ?? "stop", usage };
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
      const res = await fetch(`${this.baseUrl}/messages`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody({ ...params, stream: true })),
        signal: controller.signal,
      });
      if (!res.ok) await this.fail(res);
      if (!res.body) throw new ProviderError(this.providerSlug, "empty_body", "Empty streaming response", 502);
      yield { type: "start" };
      let inputTokens = 0;
      let outputTokens = 0;
      let finishReason = "stop";
      for await (const data of parseSse(res.body)) {
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        const type = String(event.type ?? "");
        if (type === "message_start") {
          const msg = event.message as { usage?: { input_tokens?: number } } | undefined;
          inputTokens = msg?.usage?.input_tokens ?? 0;
        } else if (type === "content_block_delta") {
          const delta = event.delta as { type?: string; text?: string; thinking?: string } | undefined;
          if (delta?.type === "text_delta" && delta.text) yield { type: "delta", text: delta.text };
          if (delta?.type === "thinking_delta" && delta.thinking) yield { type: "reasoning_delta", text: delta.thinking };
        } else if (type === "message_delta") {
          const delta = event.delta as { stop_reason?: string } | undefined;
          if (delta?.stop_reason) finishReason = delta.stop_reason === "tool_use" ? "tool_calls" : "stop";
          const usage = event.usage as { output_tokens?: number } | undefined;
          if (usage?.output_tokens) outputTokens = usage.output_tokens;
        } else if (type === "error") {
          const err = event.error as { message?: string } | undefined;
          throw new ProviderError(this.providerSlug, "stream_error", err?.message ?? "Anthropic stream error", 502, true);
        } else if (type === "message_stop") {
          break;
        }
      }
      yield { type: "usage", usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens } };
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

  async listModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers() });
      if (!res.ok) return [];
      const json = (await res.json()) as { data?: Array<{ id: string }> };
      return (json.data ?? []).map((m) => m.id);
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<HealthResult> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${this.baseUrl}/models`, { headers: this.headers(), signal: controller.signal });
      clearTimeout(timer);
      const latencyMs = Date.now() - start;
      if (res.ok) return { available: true, latencyMs };
      if (res.status === 401) return { available: false, latencyMs, message: "Invalid API key" };
      if (res.status === 404) return { available: true, latencyMs, message: "Endpoint reachable" };
      return { available: false, latencyMs, message: `HTTP ${res.status}` };
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, message: (err as Error).message };
    }
  }
}