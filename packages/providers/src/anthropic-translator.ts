/**
 * Bidirectional Anthropic Messages ↔ OpenAI Chat Completions Protocol Translator.
 *
 * Enables Claude Code, Cline, Cursor, and any Anthropic SDK to work transparently
 * against any OpenAI-compatible model (including deepseek-v4.1-flash, Groq, OpenRouter).
 */

function safeJsonParse(str?: string): Record<string, unknown> {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return { raw: str };
  }
}

function serializeToolResult(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return (item as any).text || JSON.stringify(item);
        }
        return String(item);
      })
      .join("\n");
  }
  if (content && typeof content === "object") {
    return JSON.stringify(content);
  }
  return String(content ?? "");
}

export function translateAnthropicToOpenAiRequest(
  payload: Record<string, unknown>,
  targetModel: string
): Record<string, unknown> {
  const openAiMessages: Array<Record<string, unknown>> = [];

  // 1. System Prompt (string or array of text blocks)
  if (payload.system) {
    let sysText = "";
    if (typeof payload.system === "string") {
      sysText = payload.system;
    } else if (Array.isArray(payload.system)) {
      sysText = payload.system
        .map((b) => (typeof b === "string" ? b : (b as any)?.text ?? ""))
        .filter(Boolean)
        .join("\n\n");
    }
    if (sysText) {
      openAiMessages.push({ role: "system", content: sysText });
    }
  }

  // 2. Messages translation
  const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
  for (const msg of rawMessages) {
    if (!msg || typeof msg !== "object") continue;
    const role = (msg as any).role;
    const content = (msg as any).content;

    if (role === "user") {
      if (Array.isArray(content)) {
        const textParts: string[] = [];
        for (const block of content) {
          if (!block || typeof block !== "object") continue;
          if (block.type === "tool_result") {
            const toolCallId = block.tool_use_id || "call_unknown";
            let resultContent = serializeToolResult(block.content);
            if (block.is_error) {
              resultContent = `Error: ${resultContent}`;
            }
            openAiMessages.push({
              role: "tool",
              tool_call_id: toolCallId,
              content: resultContent,
            });
          } else if (block.type === "text") {
            textParts.push(block.text || "");
          } else if (block.type === "image") {
            // Forward image block
            textParts.push(JSON.stringify(block));
          }
        }
        if (textParts.length > 0) {
          openAiMessages.push({ role: "user", content: textParts.join("\n\n") });
        }
      } else {
        openAiMessages.push({ role: "user", content: typeof content === "string" ? content : "" });
      }
    } else if (role === "assistant") {
      if (Array.isArray(content)) {
        const textParts: string[] = [];
        const toolCalls: Array<Record<string, unknown>> = [];

        for (const block of content) {
          if (!block || typeof block !== "object") continue;
          if (block.type === "text") {
            textParts.push(block.text || "");
          } else if (block.type === "tool_use") {
            toolCalls.push({
              id: block.id || `call_${Math.random().toString(36).slice(2, 10)}`,
              type: "function",
              function: {
                name: block.name,
                arguments: typeof block.input === "string" ? block.input : JSON.stringify(block.input ?? {}),
              },
            });
          }
        }

        const assistantMsg: Record<string, unknown> = {
          role: "assistant",
          content: textParts.length > 0 ? textParts.join("\n\n") : null,
        };
        if (toolCalls.length > 0) {
          assistantMsg.tool_calls = toolCalls;
        }
        openAiMessages.push(assistantMsg);
      } else {
        openAiMessages.push({ role: "assistant", content: typeof content === "string" ? content : "" });
      }
    }
  }

  // 3. Tools translation
  let openAiTools: Array<Record<string, unknown>> | undefined;
  if (Array.isArray(payload.tools) && payload.tools.length > 0) {
    openAiTools = payload.tools.map((t: any) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || undefined,
        parameters: t.input_schema || { type: "object", properties: {} },
      },
    }));
  }

  // 4. Tool Choice translation
  let openAiToolChoice: unknown = undefined;
  if (payload.tool_choice && typeof payload.tool_choice === "object") {
    const tcType = (payload.tool_choice as any).type;
    if (tcType === "auto") openAiToolChoice = "auto";
    else if (tcType === "any") openAiToolChoice = "required";
    else if (tcType === "none") openAiToolChoice = "none";
    else if (tcType === "tool") {
      openAiToolChoice = {
        type: "function",
        function: { name: (payload.tool_choice as any).name },
      };
    }
  }

  const openAiPayload: Record<string, unknown> = {
    model: targetModel,
    messages: openAiMessages,
    stream: payload.stream === true,
  };

  if (payload.max_tokens !== undefined) {
    openAiPayload.max_tokens = payload.max_tokens;
  }
  if (payload.temperature !== undefined) {
    openAiPayload.temperature = payload.temperature;
  }
  if (payload.top_p !== undefined) {
    openAiPayload.top_p = payload.top_p;
  }
  if (Array.isArray(payload.stop_sequences) && payload.stop_sequences.length > 0) {
    openAiPayload.stop = payload.stop_sequences;
  }
  if (openAiTools) {
    openAiPayload.tools = openAiTools;
  }
  if (openAiToolChoice !== undefined) {
    openAiPayload.tool_choice = openAiToolChoice;
  }

  return openAiPayload;
}

export function translateOpenAiToAnthropicResponse(
  openAiRes: Record<string, unknown>,
  requestedModel: string
): Record<string, unknown> {
  const choices = Array.isArray(openAiRes.choices) ? openAiRes.choices : [];
  const choice = choices[0] || {};
  const message = choice.message || {};
  const contentBlocks: Array<Record<string, unknown>> = [];

  // 1. Thinking / reasoning_content block
  const reasoning = message.reasoning_content || message.reasoning;
  if (reasoning) {
    contentBlocks.push({
      type: "thinking",
      thinking: reasoning,
    });
  }

  // 2. Text content block
  if (message.content) {
    contentBlocks.push({
      type: "text",
      text: message.content,
    });
  }

  // 3. Tool use blocks
  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  for (const tc of toolCalls) {
    contentBlocks.push({
      type: "tool_use",
      id: tc.id || `toolu_${Math.random().toString(36).slice(2, 12)}`,
      name: tc.function?.name || "tool",
      input: safeJsonParse(tc.function?.arguments),
    });
  }

  // 4. Stop reason mapping
  let stopReason = "end_turn";
  if (toolCalls.length > 0 || choice.finish_reason === "tool_calls") {
    stopReason = "tool_use";
  } else if (choice.finish_reason === "length") {
    stopReason = "max_tokens";
  } else if (choice.finish_reason === "stop") {
    stopReason = "end_turn";
  }

  const usage = (openAiRes.usage as Record<string, number> | undefined) || {};

  return {
    id: `msg_${Math.random().toString(36).slice(2, 14)}`,
    type: "message",
    role: "assistant",
    model: requestedModel,
    content: contentBlocks,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: usage.prompt_tokens || 10,
      output_tokens: usage.completion_tokens || 20,
    },
  };
}

/**
 * State machine for transforming OpenAI SSE chunks into strict Anthropic SSE event frames.
 */
export class AnthropicStreamTranslator {
  private msgId: string;
  private model: string;
  private messageStarted = false;
  private nextBlockIndex = 0;
  private activeBlockType: "thinking" | "text" | "tool_use" | null = null;
  private activeBlockIndex: number | null = null;
  private toolIndexToBlockIndex: Map<number, number> = new Map();
  private sawToolCall = false;
  private finishReason = "stop";
  private inputTokens = 15;
  private outputTokens = 0;

  constructor(model: string) {
    this.model = model;
    this.msgId = `msg_${Math.random().toString(36).slice(2, 14)}`;
  }

  public *processChunk(chunkObj: Record<string, unknown>): Generator<string> {
    // 1. Emit message_start on the very first upstream chunk
    if (!this.messageStarted) {
      this.messageStarted = true;
      if (chunkObj.usage && typeof (chunkObj.usage as any).prompt_tokens === "number") {
        this.inputTokens = (chunkObj.usage as any).prompt_tokens;
      }
      yield `event: message_start\ndata: ${JSON.stringify({
        type: "message_start",
        message: {
          id: this.msgId,
          type: "message",
          role: "assistant",
          model: this.model,
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: this.inputTokens, output_tokens: 1 },
        },
      })}\n\n`;
    }

    if (chunkObj.usage && typeof (chunkObj.usage as any).completion_tokens === "number") {
      this.outputTokens = (chunkObj.usage as any).completion_tokens;
    }

    const choices = Array.isArray(chunkObj.choices) ? chunkObj.choices : [];
    const choice = choices[0];
    if (!choice) return;

    if (choice.finish_reason) {
      this.finishReason = choice.finish_reason;
    }

    const delta = choice.delta || {};

    // 2. Handle Reasoning / Thinking delta
    const reasoning = delta.reasoning_content || delta.reasoning;
    if (reasoning) {
      if (this.activeBlockType !== "thinking") {
        yield* this.closeActiveBlock();
        const blockIdx = this.nextBlockIndex++;
        this.activeBlockType = "thinking";
        this.activeBlockIndex = blockIdx;
        yield `event: content_block_start\ndata: ${JSON.stringify({
          type: "content_block_start",
          index: blockIdx,
          content_block: { type: "thinking", thinking: "" },
        })}\n\n`;
      }
      yield `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        index: this.activeBlockIndex,
        delta: { type: "thinking_delta", thinking: reasoning },
      })}\n\n`;
    }

    // 3. Handle Text delta
    const text = delta.content;
    if (text) {
      if (this.activeBlockType !== "text") {
        yield* this.closeActiveBlock();
        const blockIdx = this.nextBlockIndex++;
        this.activeBlockType = "text";
        this.activeBlockIndex = blockIdx;
        yield `event: content_block_start\ndata: ${JSON.stringify({
          type: "content_block_start",
          index: blockIdx,
          content_block: { type: "text", text: "" },
        })}\n\n`;
      }
      yield `event: content_block_delta\ndata: ${JSON.stringify({
        type: "content_block_delta",
        index: this.activeBlockIndex,
        delta: { type: "text_delta", text: text },
      })}\n\n`;
    }

    // 4. Handle Tool Calls delta
    const toolCalls = Array.isArray(delta.tool_calls) ? delta.tool_calls : [];
    for (const tc of toolCalls) {
      this.sawToolCall = true;
      const tcIndex = typeof tc.index === "number" ? tc.index : 0;
      let blockIdx = this.toolIndexToBlockIndex.get(tcIndex);

      if (blockIdx === undefined) {
        yield* this.closeActiveBlock();
        blockIdx = this.nextBlockIndex++;
        this.toolIndexToBlockIndex.set(tcIndex, blockIdx);
        this.activeBlockType = "tool_use";
        this.activeBlockIndex = blockIdx;

        const toolId = tc.id || `toolu_${Math.random().toString(36).slice(2, 12)}`;
        const toolName = tc.function?.name || "tool";

        yield `event: content_block_start\ndata: ${JSON.stringify({
          type: "content_block_start",
          index: blockIdx,
          content_block: {
            type: "tool_use",
            id: toolId,
            name: toolName,
            input: {},
          },
        })}\n\n`;
      }

      const argsFragment = tc.function?.arguments;
      if (argsFragment) {
        yield `event: content_block_delta\ndata: ${JSON.stringify({
          type: "content_block_delta",
          index: blockIdx,
          delta: {
            type: "input_json_delta",
            partial_json: argsFragment,
          },
        })}\n\n`;
      }
    }
  }

  private *closeActiveBlock(): Generator<string> {
    if (this.activeBlockIndex !== null) {
      yield `event: content_block_stop\ndata: ${JSON.stringify({
        type: "content_block_stop",
        index: this.activeBlockIndex,
      })}\n\n`;
      this.activeBlockType = null;
      this.activeBlockIndex = null;
    }
  }

  public *finish(): Generator<string> {
    yield* this.closeActiveBlock();

    const stopReason = this.sawToolCall || this.finishReason === "tool_calls"
      ? "tool_use"
      : this.finishReason === "length"
        ? "max_tokens"
        : "end_turn";

    yield `event: message_delta\ndata: ${JSON.stringify({
      type: "message_delta",
      delta: { stop_reason: stopReason, stop_sequence: null },
      usage: { output_tokens: Math.max(1, this.outputTokens) },
    })}\n\n`;

    yield `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`;
  }
}
