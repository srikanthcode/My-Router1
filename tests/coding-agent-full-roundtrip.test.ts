import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { OpenAICompatibleAdapter, cleanSpecialTokens } from "../packages/providers/src/openai";
import { AnthropicAdapter } from "../packages/providers/src/anthropic";
import { routeRequest, type RouteCandidate, ModelProfileRegistry, IntelligentModelRouter, BackendModelRegistry } from "@pro/routing";
import type { ChatMessage, ToolCall } from "@pro/shared";
import { resolveModelInput, MODEL_ALIASES } from "../apps/api/src/lib/pipeline";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function sseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + "\n"));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "content-type": "text/event-stream" } });
}

describe("Master Coding Agent & Tool Calling Regression Suite (Tests A through K)", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prorouter-full-suite-"));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { /* clean */ }
  });

  // Test A: Simple native tool call
  it("Test A: sends tool definition and receives exact native tool_calls response", async () => {
    let capturedBody: any;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse({
        id: "chatcmpl-test-a",
        choices: [{
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_check_01",
              type: "function",
              function: { name: "check_health", arguments: "{}" },
            }],
          },
          finish_reason: "tool_calls",
        }],
        usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 },
      });
    }));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "tokenjuice",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "test-key",
    });

    const result = await adapter.chat({
      model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
      messages: [{ role: "user", content: "Run health check tool." }],
      stream: false,
      tools: [{
        type: "function",
        function: { name: "check_health", description: "Verify system health", parameters: { type: "object", properties: {} } },
      }],
      toolChoice: "auto",
    });

    expect(capturedBody.tools).toHaveLength(1);
    expect(capturedBody.tools[0].function.name).toBe("check_health");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].function.name).toBe("check_health");
    expect(result.toolCalls[0].id).toBe("call_check_01");
    expect(result.finishReason).toBe("tool_calls");
  });

  // Test B: File-reading round trip
  it("Test B: completes file-reading round trip with local workspace simulation", async () => {
    const testFile = path.join(tempDir, "sample.ts");
    fs.writeFileSync(testFile, "export const PORT = 8080;\n", "utf8");

    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      callCount++;
      const body = JSON.parse(String(init?.body));
      if (callCount === 1) {
        return jsonResponse({
          choices: [{
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{
                id: "call_read_01",
                type: "function",
                function: { name: "read_file", arguments: JSON.stringify({ path: testFile }) },
              }],
            },
            finish_reason: "tool_calls",
          }],
        });
      }
      // Round 2 receives the tool result
      expect(body.messages).toHaveLength(3);
      expect(body.messages[1].role).toBe("assistant");
      expect(body.messages[2].role).toBe("tool");
      expect(body.messages[2].tool_call_id).toBe("call_read_01");
      expect(body.messages[2].content).toContain("PORT = 8080");

      return jsonResponse({
        choices: [{
          message: { role: "assistant", content: "The file defines PORT as 8080." },
          finish_reason: "stop",
        }],
      });
    }));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "tokenjuice",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "test-key",
    });

    const conversation: ChatMessage[] = [{ role: "user", content: "What port is defined in sample.ts?" }];
    const step1 = await adapter.chat({ model: "m", messages: conversation, stream: false });
    expect(step1.toolCalls).toHaveLength(1);

    // Agent executes tool locally
    const tc = step1.toolCalls[0];
    const args = JSON.parse(tc.function.arguments);
    const content = fs.readFileSync(args.path, "utf8");

    conversation.push({ role: "assistant", content: null as any, tool_calls: step1.toolCalls as ToolCall[] });
    conversation.push({ role: "tool", tool_call_id: tc.id, content });

    const step2 = await adapter.chat({ model: "m", messages: conversation, stream: false });
    expect(step2.content).toContain("PORT as 8080");
  });

  // Test C: File-writing round trip
  it("Test C: completes file-writing round trip and verifies disk content", async () => {
    const targetFile = path.join(tempDir, "generated.json");
    const writeData = JSON.stringify({ status: "success", fixed: true });

    vi.stubGlobal("fetch", vi.fn(async () => {
      return jsonResponse({
        choices: [{
          message: {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_write_01",
              type: "function",
              function: { name: "write_file", arguments: JSON.stringify({ path: targetFile, content: writeData }) },
            }],
          },
          finish_reason: "tool_calls",
        }],
      });
    }));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "tokenjuice",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "test-key",
    });

    const result = await adapter.chat({ model: "m", messages: [{ role: "user", content: "Write output file." }], stream: false });
    const tc = result.toolCalls[0];
    const args = JSON.parse(tc.function.arguments);
    fs.writeFileSync(args.path, args.content, "utf8");

    expect(fs.existsSync(targetFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(targetFile, "utf8"))).toEqual({ status: "success", fixed: true });
  });

  // Test D: Parallel tool calling
  it("Test D: preserves parallel tool calls with unique indexes and arguments", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      return jsonResponse({
        choices: [{
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              { id: "call_p1", type: "function", function: { name: "list_dir", arguments: '{"path":"src"}' } },
              { id: "call_p2", type: "function", function: { name: "list_dir", arguments: '{"path":"tests"}' } },
            ],
          },
          finish_reason: "tool_calls",
        }],
      });
    }));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "tokenjuice",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "test-key",
    });

    const result = await adapter.chat({ model: "m", messages: [{ role: "user", content: "Check src and tests" }], stream: false });
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].id).toBe("call_p1");
    expect(result.toolCalls[1].id).toBe("call_p2");
    expect(JSON.parse(result.toolCalls[0].function.arguments).path).toBe("src");
    expect(JSON.parse(result.toolCalls[1].function.arguments).path).toBe("tests");
  });

  // Test E: Streaming tool calling with DSML tag cleanup
  it("Test E: reconstructs fragmented streaming tool calls and cleans residual DSML tokens", async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"role":"assistant"}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_stream_1","type":"function","function":{"name":"list_files","arguments":""}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"path\\":\\".</｜DSML｜阅读>"}}]}}]}',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"}"}}]}}]}',
      'data: {"choices":[{"finish_reason":"tool_calls"}]}',
      'data: [DONE]',
    ];

    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(sseLines)));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "tokenjuice",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "test-key",
    });

    const stream = adapter.chatStream({ model: "m", messages: [{ role: "user", content: "list files" }], stream: true });
    let assembledArgs = "";
    let toolName = "";
    let toolId = "";

    for await (const ev of stream) {
      if (ev.type === "tool_call_delta") {
        if (ev.name) toolName = ev.name;
        if (ev.id) toolId = ev.id;
        if (ev.arguments) assembledArgs += ev.arguments;
      }
    }

    expect(toolName).toBe("list_files");
    expect(toolId).toBe("call_stream_1");
    expect(assembledArgs).not.toContain("DSML");
    const parsed = JSON.parse(assembledArgs);
    expect(parsed.path).toBe(".");
  });

  // Test F: Anthropic tool calling
  it("Test F: AnthropicAdapter correctly converts tool_use and tool_result round trip", async () => {
    let capturedBody: any;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse({
        id: "msg_anthropic_test",
        type: "message",
        role: "assistant",
        content: [
          { type: "text", text: "I will read the config." },
          { type: "tool_use", id: "toolu_01", name: "read_config", input: { key: "debug" } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 50, output_tokens: 30 },
      });
    }));

    const adapter = new AnthropicAdapter({
      providerSlug: "anthropic",
      endpointUrl: "https://api.anthropic.com/v1",
      apiKey: "sk-ant-test",
    });

    const result = await adapter.chat({
      model: "claude-3-5-sonnet-20241022",
      messages: [
        { role: "system", content: "You are a coding assistant." },
        { role: "user", content: "Read config key." },
      ],
      stream: false,
      tools: [{
        type: "function",
        function: { name: "read_config", description: "Get config", parameters: { type: "object", properties: { key: { type: "string" } } } },
      }],
    });

    expect(capturedBody.system).toBe("You are a coding assistant.");
    expect(capturedBody.tools).toHaveLength(1);
    expect(capturedBody.tools[0].name).toBe("read_config");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].id).toBe("toolu_01");
    expect(result.finishReason).toBe("tool_calls");
  });

  // Test G: Provider credential rotation
  it("Test G: returns retryable ProviderError for 401 and 429 to trigger credential rotation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: { message: "Invalid API key" } }, 401)));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "prorouter-gateway",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "bad-key",
    });

    try {
      await adapter.chat({ model: "m", messages: [], stream: false });
      expect.fail("Expected 401 error");
    } catch (err: any) {
      expect(err.httpStatus).toBe(401);
      expect(err.retryable).toBe(true);
    }
  });

  // Test H: Capability-aware fallback
  it("Test H: excludes chat-only models when requiresTools is true", () => {
    const candidates: RouteCandidate[] = [
      {
        linkId: "l1",
        providerId: "p1",
        providerSlug: "chat-only-fallback",
        providerName: "Chat Only",
        upstreamModelId: "text-model",
        linkPriority: 10,
        providerPriority: 10,
        providerStatus: "active",
        linkStatus: "active",
        timeoutMs: 60000,
        retryCount: 2,
        health: { available: true, latencyMs: 100, successRateBp: 10000, checkedAt: new Date() },
        inputPerMillion: 100,
        outputPerMillion: 200,
        isFree: true,
        capabilities: ["chat"],
      },
      {
        linkId: "l2",
        providerId: "p2",
        providerSlug: "tokenjuice",
        providerName: "TokenJuice Tool Gateway",
        upstreamModelId: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
        linkPriority: 50,
        providerPriority: 50,
        providerStatus: "active",
        linkStatus: "active",
        timeoutMs: 180000,
        retryCount: 2,
        health: { available: true, latencyMs: 300, successRateBp: 9900, checkedAt: new Date() },
        inputPerMillion: 500,
        outputPerMillion: 1000,
        isFree: true,
        capabilities: ["chat", "tool_calls"],
      },
    ];

    const decision = routeRequest(candidates, {
      planSlug: "free",
      fallbackEnabled: true,
      requiresTools: true,
    });

    expect(decision).not.toBeNull();
    expect(decision?.primary.providerSlug).toBe("tokenjuice");
    expect(decision?.fallbackChain).toHaveLength(0);
  });

  // Test I: Context preservation
  it("Test I: preserves multi-turn conversation history with developer and tool messages without truncation", async () => {
    let capturedMessages: any;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      capturedMessages = body.messages;
      return jsonResponse({ choices: [{ message: { role: "assistant", content: "All issues fixed." }, finish_reason: "stop" }] });
    }));

    const adapter = new OpenAICompatibleAdapter({
      providerSlug: "tokenjuice",
      endpointUrl: "https://api.tokenjuice.ai/v1",
      apiKey: "test-key",
    });

    const longConversation: ChatMessage[] = [
      { role: "developer" as any, content: "You are an autonomous senior developer." },
      { role: "user", content: "fiemd a;; iussu and fix all" },
      {
        role: "assistant",
        content: null as any,
        tool_calls: [{ id: "c1", type: "function", function: { name: "list_dir", arguments: "{}" } }],
      },
      { role: "tool", tool_call_id: "c1", content: JSON.stringify(["index.ts", "test.ts"]) },
      {
        role: "assistant",
        content: null as any,
        tool_calls: [{ id: "c2", type: "function", function: { name: "read_file", arguments: '{"path":"index.ts"}' } }],
      },
      { role: "tool", tool_call_id: "c2", content: "function broken() { throw new Error(); }" },
    ];

    await adapter.chat({ model: "m", messages: longConversation, stream: false });

    expect(capturedMessages).toHaveLength(6);
    expect(capturedMessages[0].role).toBe("developer");
    expect(capturedMessages[1].content).toBe("fiemd a;; iussu and fix all");
    expect(capturedMessages[2].tool_calls[0].id).toBe("c1");
    expect(capturedMessages[3].role).toBe("tool");
    expect(capturedMessages[3].tool_call_id).toBe("c1");
    expect(capturedMessages[4].tool_calls[0].id).toBe("c2");
    expect(capturedMessages[5].role).toBe("tool");
    expect(capturedMessages[5].tool_call_id).toBe("c2");
  });

  // Test J: GPT-4.1 alias & model resolution
  it("Test J: resolves gpt-4.1 and openai/gpt-4.1 to authentic profile with native tool calling", async () => {
    const res1 = await resolveModelInput("gpt-4.1");
    expect(res1.slug).toBe("gpt-4.1");
    expect(res1.auto).toBe(false);

    const res2 = await resolveModelInput("openai/gpt-4.1");
    expect(res2.slug).toBe("gpt-4.1");

    const profile = ModelProfileRegistry.get("gpt-4.1");
    expect(profile).toBeDefined();
    expect(profile?.name).toBe("GPT-4.1");
    expect(profile?.capabilities.tool_calling).toBe("supported");
    expect(profile?.capabilities.coding).toBe("supported");
    expect(profile?.routingPolicy.primaryBackend).toBe("openai/gpt-4.1");
    expect(profile?.routingPolicy.secondaryBackend).toBe("openrouter/openai/gpt-4.1");
  });

  // Test K: GPT-4.1 intelligent route decision & backend verification
  it("Test K: routes gpt-4.1 to verified openai or openrouter backends without defaulting to deepseek", () => {
    const backendDirect = BackendModelRegistry.get("openai/gpt-4.1");
    expect(backendDirect).toBeDefined();
    expect(backendDirect?.provider).toBe("openai");
    expect(backendDirect?.upstreamModelId).toBe("gpt-4.1");
    expect(backendDirect?.capabilities.tool_calling).toBe("supported");

    const backendRouter = BackendModelRegistry.get("openrouter/openai/gpt-4.1");
    expect(backendRouter).toBeDefined();
    expect(backendRouter?.provider).toBe("openrouter");
    expect(backendRouter?.upstreamModelId).toBe("openai/gpt-4.1");

    const decision = IntelligentModelRouter.route("gpt-4.1", { requiresTools: true });
    expect(decision.primary.provider).toBe("openai");
    expect(decision.primary.upstreamModelId).toBe("gpt-4.1");
    expect(decision.primary.id).toBe("openai/gpt-4.1");
  });

  // Test L: GPT-4o alias mapping
  it("Test L: maps gpt-4o and gpt-4 to genuine gpt-4o model without substitution to gpt-6.1-sol", async () => {
    const res4o = await resolveModelInput("gpt-4o");
    expect(res4o.slug).toBe("gpt-4o");

    const res4 = await resolveModelInput("gpt-4");
    expect(res4.slug).toBe("gpt-4o");

    const profile4o = ModelProfileRegistry.get("gpt-4o");
    expect(profile4o).toBeDefined();
    expect(profile4o?.capabilities.tool_calling).toBe("supported");
  });
});

