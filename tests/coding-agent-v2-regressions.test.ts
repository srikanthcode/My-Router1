import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { FreemodelsAdapter } from "../packages/providers/src/freemodels";
import { OpenAICompatibleAdapter } from "../packages/providers/src/openai";
import { ProviderError } from "../packages/providers/src/adapter";
import { isAgentOrStructuredRequest as webIsAgent } from "../apps/web/lib/coding-intent";
import { isAgentOrStructuredRequest as routingIsAgent, ModelAliasRegistry } from "../packages/routing/src/index";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Coding Agent v2 Reliability & Fallback Regressions", () => {
  it("detects XML-mode coding agents (Kilo Code / Cline without tools) and Stainless SDK headers", () => {
    const xmlBody = {
      model: "deepseek-v4.1-flash",
      messages: [
        { role: "system", content: "You are Kilo Code. Respond using <write_to_file><path>...</path></write_to_file>." },
        { role: "user", content: "create hello.txt" },
      ],
    };
    expect(webIsAgent(undefined, xmlBody)).toBe(true);
    expect(routingIsAgent(undefined, xmlBody)).toBe(true);

    const stainlessHeaders = new Headers({
      "user-agent": "OpenAI/JS 4.87.0",
      "x-stainless-lang": "js",
    });
    expect(webIsAgent(stainlessHeaders, { messages: [{ role: "user", content: "hi" }] })).toBe(true);
    expect(routingIsAgent(stainlessHeaders, { messages: [{ role: "user", content: "hi" }] })).toBe(true);
  });

  it("refuses tool-calling requests on FreemodelsAdapter immediately with retryable ProviderError", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new FreemodelsAdapter({
      providerSlug: "freemodels",
      endpointUrl: "https://freemodels-chat.freemodels.workers.dev/v1",
      timeoutMs: 5000,
    });

    const err = await adapter.chat({
      model: "deepseek-v3",
      messages: [{ role: "user", content: "edit file" }],
      stream: false,
      tools: [{ type: "function", function: { name: "write_to_file", parameters: { type: "object", properties: {} } } }],
    }).catch((e) => e);

    expect(err).toBeInstanceOf(ProviderError);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe("unsupported_for_tools");
    expect(fetchMock).not.toHaveBeenCalled();

    const streamErr = await (async () => {
      for await (const _ev of adapter.chatStream({
        model: "deepseek-v3",
        messages: [{ role: "user", content: "edit file" }],
        stream: true,
        tools: [{ type: "function", function: { name: "write_to_file", parameters: { type: "object", properties: {} } } }],
      })) { /* unreachable */ }
    })().catch((e) => e);

    expect(streamErr).toBeInstanceOf(ProviderError);
    expect(streamErr.retryable).toBe(true);
  });

  it("marks 400/402/404 upstream rejections as retryable for cross-provider failover", async () => {
    for (const status of [400, 402, 404]) {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: `err ${status}` } }), { status })));
      const adapter = new OpenAICompatibleAdapter({ providerSlug: "groq", endpointUrl: "https://example.test/v1", apiKey: "k" });
      const err = await adapter.chat({ model: "m", messages: [{ role: "user", content: "hi" }], stream: false }).catch((e) => e);
      expect(err).toBeInstanceOf(ProviderError);
      expect(err.httpStatus).toBe(status);
      expect(err.retryable).toBe(true);
    }
  });

  it("rotates past expired Requesty keys (403) and falls back cleanly on Nabh model restrictions without banning key", async () => {
    const prevReq = process.env.PROVIDER_REQUESTY_API_KEY;
    const prevNabh = process.env.PROVIDER_NABH_API_KEY;
    const prevGw = process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
    const prevDemo = process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
    const prevApi = process.env.API_BASE_URL;

    delete process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
    process.env.API_BASE_URL = "";
    process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "true";
    process.env.PROVIDER_REQUESTY_API_KEY = "bad-1,bad-2,bad-3,bad-4,bad-5,good-req-key";
    process.env.PROVIDER_NABH_API_KEY = "good-nabh-key";

    const seenAuths: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const target = String(url);
      const auth = String((init?.headers as Record<string, string>)?.Authorization || "");
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      seenAuths.push(`${target}|${auth}|${body.model}`);

      if (target.includes("router.requesty.ai")) {
        if (auth.includes("bad-")) {
          return new Response(JSON.stringify({ error: { message: "Invalid authorization token" } }), { status: 403 });
        }
        return new Response(JSON.stringify({
          id: "chatcmpl-ok",
          object: "chat.completion",
          model: body.model,
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: null,
              tool_calls: [{ id: "tc_1", type: "function", function: { name: "write_to_file", arguments: '{"path":"a.txt"}' } }],
            },
            finish_reason: "tool_calls",
          }],
          usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response("unexpected", { status: 500 });
    }));

    try {
      const route = await import("../apps/web/app/v1/[...path]/route");
      const req = new NextRequest("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
        body: JSON.stringify({
          model: "deepseek-v4.1-flash",
          messages: [{ role: "user", content: "create a.txt" }],
          tools: [{ type: "function", function: { name: "write_to_file", parameters: { type: "object", properties: {} } } }],
        }),
      });
      const res = await route.POST(req, { params: Promise.resolve({ path: ["chat", "completions"] }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.choices[0].finish_reason).toBe("tool_calls");
      expect(json.choices[0].message.tool_calls[0].function.name).toBe("write_to_file");
      expect(seenAuths.some((s) => s.includes("good-req-key"))).toBe(true);
    } finally {
      if (prevReq === undefined) delete process.env.PROVIDER_REQUESTY_API_KEY;
      else process.env.PROVIDER_REQUESTY_API_KEY = prevReq;
      if (prevNabh === undefined) delete process.env.PROVIDER_NABH_API_KEY;
      else process.env.PROVIDER_NABH_API_KEY = prevNabh;
      if (prevGw === undefined) delete process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
      else process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY = prevGw;
      if (prevDemo === undefined) delete process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
      else process.env.PROROUTER_ENABLE_DEMO_GATEWAY = prevDemo;
      if (prevApi === undefined) delete process.env.API_BASE_URL;
      else process.env.API_BASE_URL = prevApi;
    }
  });

  it("returns explicit 503 error instead of fabricated ProRouter Developer Solution JS when all upstreams fail", async () => {
    const prevReq = process.env.PROVIDER_REQUESTY_API_KEY;
    const prevNabh = process.env.PROVIDER_NABH_API_KEY;
    const prevGw = process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
    const prevDemo = process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
    const prevApi = process.env.API_BASE_URL;

    delete process.env.PROVIDER_REQUESTY_API_KEY;
    delete process.env.PROVIDER_NABH_API_KEY;
    delete process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
    process.env.API_BASE_URL = "";
    process.env.PROROUTER_ENABLE_DEMO_GATEWAY = "true";

    vi.stubGlobal("fetch", vi.fn(async () => new Response("Service unavailable", { status: 503 })));

    try {
      const route = await import("../apps/web/app/v1/[...path]/route");
      const req = new NextRequest("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: new Headers({ "content-type": "application/json" }),
        body: JSON.stringify({
          model: "deepseek-v4.1-flash",
          messages: [{ role: "user", content: "not good hi" }],
        }),
      });
      const res = await route.POST(req, { params: Promise.resolve({ path: ["chat", "completions"] }) });
      expect(res.status).toBe(503);
      const text = await res.text();
      expect(text).not.toContain("ProRouter Developer Solution");
      expect(text).not.toContain("Interactive App");
    } finally {
      if (prevReq === undefined) delete process.env.PROVIDER_REQUESTY_API_KEY;
      else process.env.PROVIDER_REQUESTY_API_KEY = prevReq;
      if (prevNabh === undefined) delete process.env.PROVIDER_NABH_API_KEY;
      else process.env.PROVIDER_NABH_API_KEY = prevNabh;
      if (prevGw === undefined) delete process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY;
      else process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY = prevGw;
      if (prevDemo === undefined) delete process.env.PROROUTER_ENABLE_DEMO_GATEWAY;
      else process.env.PROROUTER_ENABLE_DEMO_GATEWAY = prevDemo;
      if (prevApi === undefined) delete process.env.API_BASE_URL;
      else process.env.API_BASE_URL = prevApi;
    }
  });

  it("includes live multi-provider tool backends in ModelAliasRegistry fallback chains", () => {
    const resolved = ModelAliasRegistry.resolveToBackend("deepseek-v4.1-flash");
    const ids = resolved.fallbackChain.map((b) => b.id);
    expect(ids).toContain("requesty/nemotron-3.5-lightning-30b-a3b");
    expect(ids).toContain("nabh/gpt-oss-20b");
  });
});
