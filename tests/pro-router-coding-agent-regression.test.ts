import { describe, it, expect } from "vitest";
import { convertAnthropicRequest } from "../apps/web/app/v1/[...path]/route";
import { ModelBehaviorEngine } from "../packages/routing/src/behavior-engine.js";
import { ModelProfileRegistry } from "../packages/routing/src/profile-registry.js";

describe("Coding Agent Protocol & SSE Stream Regression Suite", () => {
  it("preserves exact typo instruction 'find all iuss in this project fix all' without persona or uncertainty injection", () => {
    const profile = ModelProfileRegistry.get("deepseek-v4.1-flash") || ModelProfileRegistry.getAll()[0];
    expect(profile).toBeDefined();

    const incomingMessages = [
      {
        role: "user",
        content: "find all iuss in this project fix all",
      },
    ];

    // Verify ModelBehaviorEngine does not inject uncertainty directives that trigger clarification loops
    const processed = ModelBehaviorEngine.applyBehaviorToMessages(incomingMessages, profile!);
    expect(processed).toHaveLength(1);
    expect(processed[0].role).toBe("user");
    expect(processed[0].content).toBe("find all iuss in this project fix all");
    expect(processed[0].content).not.toContain("Uncertainty: Be completely transparent");
  });

  it("Anthropic Messages adapter correctly forwards coding agent tools to OpenAI format", () => {
    const anthropicPayload = {
      model: "claude-3-7-sonnet-20250219",
      messages: [
        {
          role: "user",
          content: "find all iuss in this project fix all",
        },
      ],
      tools: [
        {
          name: "read_file",
          description: "Read contents of a file from the workspace",
          input_schema: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
            required: ["path"],
          },
        },
        {
          name: "execute_command",
          description: "Run a shell command",
          input_schema: {
            type: "object",
            properties: {
              command: { type: "string" },
            },
            required: ["command"],
          },
        },
      ],
      stream: true,
    };

    const conversion = convertAnthropicRequest(anthropicPayload);
    expect(conversion.openAiPayload.tools).toBeDefined();
    expect(Array.isArray(conversion.openAiPayload.tools)).toBe(true);
    expect(conversion.openAiPayload.tools).toHaveLength(2);

    const readTool = (conversion.openAiPayload.tools as any[])[0];
    expect(readTool.type).toBe("function");
    expect(readTool.function.name).toBe("read_file");
    expect(readTool.function.parameters.properties.path.type).toBe("string");
  });

  it("Anthropic Messages adapter preserves multi-turn tool execution history", () => {
    const multiTurnPayload = {
      model: "claude-3-7-sonnet-20250219",
      messages: [
        {
          role: "user",
          content: "find all iuss in this project fix all",
        },
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "toolu_01",
              name: "read_file",
              input: { path: "src/main.ts" },
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_01",
              content: "const a = 1; // bug here",
            },
          ],
        },
      ],
      stream: false,
    };

    const conversion = convertAnthropicRequest(multiTurnPayload);
    const msgs = conversion.openAiPayload.messages as any[];

    // Must have user prompt, assistant tool call, and tool result
    expect(msgs.length).toBeGreaterThanOrEqual(3);
    const toolResultMsg = msgs.find((m) => m.role === "tool");
    expect(toolResultMsg).toBeDefined();
    expect(toolResultMsg.tool_call_id).toBe("toolu_01");
    expect(toolResultMsg.content).toContain("const a = 1; // bug here");
  });
});
