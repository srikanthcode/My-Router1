import { describe, it, expect } from "vitest";
import { StreamChunkProcessor, cleanNonStreamingMessage } from "../apps/web/app/v1/[...path]/route";

describe("Agent Autonomous Coding & Deflection Interceptor", () => {
  it("intercepts planning-only deflection and emits list_files tool call and XML tag", () => {
    const processor = new StreamChunkProcessor();
    const result = processor.processDelta(
      { content: "The user is asking me to find all bugs. I should:\n1. List files in the working directory" },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(result.content).toContain("<list_files>");
    expect(result.content).toContain("<path>.</path>");
    expect(result.tool_calls).toBeDefined();
    expect((result.tool_calls as any[])[0].function.name).toBe("list_files");
  });

  it("extracts un-tagged thinking into reasoning_content (Image 1 fix)", () => {
    const processor = new StreamChunkProcessor();
    const result = processor.processDelta(
      {
        content:
          'The user just said "hi". This is a simple greeting. Let me respond appropriately as Cline, the AI coding agent. I should greet them and offer assistance.Hello! I am Cline, your AI coding assistant.',
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(result.reasoning_content).toBeDefined();
    expect(result.reasoning_content).toContain('The user just said "hi"');
    expect(result.content).toContain("Hello! I am Cline, your AI coding assistant.");
    expect(result.content).not.toContain('The user just said "hi"');
  });

  it("dual-bridges native tool_calls to XML in content for Cline XML mode", () => {
    const processor = new StreamChunkProcessor();
    const result = processor.processDelta(
      {
        tool_calls: [
          {
            id: "call_99",
            type: "function",
            function: {
              name: "read_file",
              arguments: JSON.stringify({ path: "main.py" }),
            },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(result.content).toContain("<read_file>");
    expect(result.content).toContain("<path>main.py</path>");
    expect(result.tool_calls).toBeDefined();
  });

  it("handles non-streaming deflection and bridges to tool_calls and XML", () => {
    const rawMsg = {
      role: "assistant",
      content: "I cannot directly access or analyze your code unless you provide it here. Please paste your code.",
    };
    const cleaned = cleanNonStreamingMessage(rawMsg, "DeepSeek V4.1 Flash", "deepseek", false);

    expect(cleaned.content).toContain("<list_files>");
    expect(cleaned.tool_calls).toBeDefined();
    expect((cleaned.tool_calls as any[])[0].function.name).toBe("list_files");
  });
});
