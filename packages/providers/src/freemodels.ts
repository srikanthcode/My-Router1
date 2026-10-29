import type { ToolCall, Usage, UsageSource } from "@pro/shared";
import {
  ProviderError,
  estimateUsage,
  type AdapterChatParams,
  type ChatResult,
} from "./adapter.js";
import { OpenAICompatibleAdapter } from "./openai.js";

/**
 * FreeModels adapter (§12) — OpenAI-compatible gateway behind freemodels.pro.
 *
 * Provider quirks normalized here:
 *  - the gateway only serves requests carrying an `Origin: https://freemodels.pro`
 *    header — plain server-side calls are rejected with 403;
 *  - non-streaming replies use a simplified `{"content": "..."}` envelope
 *    instead of the OpenAI `choices[].message` shape;
 *  - replies carry no `usage`, so usage is estimated downstream when absent.
 */
export class FreemodelsAdapter extends OpenAICompatibleAdapter {
  override readonly type: string = "freemodels";

  protected override headers(): Record<string, string> {
    return {
      ...super.headers(),
      origin: "https://freemodels.pro",
      referer: "https://freemodels.pro/",
    };
  }

  override async chat(params: AdapterChatParams, signal?: AbortSignal): Promise<ChatResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ ...this.buildBody({ ...params, stream: false }), stream: false }),
        signal: controller.signal,
      });
      if (!res.ok) await this.fail(res);
      const json = (await res.json()) as {
        content?: string | null;
        choices?: Array<{
          message?: { content?: string | null; tool_calls?: ToolCall[] };
          finish_reason?: string;
        }>;
        usage?: Usage;
        id?: string;
      };
      const choice = json.choices?.[0];
      const content = choice?.message?.content ?? json.content ?? "";
      const toolCalls = choice?.message?.tool_calls ?? [];
      const usage = json.usage ?? estimateUsage({ messages: params.messages, completion: content });
      const usageSource: UsageSource = json.usage ? "upstream" : "estimated";
      return {
        content,
        toolCalls,
        finishReason: choice?.finish_reason ?? "stop",
        usage,
        usageSource,
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
}
