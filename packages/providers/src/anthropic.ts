import type { ChatMessage, ToolCall, Usage, UsageSource } from "@pro/shared";
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
    const rawOut: Array<{ role: string; content: unknown }> = [];

    for (const m of messages) {
      if (m.role === "system" || m.role === "developer") {
        const text = typeof m.content === "string" ? m.content : "";
        system = system ? `${system}\n\n${text}` : text;
        continue;
      }

      if (m.role === "tool") {
        const toolUseId = (m as any).tool_call_id || "call_unknown";
        const contentStr = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? {});
        rawOut.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseId,
              content: contentStr,
            },
          ],
        });
        continue;
      }

      if (m.role === "assistant") {
        const toolCalls = (m as any).tool_calls;
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
          const blocks: unknown[] = [];
          const text = typeof m.content === "string" ? m.content.trim() : "";
          if (text) {
            blocks.push({ type: "text", text });
          }
          for (const tc of toolCalls) {
            let inputObj: Record<string, unknown> = {};
            try {
              inputObj = typeof tc.function?.arguments === "string"
                ? JSON.parse(tc.function.arguments)
                : (tc.function?.arguments || {});
            } catch {
              inputObj = {};
            }
            blocks.push({
              type: "tool_use",
              id: tc.id || "toolu_unknown",
              name: tc.function?.name || "tool",
              input: inputObj,
            });
          }
          rawOut.push({ role: "assistant", content: blocks });
          continue;
        }

        const text =
          typeof m.content === "string"
            ? m.content
            : Array.isArray(m.content)
              ? m.content.map((p) => (typeof p === "string" ? p : p.text ?? "")).join("")
              : "";
        rawOut.push({ role: "assistant", content: text });
        continue;
      }

      // User messages
      if (Array.isArray(m.content)) {
        rawOut.push({ role: "user", content: m.content });
      } else {
        const text = typeof m.content === "string" ? m.content : "";
        rawOut.push({ role: "user", content: text });
      }
    }

    // Merge consecutive messages with the same role (e.g. multiple tool results in user role)
    const out: Array<{ role: string; content: unknown }> = [];
    for (const msg of rawOut) {
      const prev = out[out.length - 1];
      if (prev && prev.role === msg.role) {
        if (Array.isArray(prev.content) && Array.isArray(msg.content)) {
          prev.content = [...prev.content, ...msg.content];
        } else if (Array.isArray(prev.content) && typeof msg.content === "string") {
          prev.content = [...prev.content, { type: "text", text: msg.content }];
        } else if (typeof prev.content === "string" && Array.isArray(msg.content)) {
          prev.content = [{ type: "text", text: prev.content }, ...msg.content];
        } else if (typeof prev.content === "string" && typeof msg.content === "string") {
          prev.content = `${prev.content}\n\n${msg.content}`;
        }
      } else {
        out.push({ ...msg });
      }
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

    if (Array.isArray(params.tools) && params.tools.length > 0) {
      body.tools = params.tools.map((t: any) => ({
        name: t.function?.name || t.name,
        description: t.function?.description || t.description || "",
        input_schema: t.function?.parameters || t.input_schema || { type: "object", properties: {} },
      }));

      if (params.toolChoice) {
        if (params.toolChoice === "auto") {
          body.tool_choice = { type: "auto" };
        } else if (params.toolChoice === "required") {
          body.tool_choice = { type: "any" };
        } else if (typeof params.toolChoice === "object" && (params.toolChoice as any).function?.name) {
          body.tool_choice = { type: "tool", name: (params.toolChoice as any).function.name };
        }
      }
    }

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
      res.status === 429 || res.status >= 500 || res.status === 401 || res.status === 403,
    );
  }

  private static mapStopReason(reason: string | undefined): string {
    if (reason === "tool_use") return "tool_calls";
    if (reason === "max_tokens") return "length";
    return "stop";
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
      const estimated = estimateUsage({ messages: params.messages, completion: text });
      const usage: Usage = {
        prompt_tokens: json.usage?.input_tokens ?? estimated.prompt_tokens,
        completion_tokens: json.usage?.output_tokens ?? estimated.completion_tokens,
        total_tokens: 0,
      };
      usage.total_tokens = usage.prompt_tokens + usage.completion_tokens;
      const usageSource: UsageSource = json.usage ? "upstream" : "estimated";
      return { content: text, toolCalls, finishReason: AnthropicAdapter.mapStopReason(json.stop_reason), usage, usageSource };
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
      clearTimeout(timer);
      if (!res.ok) await this.fail(res);
      if (!res.body) throw new ProviderError(this.providerSlug, "empty_body", "Empty streaming response", 502);
      yield { type: "start" };
      let inputTokens = 0;
      let outputTokens = 0;
      let finishReason = "stop";
      let sawUsage = false;
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
          if (typeof msg?.usage?.input_tokens === "number") sawUsage = true;
        } else if (type === "content_block_start") {
          const block = event.content_block as { type?: string; id?: string; name?: string } | undefined;
          if (block?.type === "tool_use") {
            yield {
              type: "tool_call_delta",
              index: typeof event.index === "number" ? event.index : 0,
              id: block.id,
              name: block.name,
              arguments: "",
            };
          }
        } else if (type === "content_block_delta") {
          const delta = event.delta as { type?: string; text?: string; thinking?: string; partial_json?: string } | undefined;
          if (delta?.type === "text_delta" && delta.text) yield { type: "delta", text: delta.text };
          if (delta?.type === "thinking_delta" && delta.thinking) yield { type: "reasoning_delta", text: delta.thinking };
          if (delta?.type === "input_json_delta" && typeof delta.partial_json === "string") {
            yield {
              type: "tool_call_delta",
              index: typeof event.index === "number" ? event.index : 0,
              arguments: delta.partial_json,
            };
          }
        } else if (type === "message_delta") {
          const delta = event.delta as { stop_reason?: string } | undefined;
          if (delta?.stop_reason) finishReason = AnthropicAdapter.mapStopReason(delta.stop_reason);
          const usage = event.usage as { output_tokens?: number } | undefined;
          if (typeof usage?.output_tokens === "number") {
            outputTokens = usage.output_tokens;
            sawUsage = true;
          }
        } else if (type === "error") {
          const err = event.error as { message?: string } | undefined;
          throw new ProviderError(this.providerSlug, "stream_error", err?.message ?? "Anthropic stream error", 502, true);
        } else if (type === "message_stop") {
          break;
        }
      }
      if (sawUsage) yield { type: "usage", usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens }, usageSource: "upstream" };
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