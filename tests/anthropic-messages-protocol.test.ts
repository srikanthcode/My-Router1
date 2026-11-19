import { describe, it, expect, beforeAll } from "vitest";
import {
  convertAnthropicMessagesToCanonical,
  convertAnthropicToolsToOpenAI,
  convertAnthropicToolChoiceToOpenAI,
} from "../apps/api/src/routes/messages.js";
import { buildApp } from "../apps/api/src/app.js";

describe("Anthropic Messages Protocol & Claude Code Integration", () => {
  it("converts Anthropic system prompt string to canonical system message", () => {
    const messages = [{ role: "user", content: "hello" }];
    const canonical = convertAnthropicMessagesToCanonical(messages, "You are Claude Code");
    expect(canonical).toHaveLength(2);
    expect(canonical[0]).toEqual({ role: "system", content: "You are Claude Code" });
    expect(canonical[1]).toEqual({ role: "user", content: "hello" });
  });

  it("converts Anthropic system prompt array to unified string", () => {
    const messages = [{ role: "user", content: "inspect project" }];
    const system = [
      { type: "text", text: "You are an autonomous engineer." },
      { type: "text", text: "Follow all coding standards." },
    ];
    const canonical = convertAnthropicMessagesToCanonical(messages, system);
    expect(canonical).toHaveLength(2);
    expect(canonical[0].role).toBe("system");
    expect(canonical[0].content).toContain("autonomous engineer");
    expect(canonical[0].content).toContain("coding standards");
  });

  it("converts Anthropic tool definitions to OpenAI format", () => {
    const anthropicTools = [
      {
        name: "read_file",
        description: "Read workspace file",
        input_schema: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
      },
    ];
    const openAiTools = convertAnthropicToolsToOpenAI(anthropicTools) as any[];
    expect(openAiTools).toHaveLength(1);
    expect(openAiTools[0].type).toBe("function");
    expect(openAiTools[0].function.name).toBe("read_file");
    expect(openAiTools[0].function.description).toBe("Read workspace file");
    expect(openAiTools[0].function.parameters.required).toEqual(["path"]);
  });

  it("converts Anthropic tool_choice to OpenAI format", () => {
    expect(convertAnthropicToolChoiceToOpenAI({ type: "auto" })).toBe("auto");
    expect(convertAnthropicToolChoiceToOpenAI({ type: "any" })).toBe("required");
    expect(convertAnthropicToolChoiceToOpenAI({ type: "tool", name: "execute_command" })).toEqual({
      type: "function",
      function: { name: "execute_command" },
    });
  });

  it("converts tool_use blocks in assistant messages to canonical tool_calls", () => {
    const messages = [
      {
        role: "assistant",
        content: [
          { type: "text", text: "Let me inspect the file." },
          {
            type: "tool_use",
            id: "toolu_123",
            name: "read_file",
            input: { path: "package.json" },
          },
        ],
      },
    ];
    const canonical = convertAnthropicMessagesToCanonical(messages) as any[];
    expect(canonical).toHaveLength(1);
    expect(canonical[0].role).toBe("assistant");
    expect(canonical[0].content).toBe("Let me inspect the file.");
    expect(canonical[0].tool_calls).toHaveLength(1);
    expect(canonical[0].tool_calls[0].id).toBe("toolu_123");
    expect(canonical[0].tool_calls[0].function.name).toBe("read_file");
    expect(canonical[0].tool_calls[0].function.arguments).toBe('{"path":"package.json"}');
  });

  it("converts tool_result blocks in user messages to canonical tool messages", () => {
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_123",
            content: '{"name": "my-app", "version": "1.0.0"}',
          },
        ],
      },
    ];
    const canonical = convertAnthropicMessagesToCanonical(messages);
    expect(canonical).toHaveLength(1);
    expect(canonical[0].role).toBe("tool");
    expect((canonical[0] as any).tool_call_id).toBe("toolu_123");
    expect(canonical[0].content).toContain('"name": "my-app"');
  });
});

describe("Model Discovery Capability Metadata for Coding Agents", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });

  it("GET /v1/models returns context_length, max_completion_tokens, supported_parameters and tool_calls capability", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/models",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.object).toBe("list");
    expect(Array.isArray(body.data)).toBe(true);

    if (body.data.length > 0) {
      const first = body.data[0];
      expect(first).toHaveProperty("context_length");
      expect(first).toHaveProperty("max_completion_tokens");
      expect(first).toHaveProperty("supported_parameters");
      expect(first.supported_parameters).toContain("tools");
      expect(first.supported_parameters).toContain("tool_choice");
      expect(first.capabilities).toHaveProperty("tool_calls");
    }
  });

  it("GET /v1/models/:id returns enriched tool-calling capabilities and context window", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/models/gpt-4.1",
    });
    // If gpt-4.1 exists in catalog or profile registry
    if (res.statusCode === 200) {
      const model = res.json();
      expect(model.id).toBe("gpt-4.1");
      expect(model.context_length).toBeGreaterThan(0);
      expect(model.supported_parameters).toContain("tools");
      expect(model.capabilities.tool_calls).toBe(true);
    }
  });
});
