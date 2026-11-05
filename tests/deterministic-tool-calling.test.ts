import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { OpenAICompatibleAdapter } from "../packages/providers/src/openai";
import { AnthropicAdapter } from "../packages/providers/src/anthropic";
import { StreamChunkProcessor, cleanNonStreamingMessage } from "../apps/web/app/v1/[...path]/route";
import type { ChatMessage, ToolCall } from "@pro/shared";

describe("Deterministic Tool Calling Round-Trip Acceptance Tests", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "prorouter-tool-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch { }
  });

  it("completes full deterministic read_test_file tool round-trip", async () => {
    // 1. Setup test file in isolated temporary directory
    const testFileName = "test.txt";
    const testFilePath = path.join(tempDir, testFileName);
    const expectedContent = "Hello from Pro Router deterministic verification!";
    fs.writeFileSync(testFilePath, expectedContent, "utf8");

    // Tool registry for the agent client
    const toolRegistry: Record<string, (args: any) => string> = {
      read_test_file: (args: { path: string }) => {
        const fullPath = path.join(tempDir, args.path);
        return fs.readFileSync(fullPath, "utf8");
      },
    };

    // 2. Initial conversation request
    const conversation: ChatMessage[] = [
      {
        role: "user",
        content: "Please read the content of test.txt using the read_test_file tool.",
      },
    ];

    // 3. Simulated Upstream Provider returning native tool call
    const simulatedToolCallId = "call_read_001_det";
    const rawUpstreamResponse = {
      id: "chatcmpl-test-01",
      object: "chat.completion",
      created: 1710000000,
      model: "deepseek-ai/DeepSeek-V4.1-Flash-1017",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "I will read test.txt for you.",
            tool_calls: [
              {
                id: simulatedToolCallId,
                type: "function",
                function: {
                  name: "read_test_file",
                  arguments: JSON.stringify({ path: testFileName }),
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 45, completion_tokens: 25, total_tokens: 70 },
    };

    // 4. Pro Router cleanNonStreamingMessage processing
    const assistantMsg = rawUpstreamResponse.choices[0].message;
    const cleaned = cleanNonStreamingMessage(assistantMsg, "DeepSeek V4.1 Flash", "deepseek", false);

    expect(cleaned.role).toBe("assistant");
    expect(cleaned.tool_calls).toBeDefined();
    expect(Array.isArray(cleaned.tool_calls)).toBe(true);

    const toolCall = (cleaned.tool_calls as ToolCall[])[0];
    expect(toolCall.id).toBe(simulatedToolCallId);
    expect(toolCall.function.name).toBe("read_test_file");

    // 5. Client receives tool call, executes tool in local workspace
    const parsedArgs = JSON.parse(toolCall.function.arguments);
    expect(parsedArgs.path).toBe(testFileName);

    const toolExecutor = toolRegistry[toolCall.function.name];
    expect(toolExecutor).toBeDefined();
    const toolExecutionResult = toolExecutor(parsedArgs);
    expect(toolExecutionResult).toBe(expectedContent);

    // 6. Client updates conversation with assistant response + tool result
    conversation.push({
      role: "assistant",
      content: cleaned.content,
      tool_calls: cleaned.tool_calls as ToolCall[],
    });

    conversation.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: toolExecutionResult,
    });

    expect(conversation).toHaveLength(3);
    expect(conversation[1].role).toBe("assistant");
    expect(conversation[2].role).toBe("tool");
    expect((conversation[2] as any).tool_call_id).toBe(simulatedToolCallId);

    // 7. Simulated Upstream Provider responds to completed tool execution
    const simulatedFinalResponse = {
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: `The file ${testFileName} contains: "${toolExecutionResult}". The operation is complete.`,
          },
          finish_reason: "stop",
        },
      ],
    };

    const finalCleaned = cleanNonStreamingMessage(simulatedFinalResponse.choices[0].message, "DeepSeek V4.1 Flash", "deepseek", false);
    expect(finalCleaned.content).toContain(expectedContent);
    expect(finalCleaned.tool_calls).toBeUndefined();
  });

  it("completes full deterministic write_test_file tool round-trip", async () => {
    const newFileName = "output-report.txt";
    const contentToWrite = "Pro Router deterministic write verified successfully.";

    const toolRegistry: Record<string, (args: any) => string> = {
      write_test_file: (args: { path: string; content: string }) => {
        const fullPath = path.join(tempDir, args.path);
        fs.writeFileSync(fullPath, args.content, "utf8");
        return `Successfully wrote ${args.content.length} characters to ${args.path}`;
      },
    };

    const simulatedToolCallId = "call_write_002_det";
    const rawUpstreamResponse = {
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: simulatedToolCallId,
                type: "function",
                function: {
                  name: "write_test_file",
                  arguments: JSON.stringify({ path: newFileName, content: contentToWrite }),
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
    };

    const assistantMsg = rawUpstreamResponse.choices[0].message;
    const cleaned = cleanNonStreamingMessage(assistantMsg, "DeepSeek V4.1 Flash", "deepseek", false);

    expect(cleaned.tool_calls).toBeDefined();
    const toolCall = (cleaned.tool_calls as ToolCall[])[0];
    expect(toolCall.function.name).toBe("write_test_file");

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    const result = toolRegistry[toolCall.function.name](parsedArgs);

    // Verify file actually exists on filesystem
    const diskPath = path.join(tempDir, newFileName);
    expect(fs.existsSync(diskPath)).toBe(true);
    expect(fs.readFileSync(diskPath, "utf8")).toBe(contentToWrite);
    expect(result).toContain("Successfully wrote");
  });

  it("reassembles fragmented streaming SSE chunks for tool calls without corruption", () => {
    const processor = new StreamChunkProcessor();

    // Stream chunk 1: Start tool call with id and name
    const chunk1 = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            id: "call_stream_frag_01",
            type: "function",
            function: {
              name: "read_test_file",
              arguments: "",
            },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );

    expect(chunk1.tool_calls).toBeDefined();
    expect((chunk1.tool_calls as any[])[0].id).toBe("call_stream_frag_01");
    expect((chunk1.tool_calls as any[])[0].function.name).toBe("read_test_file");

    // Stream chunk 2: First fragment of arguments
    const chunk2 = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            function: {
              arguments: '{"path": "',
            },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );
    expect((chunk2.tool_calls as any[])[0].function.arguments).toBe('{"path": "');

    // Stream chunk 3: Second fragment of arguments
    const chunk3 = processor.processDelta(
      {
        tool_calls: [
          {
            index: 0,
            function: {
              arguments: 'src/main.rs"}',
            },
          },
        ],
      },
      "DeepSeek V4.1 Flash",
      "deepseek"
    );
    expect((chunk3.tool_calls as any[])[0].function.arguments).toBe('src/main.rs"}');

    // Complete reassembled arguments
    const fullJsonStr =
      ((chunk1.tool_calls as any[])[0].function.arguments || "") +
      (chunk2.tool_calls as any[])[0].function.arguments +
      (chunk3.tool_calls as any[])[0].function.arguments;

    const parsed = JSON.parse(fullJsonStr);
    expect(parsed.path).toBe("src/main.rs");
  });

  it("handles Anthropic Messages API tool round-trip with tool_use and tool_result", () => {
    // 1. Initial user request in Anthropic format
    const messages: ChatMessage[] = [
      {
        role: "user",
        content: "Please check src/config.json",
      },
      {
        role: "assistant",
        content: "Checking the file now.",
        tool_calls: [
          {
            id: "toolu_01_cfg",
            type: "function",
            function: {
              name: "read_test_file",
              arguments: JSON.stringify({ path: "src/config.json" }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "toolu_01_cfg",
        content: '{"port": 8080, "host": "127.0.0.1"}',
      },
    ];

    const adapter = new AnthropicAdapter({
      providerSlug: "anthropic",
      endpointUrl: "https://api.anthropic.com/v1",
      apiKey: "test-key",
    });

    // Access private buildBody to verify payload shape
    const body = (adapter as any).buildBody({
      model: "claude-3-5-sonnet-20241022",
      messages,
      tools: [
        {
          name: "read_test_file",
          description: "Read a workspace file",
          parameters: {
            type: "object",
            properties: { path: { type: "string" } },
            required: ["path"],
          },
        },
      ],
      stream: false,
    });

    expect(body.tools).toBeDefined();
    expect(body.tools[0].name).toBe("read_test_file");
    expect(body.tools[0].input_schema).toBeDefined();

    // Verify messages translation
    expect(body.messages).toBeDefined();
    // Assistant message must contain tool_use block
    const assistantMsg = body.messages.find((m: any) => m.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(Array.isArray(assistantMsg.content)).toBe(true);
    const toolUseBlock = assistantMsg.content.find((b: any) => b.type === "tool_use");
    expect(toolUseBlock).toBeDefined();
    expect(toolUseBlock.id).toBe("toolu_01_cfg");
    expect(toolUseBlock.name).toBe("read_test_file");

    // User message must contain tool_result block with matching tool_use_id
    const userResultMsg = body.messages[body.messages.length - 1];
    expect(userResultMsg.role).toBe("user");
    expect(Array.isArray(userResultMsg.content)).toBe(true);
    const toolResultBlock = userResultMsg.content.find((b: any) => b.type === "tool_result");
    expect(toolResultBlock).toBeDefined();
    expect(toolResultBlock.tool_use_id).toBe("toolu_01_cfg");
    expect(toolResultBlock.content).toContain("8080");
  });
});
