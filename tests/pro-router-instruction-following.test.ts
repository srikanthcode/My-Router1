import { describe, it, expect } from "vitest";
import { ModelBehaviorEngine } from "../packages/routing/src/behavior-engine.js";
import { ModelProfileRegistry } from "../packages/routing/src/profile-registry.js";
import { applyPersonaToMessages } from "../packages/shared/src/persona.js";

describe("Pro Router Instruction Following & Prompt Fidelity Regression Suite", () => {
  it("preserves exact user messages without injecting synthetic system prompts or persona directives", () => {
    const profile = ModelProfileRegistry.get("deepseek-v4.1-flash") || ModelProfileRegistry.getAll()[0];
    expect(profile).toBeDefined();

    const incomingMessages = [
      {
        role: "user",
        content: "Find all issues in the project and fix all of them.",
      },
    ];

    // ModelBehaviorEngine must not inject a synthetic system message with persona/uncertainty directives
    const behavioralOutput = ModelBehaviorEngine.applyBehaviorToMessages(incomingMessages, profile!);
    expect(behavioralOutput).toHaveLength(1);
    expect(behavioralOutput[0].role).toBe("user");
    expect(behavioralOutput[0].content).toBe("Find all issues in the project and fix all of them.");

    // Persona helper must also preserve messages verbatim
    const personaOutput = applyPersonaToMessages(incomingMessages as any, "DeepSeek V4.1 Flash", "deepseek-v4.1-flash");
    expect(personaOutput).toHaveLength(1);
    expect(personaOutput[0].content).toBe("Find all issues in the project and fix all of them.");
  });

  it("preserves agent system instructions without appending [Active Model Persona] tags", () => {
    const profile = ModelProfileRegistry.get("deepseek-v4.1-flash") || ModelProfileRegistry.getAll()[0];
    const agentSystemInstruction = "You are an autonomous coding agent. Use local tools to inspect files and run tests.";

    const incomingMessages = [
      { role: "system", content: agentSystemInstruction },
      { role: "user", content: "Find all issues in the project and fix all of them." },
    ];

    const result = ModelBehaviorEngine.applyBehaviorToMessages(incomingMessages, profile!);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[0].content).toBe(agentSystemInstruction);
    expect(result[0].content).not.toContain("[Active Model Persona]");
    expect(result[0].content).not.toContain("Uncertainty: Be completely transparent");
    expect(result[1].role).toBe("user");
    expect(result[1].content).toBe("Find all issues in the project and fix all of them.");
  });

  it("handles multi-turn tool execution workflow without instruction corruption", () => {
    const multiTurnMessages = [
      { role: "system", content: "You are a coding assistant with access to workspace tools." },
      { role: "user", content: "Find all issues in the project and fix all of them." },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_list_dir_1",
            type: "function",
            function: { name: "list_directory", arguments: '{"path":"."}' },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_list_dir_1",
        content: '{"files":["src/index.ts","package.json","tsconfig.json"]}',
      },
    ];

    const profile = ModelProfileRegistry.get("deepseek-v4.1-flash") || ModelProfileRegistry.getAll()[0];
    const output = ModelBehaviorEngine.applyBehaviorToMessages(multiTurnMessages as any, profile!);

    expect(output).toHaveLength(4);
    expect(output[0].content).toBe("You are a coding assistant with access to workspace tools.");
    expect(output[1].content).toBe("Find all issues in the project and fix all of them.");
    expect(output[3].role).toBe("tool");
    expect(output[3].content).toContain("src/index.ts");
  });
});

