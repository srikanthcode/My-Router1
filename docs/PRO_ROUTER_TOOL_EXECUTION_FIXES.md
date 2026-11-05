# Pro Router Tool Execution Fixes Documentation

This document provides a technical explanation of the fixes implemented to enable native tool calling and agentic workflows across the Pro Router platform.

---

## 1. Upstream Gateway Key Rotation & 401 Recovery

**Location:** `apps/web/app/v1/[...path]/route.ts`

### Issue:
The first TokenJuice API key in the fallback pool returned `HTTP 401 Unauthorized`. The gateway function `fetchGatewayWithRetry` only caught rate limits (`429`) and server errors (`502-504`), causing requests to fail immediately without attempting any of the remaining 11 active keys in the pool.

### Fix:
1. Removed the dead key from the fallback pool.
2. Enhanced `fetchGatewayWithRetry` to intercept `401` and `403` status codes:
```ts
if (res.status === 401 || res.status === 403) {
  if (key) markGatewayCooldown(key, 86_400_000); // 24-hour cooldown
  lastRes = res;
  continue; // Instantly attempt next active key
}
```

---

## 2. Inference Timeout and Keep-Alive SSE Tuning

**Location:** `apps/web/app/v1/[...path]/route.ts`

### Issue:
High-capacity reasoning models (such as DeepSeek V4.1 Flash) on TokenJuice or other GPU inference providers require 15 to 60 seconds under load to compute complex reasoning paths before emitting initial tokens. The gateway enforced tight 2.5-second to 4.0-second timeouts, aborting inference before the first token could arrive.

### Fix:
1. Extended streaming connection and initial chunk timeouts to 45 seconds.
2. Extended non-streaming request timeout to 60 seconds.
3. Preserved background `: keep-alive\n\n` SSE comments sent every 2 seconds to ensure client proxies and browsers never drop idle connections while the upstream model is thinking.

---

## 3. Streaming Chunk Zero Role Declaration Clean-Up

**Location:** `apps/web/app/v1/[...path]/route.ts`

### Issue:
At stream start, the edge router emitted:
```json
{ "choices": [{ "index": 0, "delta": { "role": "assistant", "content": "" } }] }
```
The presence of `content: ""` misled client parsers (such as Cline, OpenCode, and Cursor) into initializing a text-only turn. When the upstream provider subsequently emitted `delta.tool_calls`, the client ignored the tool calls or appended raw JSON fragments into the conversational transcript.

### Fix:
Omitted `content: ""` from the role announcement:
```json
{ "choices": [{ "index": 0, "delta": { "role": "assistant" } }] }
```
When tool calls arrive, the client processes them as first-class `tool_calls` without conflicting text states.

---

## 4. Anthropic Messages Tool Calling Adapter Overhaul

**Location:** `packages/providers/src/anthropic.ts`

### Issue:
The `AnthropicAdapter` was incomplete for tool operations:
1. `buildBody` omitted `params.tools` and `params.toolChoice`.
2. `splitMessages` converted `role: "tool"` into plain user messages, dropping `tool_call_id`.
3. `splitMessages` converted assistant messages with `tool_calls` into plain text, dropping the previous `tool_use` blocks.
4. `chatStream` ignored `content_block_start` (`tool_use`) and `content_block_delta` (`input_json_delta`).

### Fix:
1. **Schema Mapping in `buildBody`:**
   Maps OpenAI function definitions to Anthropic `tools` (`name`, `description`, `input_schema`).
   Maps `tool_choice` (`auto` -> `type: "auto"`, `required` -> `type: "any"`).
2. **History Preservation in `splitMessages`:**
   Translates `role: "tool"` to Anthropic `tool_result` content blocks containing `tool_use_id` and execution output.
   Translates assistant `tool_calls` into Anthropic `tool_use` content blocks containing `id`, `name`, and parsed JSON input.
   Merges consecutive messages with identical roles to satisfy Anthropic's strict alternating turn requirements.
3. **Streaming Translation in `chatStream`:**
   Emits `tool_call_delta` for `content_block_start` (`type: "tool_use"`) and progressive JSON argument chunks from `input_json_delta`.

---

## 5. Anthropic Bridge Streaming Parallel Block Isolation

**Location:** `apps/web/app/v1/[...path]/route.ts`

### Issue:
In `/v1/messages` streaming translation, a single boolean flag `hasToolBlock` and a single `blockIndex` caused parallel tool calls (multiple tools called in one turn) to overwrite each other under block index 1, violating Anthropic SSE protocol.

### Fix:
Introduced a `toolBlockMap` tracking discrete block indices per tool call index:
- Each tool call starts its own `content_block_start` with unique `index`.
- Each argument delta routes to its corresponding `index`.
- Text blocks are closed before tool blocks open, and empty text blocks are never emitted.
- All active blocks are closed with `content_block_stop` prior to `message_stop`.

---

## 6. Pipeline Mid-Stream Retry Safeguard

**Location:** `apps/api/src/lib/pipeline.ts`

### Issue:
In `streamChat`, the `started` flag was only set to `true` when a `delta` (text token) was emitted. If a model emitted a `tool_call_delta` as its first token and then encountered an upstream error, the pipeline attempted a fallback provider, which could send a second response to a client that had already received tool call events.

### Fix:
Updated condition to immediately mark stream as started:
```ts
if ((value.type === "delta" || value.type === "tool_call_delta" || value.type === "reasoning_delta") && !started) {
  started = true;
}
```
This ensures zero duplicate or mixed tool outputs.
