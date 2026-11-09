import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const savedEnv: Record<string, string | undefined> = {};

type V1Route = typeof import("../apps/web/app/v1/[...path]/route");
let route: V1Route;

function request(
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): NextRequest {
  return new NextRequest(`http://localhost/v1${path}`, {
    method: init.method || "GET",
    headers: new Headers(init.headers),
    body: init.body,
  });
}

function jsonRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function completionResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      model: "pr-echo",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "ok" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
      ...overrides,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-request-id": "req_abc123",
        "x-prorouter-usage-source": "upstream",
      },
    },
  );
}

beforeAll(async () => {
  for (const key of [
    "API_BASE_URL",
    "NEXT_PUBLIC_API_URL",
    "PROROUTER_ENABLE_DEMO_GATEWAY",
    "NODE_ENV",
  ]) {
    savedEnv[key] = process.env[key];
  }
  process.env.API_BASE_URL = "https://backend.test";
  delete process.env.NEXT_PUBLIC_API_URL;
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
  vi.unstubAllGlobals();
  process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "false";
});

describe("public /v1 inference gate (F-01)", () => {
  it("rejects anonymous chat completions when the demo gateway is disabled", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest("/chat/completions", {
        model: "pr-echo",
        messages: [{ role: "user", content: "hi" }],
      }),
      ["chat/completions"],
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("unauthenticated");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats the playground placeholder key as anonymous", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/chat/completions",
        { model: "pr-echo", messages: [{ role: "user", content: "hi" }] },
        { authorization: "Bearer pro_sk_live_playground_default" },
      ),
      ["chat/completions"],
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects anonymous Anthropic messages with an Anthropic-shaped error", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest("/messages", {
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 16,
        messages: [{ role: "user", content: "hi" }],
      }),
      ["messages"],
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.type).toBe("error");
    expect(body.error.type).toBe("authentication_error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards authenticated OpenAI requests to the backend with a bearer token", async () => {
    const fetchMock = vi.fn(async () => completionResponse());
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/chat/completions",
        { model: "pr-echo", messages: [{ role: "user", content: "hi" }], stream: false },
        { authorization: "Bearer pro_sk_test_valid" },
      ),
      ["chat/completions"],
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(target).toBe("https://backend.test/v1/chat/completions");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer pro_sk_test_valid");
    expect(headers.get("x-api-key")).toBeNull();
    const sent = JSON.parse(new TextDecoder().decode(init.body as ArrayBuffer));
    expect(sent.model).toBe("pr-echo");

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_abc123");
    expect(res.headers.get("x-prorouter-usage-source")).toBe("upstream");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.choices[0].message.content).toBe("ok");
  });

  it("preserves a backend 401 for an invalid API key", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "invalid_api_key", message: "Invalid API key provided." },
          }),
          { status: 401, headers: { "content-type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/chat/completions",
        { model: "pr-echo", messages: [{ role: "user", content: "hi" }] },
        { authorization: "Bearer pro_sk_test_invalid" },
      ),
      ["chat/completions"],
    );

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_api_key");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("returns a 503 when the backend is unreachable", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/chat/completions",
        { model: "pr-echo", messages: [{ role: "user", content: "hi" }] },
        { authorization: "Bearer pro_sk_test_valid" },
      ),
      ["chat/completions"],
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("provider_unavailable");
  });

  it("lets anonymous requests reach the local demo when the demo gateway is enabled", async () => {
    process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      request("/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      }),
      ["chat/completions"],
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toBe("Invalid JSON body");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("GET /v1/models catalog source", () => {
  it("proxies the catalog to the backend for API-key callers", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            object: "list",
            data: [{ id: "pr-zenith", object: "model", owned_by: "prorouter" }],
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-request-id": "req_models",
            },
          },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      request("/models", { headers: { authorization: "Bearer pro_sk_test_valid" } }),
      ["models"],
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(target).toBe("https://backend.test/v1/models");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer pro_sk_test_valid");
    expect(headers.get("x-api-key")).toBeNull();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("req_models");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.data).toEqual([
      { id: "pr-zenith", object: "model", owned_by: "prorouter" },
    ]);
  });

  it("serves the local catalog to anonymous callers without touching the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(request("/models"), ["models"]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const body = await res.json();
    expect(body.object).toBe("list");
    expect(body.data).toHaveLength(route.ALL_MODELS.length);
    expect(body.data[0].id).toBe(route.ALL_MODELS[0].id);
  });

  it("serves the local catalog to session-only callers", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      request("/models", { headers: { cookie: "uno_session=signed-session-value" } }),
      ["models"],
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(route.ALL_MODELS.length);
  });

  it("returns a 503 when the catalog backend is unreachable", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      request("/models", { headers: { "x-api-key": "pro_sk_test_valid" } }),
      ["models"],
    );

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error.code).toBe("provider_unavailable");
  });
});

describe("Anthropic /v1/messages compatibility proxy", () => {
  it("converts tools, system prompts, and responses", async () => {
    const fetchMock = vi.fn(async (_target: string, _init: RequestInit) =>
      completionResponse({
        model: "claude-sonnet",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Reading the file.",
              tool_calls: [
                {
                  id: "toolu_upstream_1",
                  type: "function",
                  function: { name: "read_file", arguments: '{"path":"a.txt"}' },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/messages",
        {
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 128,
          stream: false,
          system: [
            { type: "text", text: "You are helpful." },
            { type: "text", text: "Be terse." },
          ],
          messages: [{ role: "user", content: "Read a.txt" }],
          tools: [
            {
              name: "read_file",
              description: "Read a file",
              input_schema: {
                type: "object",
                properties: { path: { type: "string" } },
                required: ["path"],
              },
            },
          ],
          tool_choice: { type: "any" },
        },
        { "x-api-key": "pro_sk_test_anthropic", "anthropic-version": "2023-06-01" },
      ),
      ["messages"],
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe("https://backend.test/v1/chat/completions");
    const headers = init.headers as Headers;
    expect(headers.get("authorization")).toBe("Bearer pro_sk_test_anthropic");
    expect(headers.get("x-api-key")).toBeNull();
    expect(headers.get("anthropic-version")).toBeNull();
    const sent = JSON.parse(String(init.body));
    expect(sent.model).toBe("claude-sonnet");
    expect(sent.messages[0]).toEqual({
      role: "system",
      content: "You are helpful.\nBe terse.",
    });
    expect(sent.messages[1]).toEqual({ role: "user", content: "Read a.txt" });
    expect(sent.tools[0].function.name).toBe("read_file");
    expect(sent.tool_choice).toBe("required");
    expect(sent.max_tokens).toBe(128);

    expect(res.status).toBe(200);
    expect(res.headers.get("x-prorouter-requested-model")).toBe("claude-sonnet-4-5-20250929");
    expect(res.headers.get("x-prorouter-served-model")).toBe("claude-sonnet");
    const body = await res.json();
    expect(body.type).toBe("message");
    expect(body.role).toBe("assistant");
    expect(body.model).toBe("claude-sonnet-4-5-20250929");
    expect(body.stop_reason).toBe("tool_use");
    expect(body.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
    const text = body.content.find((b: any) => b.type === "text");
    expect(text.text).toBe("Reading the file.");
    const toolUse = body.content.find((b: any) => b.type === "tool_use");
    expect(toolUse.id).toBe("toolu_upstream_1");
    expect(toolUse.name).toBe("read_file");
    expect(toolUse.input).toEqual({ path: "a.txt" });
  });

  it("streams Anthropic SSE from OpenAI chunks across split lines", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'data: {"choices":[{"delta":{"role":"assistant","content":""}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":" wo',
      'rld"}}]}\n\n' +
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
        'data: {"choices":[],"usage":{"prompt_tokens":7,"completion_tokens":2,"total_tokens":9}}\n\n' +
        "data: [DONE]\n\n",
    ];
    const stream = new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(stream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/messages",
        {
          model: "claude-3-5-haiku-20241022",
          max_tokens: 32,
          stream: true,
          messages: [{ role: "user", content: "hi" }],
        },
        { "x-api-key": "pro_sk_test_anthropic" },
      ),
      ["messages"],
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("event: message_start");
    expect(text).toContain('"text":"Hello"');
    expect(text).toContain('"text":" world"');
    expect(text).toContain("event: message_delta");
    expect(text).toContain('"stop_reason":"end_turn"');
    expect(text).toContain('"output_tokens":2');
    expect(text).toContain("event: message_stop");
    expect(text).not.toContain("[DONE]");

    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe("https://backend.test/v1/chat/completions");
    expect(JSON.parse(String(init.body)).model).toBe("pr-echo");
  });

  it("maps an upstream Anthropic error to an Anthropic error envelope", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: "Model overloaded" } }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await route.handleV1(
      jsonRequest(
        "/messages",
        {
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 8,
          messages: [{ role: "user", content: "hi" }],
        },
        { "x-api-key": "pro_sk_test_anthropic" },
      ),
      ["messages"],
    );

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.type).toBe("error");
    expect(body.error.type).toBe("rate_limit_error");
    expect(body.error.message).toBe("Model overloaded");
  });
});

describe("Anthropic request conversion", () => {
  it("keeps tool results before the following user text", () => {
    const conversion = route.convertAnthropicRequest({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 64,
      messages: [
        {
          role: "assistant",
          content: [
            { type: "text", text: "Calling the tool." },
            { type: "tool_use", id: "toolu_1", name: "read_file", input: { path: "a.txt" } },
          ],
        },
        {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "toolu_1", content: "file body" },
            { type: "text", text: "Thanks." },
          ],
        },
      ],
    });

    expect(conversion.backendModel).toBe("claude-sonnet");
    expect(conversion.convertedMessages).toHaveLength(3);
    expect(conversion.convertedMessages[0]).toMatchObject({
      role: "assistant",
      content: "Calling the tool.",
    });
    expect((conversion.convertedMessages[0] as any).tool_calls[0].function).toEqual({
      name: "read_file",
      arguments: '{"path":"a.txt"}',
    });
    expect(conversion.convertedMessages[1]).toEqual({
      role: "tool",
      tool_call_id: "toolu_1",
      content: "file body",
    });
    expect(conversion.convertedMessages[2]).toEqual({ role: "user", content: "Thanks." });
  });

  it("maps Claude families onto backend aliases", () => {
    expect(route.mapAnthropicModelToBackend("claude-opus-4-1")).toBe("pr-zenith");
    expect(route.mapAnthropicModelToBackend("claude-3-5-haiku-20241022")).toBe("pr-echo");
    expect(route.mapAnthropicModelToBackend("claude-sonnet-4-5-20250929")).toBe("claude-sonnet");
    expect(route.mapAnthropicModelToBackend("pr-echo")).toBe("pr-echo");
  });
});

describe("demo gateway switch", () => {
  it("defaults on outside production and honors explicit overrides", () => {
    const original = process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
    try {
      delete process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
      expect(route.isDemoGatewayEnabled()).toBe(process.env.NODE_ENV !== "production");
      process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "yes";
      expect(route.isDemoGatewayEnabled()).toBe(true);
      process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "0";
      expect(route.isDemoGatewayEnabled()).toBe(false);
    } finally {
      if (original === undefined) delete process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
      else process.env.PROROUTER_ENABLE_DEMO_GATEWAY = original;
    }
  });
});

describe("missing backend configuration", () => {
  it("returns 503 for an authenticated request when no backend base is set", async () => {
    const previousApiBase = process.env.API_BASE_URL;
    const previousPublicBase = process.env.NEXT_PUBLIC_API_URL;
    process.env.API_BASE_URL = "";
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.resetModules();
    try {
      const fresh = await import("../apps/web/app/v1/[...path]/route");
      const res = await fresh.handleV1(
        jsonRequest(
          "/chat/completions",
          { model: "pr-echo", messages: [{ role: "user", content: "hi" }] },
          { authorization: "Bearer pro_sk_test_valid" },
        ),
        ["chat/completions"],
      );
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error.code).toBe("provider_unavailable");
    } finally {
      process.env.API_BASE_URL = previousApiBase;
      if (previousPublicBase === undefined) delete process.env.NEXT_PUBLIC_API_URL;
      else process.env.NEXT_PUBLIC_API_URL = previousPublicBase;
      vi.resetModules();
    }
  });
});
