import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const savedEnv: Record<string, string | undefined> = {};

type V1Route = typeof import("../apps/web/app/v1/[...path]/route");
let route: V1Route;

function jsonRequest(path: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/v1${path}`, {
    method: "POST",
    headers: new Headers({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
}

function sseResponse(chunks: string[]): Response {
  const body = chunks
    .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
    .join("") + "data: [DONE]\n\n";
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function chunk(delta: Record<string, unknown>, finish: string | null = null) {
  return {
    id: "chatcmpl-test",
    object: "chat.completion.chunk",
    model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
    choices: [{ index: 0, delta, finish_reason: finish }],
  };
}

async function readAll(res: Response): Promise<string> {
  return await res.text();
}

beforeAll(async () => {
  for (const key of [
    "API_BASE_URL",
    "NEXT_PUBLIC_API_URL",
    "PROROUTER_ENABLE_DEMO_GATEWAY",
    "PROVIDER_PROROUTER_GATEWAY_API_KEY",
  ]) {
    savedEnv[key] = process.env[key];
  }
  delete process.env.API_BASE_URL;
  delete process.env.NEXT_PUBLIC_API_URL;
  process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "true";
  process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY = "key-a,key-b";
  route = await import("../apps/web/app/v1/[...path]/route");
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.unstubAllGlobals();
});

beforeEach(() => {
  process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "true";
  vi.unstubAllGlobals();
});

describe("finish_reason normalization", () => {
  it("marks tool_calls when the upstream says stop after emitting tools", () => {
    expect(route.normalizeFinishReason("stop", true)).toBe("tool_calls");
    expect(route.normalizeFinishReason("stop", false)).toBe("stop");
    expect(route.normalizeFinishReason(undefined, true)).toBe("tool_calls");
    expect(route.normalizeFinishReason(undefined, false)).toBe("stop");
    expect(route.normalizeFinishReason("length", true)).toBe("length");
  });
});

describe("model honesty headers", () => {
  it("labels requested and served models and flags substitutions", () => {
    const substituted = route.modelHonestyHeaders("deepseek-v4.1-flash", "deepseek-ai/DeepSeek-V4.1-Flash-1017");
    expect(substituted["x-prorouter-requested-model"]).toBe("deepseek-v4.1-flash");
    expect(substituted["x-prorouter-served-model"]).toBe("deepseek-ai/DeepSeek-V4.1-Flash-1017");
    expect(substituted["x-prorouter-model-substituted"]).toBe("true");

    const identical = route.modelHonestyHeaders("pr-echo", "pr-echo");
    expect(identical["x-prorouter-model-substituted"]).toBeUndefined();
  });
});

describe("key rotation", () => {
  it("rotates across the pool and skips cooling keys", () => {
    process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY = "rot-a,rot-b";
    try {
      route.markGatewayCooldown("rot-b", 60_000);
      expect(route.getNextGatewayKey()).toBe("rot-a");
      expect(route.getNextGatewayKey()).toBe("rot-a");
      route.markGatewayCooldown("rot-a", 60_000);
      expect(route.getNextGatewayKey()).toBeTruthy();
    } finally {
      process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY = "key-a,key-b";
    }
  });
});

describe("StreamChunkProcessor", () => {
  it("holds split think tags across chunk boundaries", () => {
    const processor = new route.StreamChunkProcessor();
    const first = processor.processDelta({ content: "<thi" }, "m", "o");
    expect(first.content).toBeUndefined();
    const second = processor.processDelta({ content: "nk>hidden</thi" }, "m", "o");
    expect(second.content).toBeUndefined();
    expect(second.reasoning_content).toBe("hidden");
    const third = processor.processDelta({ content: "nk>Hello" }, "m", "o");
    expect(third.content).toBe("Hello");
    expect(third.reasoning_content).toBeUndefined();
  });

  it("flushes a held literal suffix at end of stream", () => {
    const processor = new route.StreamChunkProcessor();
    expect(processor.processDelta({ content: "a <" }, "m", "o").content).toBe("a ");
    const tail = processor.flushDelta();
    expect(tail.content).toBe("<");
  });
});

describe("local gateway responses", () => {
  it("reports served model and normalized finish_reason for tool calls", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ id: "call_1", type: "function", function: { name: "read_file", arguments: "{}" } }],
        },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const res = await route.POST(jsonRequest("/chat/completions", {
      model: "deepseek-v4.1-flash",
      messages: [{ role: "user", content: "hi" }],
    }), { params: Promise.resolve({ path: ["chat", "completions"] }) });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-prorouter-requested-model")).toBe("deepseek-v4.1-flash");
    expect(res.headers.get("x-prorouter-served-model")).toBe("deepseek-ai/DeepSeek-V4.1-Flash-1017");
    expect(res.headers.get("x-prorouter-model-substituted")).toBe("true");
    const body = await res.json();
    expect(body.choices[0].finish_reason).toBe("tool_calls");
    expect(body.model).toBe("deepseek-v4.1-flash");
  });

  it("streams split tags without leaking them and labels the served model", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse([
      chunk({ role: "assistant", content: "<thi" }),
      chunk({ content: "nk>thinking</thi" }),
      chunk({ content: "nk>Hello" }),
      chunk({}, "stop"),
    ])));

    const res = await route.POST(jsonRequest("/chat/completions", {
      model: "deepseek-v4.1-flash",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    }), { params: Promise.resolve({ path: ["chat", "completions"] }) });

    expect(res.status).toBe(200);
    const text = await readAll(res);
    expect(text).not.toContain("<think");
    expect(text).toContain("thinking");
    expect(text).toContain("Hello");
    expect(text).toContain("prorouter_served_model");
    expect(text).toContain("deepseek-ai/DeepSeek-V4.1-Flash-1017");
  });

  it("buffers split Anthropic SSE lines and reports upstream usage", async () => {
    const encoder = new TextEncoder();
    const parts = [
      'data: {"id":"chatcmpl-split","object":"chat.completion.chunk","model":"m","choices":[{"index":0,"delta":{"content":"Hel',
      'lo"},"finish_reason":null}]}\n\ndata: {"id":"chatcmpl-split","object":"chat.completion.chunk","model":"m","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: {"id":"chatcmpl-split","object":"chat.completion.chunk","model":"m","choices":[],"usage":{"prompt_tokens":123,"completion_tokens":45}}\n\ndata: [DONE]\n\n',
    ];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({
      start(controller) {
        for (const part of parts) controller.enqueue(encoder.encode(part));
        controller.close();
      },
    }), { status: 200, headers: { "content-type": "text/event-stream" } })));

    const res = await route.POST(jsonRequest("/messages", {
      model: "deepseek-v4.1-flash",
      max_tokens: 64,
      messages: [{ role: "user", content: "hi" }],
      stream: true,
    }), { params: Promise.resolve({ path: ["messages"] }) });

    expect(res.status).toBe(200);
    const text = await readAll(res);
    expect(text).toContain('"text_delta"');
    expect(text).toContain("Hello");
    expect(text).toContain('"input_tokens":123');
    expect(text).toContain('"output_tokens":45');
    expect(text).toContain('"message_stop"');
  });

  it("routes non-streaming Anthropic messages through Requesty when the gateway is down", async () => {
    const previous = process.env.PROVIDER_REQUESTY_API_KEY;
    process.env.PROVIDER_REQUESTY_API_KEY = "req-test-key";
    try {
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("router.requesty.ai")) {
          return new Response(JSON.stringify({
            id: "chatcmpl-requesty",
            object: "chat.completion",
            model: "mistral/leanstral-1-5",
            choices: [{
              index: 0,
              message: { role: "assistant", content: "from-requesty" },
              finish_reason: "stop",
            }],
            usage: { prompt_tokens: 9, completion_tokens: 4, total_tokens: 13 },
          }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: { message: "down" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }));

      const res = await route.POST(jsonRequest("/messages", {
        model: "mistral/leanstral-1-5",
        max_tokens: 64,
        messages: [{ role: "user", content: "hi" }],
      }), { params: Promise.resolve({ path: ["messages"] }) });

      expect(res.status).toBe(200);
      expect(res.headers.get("x-prorouter-served-model")).toBe("mistral/leanstral-1-5");
      const body = await res.json();
      expect(body.content[0]).toMatchObject({ type: "text", text: "from-requesty" });
      expect(body.stop_reason).toBe("end_turn");
      expect(body.usage).toMatchObject({ input_tokens: 9, output_tokens: 4 });
    } finally {
      if (previous === undefined) delete process.env.PROVIDER_REQUESTY_API_KEY;
      else process.env.PROVIDER_REQUESTY_API_KEY = previous;
    }
  });

  it("streams Anthropic tool_use blocks with input_json_delta and tool_use stop reason", async () => {
    const events = [
      chunk({
        role: "assistant",
        tool_calls: [{
          index: 0,
          id: "call_1",
          type: "function",
          function: { name: "read_file", arguments: "" },
        }],
      }),
      chunk({ tool_calls: [{ index: 0, function: { arguments: '{"path":"a.txt"}' } }] }),
      chunk({}, "tool_calls"),
      {
        id: "chatcmpl-tools",
        object: "chat.completion.chunk",
        model: "m",
        choices: [],
        usage: { prompt_tokens: 11, completion_tokens: 7 },
      },
    ];
    const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    })));

    const res = await route.POST(jsonRequest("/messages", {
      model: "deepseek-v4.1-flash",
      max_tokens: 64,
      messages: [{ role: "user", content: "read a.txt" }],
      tools: [{ name: "read_file", description: "Read a file", input_schema: { type: "object" } }],
      stream: true,
    }), { params: Promise.resolve({ path: ["messages"] }) });

    expect(res.status).toBe(200);
    const text = await readAll(res);
    expect(text).toContain('"type":"tool_use"');
    expect(text).toContain('"id":"call_1"');
    expect(text).toContain('"name":"read_file"');
    expect(text).toContain('"input_json_delta"');
    expect(text).toContain("a.txt");
    expect(text).toContain('"stop_reason":"tool_use"');
    expect(text).toContain('"message_stop"');
  });

  it("converts non-streaming tool calls to Anthropic tool_use blocks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      id: "chatcmpl-tools",
      object: "chat.completion",
      model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{
            id: "call_2",
            type: "function",
            function: { name: "read_file", arguments: '{"path":"b.txt"}' },
          }],
        },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    }), { status: 200, headers: { "content-type": "application/json" } })));

    const res = await route.POST(jsonRequest("/messages", {
      model: "deepseek-v4.1-flash",
      max_tokens: 64,
      messages: [{ role: "user", content: "read b.txt" }],
      tools: [{ name: "read_file", description: "Read a file", input_schema: { type: "object" } }],
    }), { params: Promise.resolve({ path: ["messages"] }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toEqual([
      { type: "tool_use", id: "call_2", name: "read_file", input: { path: "b.txt" } },
    ]);
    expect(body.stop_reason).toBe("tool_use");
    expect(body.usage).toMatchObject({ input_tokens: 5, output_tokens: 2 });
  });
});