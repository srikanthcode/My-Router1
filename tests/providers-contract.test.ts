import { describe, it, expect, afterEach, vi } from "vitest";
import { OpenAICompatibleAdapter } from "../packages/providers/src/openai";
import { AnthropicAdapter } from "../packages/providers/src/anthropic";
import { ProviderError, parseSse } from "../packages/providers/src/adapter";

function sseStream(parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAI-compatible adapter contract", () => {
  it("preserves the original client payload instead of dropping provider-specific fields", async () => {
    let sentBody: Record<string, unknown> | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return jsonResponse({ choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }] });
    }));
    const adapter = new OpenAICompatibleAdapter({ providerSlug: "tokenjuice", endpointUrl: "https://example.test/v1", apiKey: "k" });
    await adapter.chat({
      model: "upstream-model",
      messages: [{ role: "user", content: "inspect project" }],
      stream: false,
      maxTokens: 4096,
      tools: [{ type: "function", function: { name: "list_files", parameters: { type: "object", properties: {} } } }],
      raw: {
        model: "public-model",
        messages: [{ role: "user", content: "inspect project" }],
        stream: false,
        max_completion_tokens: 4096,
        reasoning_effort: "high",
        presence_penalty: 0.2,
        frequency_penalty: 0.1,
        metadata: { client: "coding-agent" },
        tools: [{ type: "function", function: { name: "list_files", parameters: { type: "object", properties: {} } } }],
      } as never,
    });
    expect(sentBody?.model).toBe("upstream-model");
    expect(sentBody?.max_completion_tokens).toBe(4096);
    expect(sentBody?.max_tokens).toBeUndefined();
    expect(sentBody?.reasoning_effort).toBe("high");
    expect(sentBody?.presence_penalty).toBe(0.2);
    expect(sentBody?.frequency_penalty).toBe(0.1);
    expect(sentBody?.metadata).toEqual({ client: "coding-agent" });
    expect(sentBody?.tools).toBeDefined();
  });

  it("does not inject stream_options when the client did not request them", async () => {
    let sentBody: Record<string, unknown> | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      sentBody = JSON.parse(String(init?.body));
      return new Response(sseStream(["data: [DONE]\n\n"]), { status: 200, headers: { "content-type": "text/event-stream" } });
    }));
    const adapter = new OpenAICompatibleAdapter({ providerSlug: "tokenjuice", endpointUrl: "https://example.test/v1", apiKey: "k" });
    for await (const _event of adapter.chatStream({ model: "m", messages: [{ role: "user", content: "hi" }], stream: true })) { /* drain */ }
    expect(sentBody?.stream).toBe(true);
    expect(sentBody?.stream_options).toBeUndefined();
  });

  it("normalizes non-streaming tool calls and upstream usage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({
        id: "req_1",
        choices: [{
          message: { content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: "read_file", arguments: "{\"path\":\"a.txt\"}" } }] },
          finish_reason: "tool_calls",
        }],
        usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 },
      }),
    ));
    const adapter = new OpenAICompatibleAdapter({ providerSlug: "openai", endpointUrl: "https://example.test/v1", apiKey: "k" });
    const result = await adapter.chat({ model: "m", messages: [{ role: "user", content: "hi" }], stream: false });
    expect(result.finishReason).toBe("tool_calls");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe("read_file");
    expect(result.usageSource).toBe("upstream");
    expect(result.usage.total_tokens).toBe(19);
  });

  it("surfaces 401 as a retryable ProviderError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { message: "bad key" } }, 401)));
    const adapter = new OpenAICompatibleAdapter({ providerSlug: "openai", endpointUrl: "https://example.test/v1", apiKey: "k" });
    const error = await adapter.chat({ model: "m", messages: [], stream: false }).catch((e) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.httpStatus).toBe(401);
    expect(error.retryable).toBe(true);
  });

  it("emits tool-call deltas from an OpenAI stream", async () => {
    const chunk1 = JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: "call_1", function: { name: "read_file", arguments: "{\"pa" } }] } }] });
    const chunk2 = JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: "th\":\"a.txt\"}" } }] }, finish_reason: null }] });
    const chunk3 = JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(sseStream([
      `data: ${chunk1}\n\n`,
      `data: ${chunk2}\n\n`,
      `data: ${chunk3}\n\ndata: [DONE]\n\n`,
    ]), { status: 200, headers: { "content-type": "text/event-stream" } })));
    const adapter = new OpenAICompatibleAdapter({ providerSlug: "openai", endpointUrl: "https://example.test/v1", apiKey: "k" });
    const events = [];
    for await (const ev of adapter.chatStream({ model: "m", messages: [{ role: "user", content: "hi" }], stream: true })) events.push(ev);
    const toolDeltas = events.filter((e) => e.type === "tool_call_delta");
    expect(toolDeltas).toHaveLength(2);
    expect(events[events.length - 1]).toEqual({ type: "done", finishReason: "tool_calls" });
  });
});

describe("Anthropic adapter contract", () => {
  it("maps stop_reason and estimates missing usage", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({
        content: [
          { type: "text", text: "checking" },
          { type: "tool_use", id: "toolu_1", name: "read_file", input: { path: "a.txt" } },
        ],
        stop_reason: "tool_use",
      }),
    ));
    const adapter = new AnthropicAdapter({ providerSlug: "anthropic", endpointUrl: "https://example.test/v1", apiKey: "k" });
    const result = await adapter.chat({ model: "m", messages: [{ role: "user", content: "read a.txt" }], stream: false });
    expect(result.finishReason).toBe("tool_calls");
    expect(result.toolCalls[0].function.arguments).toBe("{\"path\":\"a.txt\"}");
    expect(result.usageSource).toBe("estimated");
    expect(result.usage.completion_tokens).toBeGreaterThan(0);
  });

  it("maps max_tokens stop reason in a stream", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(sseStream([
      "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"usage\":{\"input_tokens\":5}}}\n\n",
      "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"hi\"}}\n\n",
      "event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"max_tokens\"},\"usage\":{\"output_tokens\":2}}\n\n",
      "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
    ]), { status: 200, headers: { "content-type": "text/event-stream" } })));
    const adapter = new AnthropicAdapter({ providerSlug: "anthropic", endpointUrl: "https://example.test/v1", apiKey: "k" });
    const events = [];
    for await (const ev of adapter.chatStream({ model: "m", messages: [{ role: "user", content: "hi" }], stream: true })) events.push(ev);
    expect(events.find((e) => e.type === "delta")).toEqual({ type: "delta", text: "hi" });
    expect(events.find((e) => e.type === "usage")).toEqual({ type: "usage", usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 }, usageSource: "upstream" });
    expect(events[events.length - 1]).toEqual({ type: "done", finishReason: "length" });
  });
});

describe("parseSse", () => {
  it("flushes a final data line with no trailing newline and handles split chunks", async () => {
    const events: string[] = [];
    for await (const data of parseSse(sseStream(["data: {\"a\":1}\n\ndata: {\"b\"", ":2}\n\ndata: [DONE]"]))) events.push(data);
    expect(events).toEqual(["{\"a\":1}", "{\"b\":2}", "[DONE]"]);
  });
});
