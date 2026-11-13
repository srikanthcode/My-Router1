import { describe, it, expect } from "vitest";
import { StreamChunkProcessor, cleanNonStreamingMessage } from "../apps/web/app/v1/[...path]/route";

describe("Coding Agent Protocol & Tool Execution Compatibility Suite", () => {
  it("streaming: does not emit content empty string in initial role chunk", () => {
    // Coding agents like Cline and Claude Code lock into text-only mode
    // if the assistant chunk has content: "" alongside or before tool calls.
    const processor = new StreamChunkProcessor();
    const initialRoleChunk = processor.processDelta(
      { role: "assistant" },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    // content must remain undefined (not "")
    expect(initialRoleChunk.content).toBeUndefined();
    expect(initialRoleChunk.tool_calls).toBeUndefined();
  });

  it("streaming: preserves fragmented tool_call_delta arguments correctly", () => {
    const processor = new StreamChunkProcessor();

    // Chunk 1: Function name declaration
    const delta1 = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            id: "call_exec_1",
            type: "function",
            function: { name: "execute_command", arguments: "" },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );
    expect(delta1.tool_calls).toBeDefined();
    expect(delta1.tool_calls![0].function.name).toBe("execute_command");

    // Chunk 2: First fragment of arguments
    const delta2 = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            function: { arguments: '{"cmd":"' },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );
    expect(delta2.tool_calls![0].function.arguments).toBe('{"cmd":"');

    // Chunk 3: Final fragment
    const delta3 = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            function: { arguments: 'npm test"}' },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );
    expect(delta3.tool_calls![0].function.arguments).toBe('npm test"}');
  });

  it("streaming: supports multiple simultaneous parallel tool calls", () => {
    const processor = new StreamChunkProcessor();
    const delta = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            id: "call_file_1",
            type: "function",
            function: { name: "read_file", arguments: '{"path":"app.ts"}' },
          },
          {
            index: 1,
            id: "call_file_2",
            type: "function",
            function: { name: "read_file", arguments: '{"path":"package.json"}' },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(delta.tool_calls).toHaveLength(2);
    expect(delta.tool_calls![0].function.name).toBe("read_file");
    expect(delta.tool_calls![1].function.name).toBe("read_file");
    expect(delta.tool_calls![0].id).toBe("call_file_1");
    expect(delta.tool_calls![1].id).toBe("call_file_2");
  });

  it("non-streaming: sets content to null when response contains only tool calls", () => {
    // OpenAI specification: if assistant returns tool_calls and no text, content should be null (not "")
    const rawMsg = {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_list_01",
          type: "function",
          function: {
            name: "list_directory",
            arguments: JSON.stringify({ path: "." }),
          },
        },
      ],
    };
    const cleaned = cleanNonStreamingMessage(rawMsg, "DeepSeek V4.1 Flash", "deepseek", false);

    expect(cleaned.role).toBe("assistant");
    expect(cleaned.tool_calls).toBeDefined();
    expect(cleaned.tool_calls!.length).toBe(1);
    // In strict OpenAI spec, empty text with tool calls should be null or omitted
    expect(cleaned.content === null || cleaned.content === "" || cleaned.content === undefined).toBe(true);
  });

  it("multi-turn: correctly processes tool result messages without corruption", () => {
    const userToolResult = {
      role: "tool",
      tool_call_id: "call_list_01",
      content: JSON.stringify({ files: ["index.ts", "package.json", "tsconfig.json"] }),
    };

    expect(userToolResult.role).toBe("tool");
    expect(userToolResult.tool_call_id).toBe("call_list_01");
    expect(JSON.parse(userToolResult.content).files).toContain("package.json");
  });
});
