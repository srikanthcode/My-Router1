import { describe, it, expect } from "vitest";
import { StreamChunkProcessor, cleanNonStreamingMessage } from "../apps/web/app/v1/[...path]/route";

describe("Agent Autonomous Coding & Protocol Compatibility", () => {
  it("preserves native tool_calls without injecting synthetic XML into content", () => {
    const processor = new StreamChunkProcessor();
    const result = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            id: "call_read_001",
            type: "function",
            function: {
              name: "read_file",
              arguments: JSON.stringify({ path: "src/index.ts" }),
            },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(result.tool_calls).toBeDefined();
    expect(Array.isArray(result.tool_calls)).toBe(true);
    expect((result.tool_calls as any[])[0].function.name).toBe("read_file");
    expect((result.tool_calls as any[])[0].function.arguments).toContain("src/index.ts");
    // Verify no XML pollution in content
    expect(result.content).toBeUndefined();
  });

  it("extracts un-tagged thinking into reasoning_content without leaking into content", () => {
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
    expect(result.content).toBeDefined();
    expect(result.content).toContain("Hello! I am Cline, your AI coding assistant.");
    expect(result.content).not.toContain('The user just said "hi"');
  });

  it("extracts explicit <think> tags into reasoning_content", () => {
    const processor = new StreamChunkProcessor();
    const result = processor.processDelta(
      {
        content: "<think>We need to refactor the database connector to handle pooling properly.</think>Here is the proposed connection pool implementation:",
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(result.reasoning_content).toBeDefined();
    expect(result.reasoning_content).toContain("We need to refactor the database connector");
    expect(result.content).toContain("Here is the proposed connection pool implementation:");
    expect(result.content).not.toContain("<think>");
    expect(result.content).not.toContain("</think>");
  });

  it("does not fabricate synthetic tool calls for normal assistant text or planning", () => {
    const processor = new StreamChunkProcessor();
    const result = processor.processDelta(
      {
        content: "To solve this issue, I should review the codebase and check the server configuration.",
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(result.tool_calls).toBeUndefined();
    expect(result.content).toBe("To solve this issue, I should review the codebase and check the server configuration.");
    expect(result.content).not.toContain("<list_files>");
  });

  it("handles non-streaming messages with native tool calls and reasoning cleanly", () => {
    const rawMsg = {
      role: "assistant",
      content: "<think>User needs to read package.json</think>Let me check the dependencies.",
      tool_calls: [
        {
          id: "call_pkg_01",
          type: "function",
          function: {
            name: "read_file",
            arguments: JSON.stringify({ path: "package.json" }),
          },
        },
      ],
    };
    const cleaned = cleanNonStreamingMessage(rawMsg, "DeepSeek V4.1 Flash", "deepseek", false);

    expect(cleaned.role).toBe("assistant");
    expect(cleaned.content).toBe("Let me check the dependencies.");
    expect(cleaned.reasoning_content).toBe("User needs to read package.json");
    expect(cleaned.tool_calls).toBeDefined();
    expect((cleaned.tool_calls as any[])[0].function.name).toBe("read_file");
    // Verify no synthetic XML tags were added
    expect(cleaned.content).not.toContain("<read_file>");
    expect(cleaned.content).not.toContain("<list_files>");
  });

  it("removes markdown asterisks when shouldCleanAsterisks is enabled", () => {
    const rawMsg = {
      role: "assistant",
      content: "This is **bold** text and *italic* text.",
    };
    const cleaned = cleanNonStreamingMessage(rawMsg, "Pro Model", "prorouter", true);

    expect(cleaned.content).not.toContain("**");
    expect(cleaned.content).not.toContain("*");
    expect(cleaned.content).toContain("bold");
    expect(cleaned.content).toContain("italic");
  });
});
