# Tool Calling Root Cause Investigation Report

## 1. Executive Summary

This report documents the deep root-cause investigation into why AI models connected to Pro Router frequently returned conversational text responses instead of invoking native tools and executing coding operations across clients like Cline, Kilo Code, OpenCode, Claude Code, and Google Antigravity.

Through isolated live testing against TokenJuice, Nabh Cloud, and the Pro Router edge gateway, five distinct root causes were identified and verified. All five issues have been remediated in source code and validated with deterministic test suites.

---

## 2. Root Cause Analysis

### Root Cause 1: First TokenJuice Key Was Expired/Unauthorized (401) Without Key Rotation
- **Observed Behavior:**
  When testing `https://api.tokenjuice.ai/v1/chat/completions` with key `tj_wDD1O7w37-Ha7n12b7GhuNgt-kjVCsm7TKysxCwq8_w`, the provider returned `HTTP 401 Unauthorized`.
- **Code Path:**
  In `apps/web/app/v1/[...path]/route.ts`, `fetchGatewayWithRetry` only checked for retryable status codes `429`, `502`, `503`, and `504`. It did NOT check for `401` or `403`.
- **Impact:**
  Because `tj_wDD1O7w...` was the first key in the fallback pool, every initial request tried this key, received `HTTP 401`, and immediately failed without attempting the 11 remaining active TokenJuice keys in the pool (`tj_llvqgvM...`, `tj_mbQStnV...`, etc.).
- **Remediation:**
  1. Removed the invalid key from the fallback pool.
  2. Updated `fetchGatewayWithRetry` to detect `401` and `403`, mark a 24-hour cooldown for the faulty key, and immediately retry using the next active key in the pool.

---

### Root Cause 2: Overly Aggressive Gateway Timeouts Aborting Legitimate GPU Inference
- **Observed Behavior:**
  In direct testing of active TokenJuice keys with `deepseek-ai/DeepSeek-V4.1-Flash-1017`, the model took between 15 and 110 seconds to generate a full response with native tool calls under heavy GPU cluster load.
- **Code Path:**
  `apps/web/app/v1/[...path]/route.ts` enforced:
  - Line 1138: `AbortSignal.timeout(3500)` (3.5 seconds connection timeout).
  - Line 1146: `setTimeout(..., 4000)` (4.0 seconds first-chunk timeout).
  - Line 2026: `AbortSignal.timeout(2500)` (2.5 seconds non-streaming timeout).
- **Impact:**
  Legitimate inference was aborted after 2.5 to 4 seconds. The gateway caught the abort and fell back to secondary clusters (`gpt-oss-20b`) or static fallbacks, causing conversational deflections where the model explained code instead of calling tools.
- **Remediation:**
  1. Extended connection and first-chunk streaming timeouts to 45 seconds while maintaining periodic SSE keep-alive pings (`: keep-alive\n\n`) every 2 seconds to keep client HTTP connections open.
  2. Extended non-streaming timeout to 60 seconds.

---

### Root Cause 3: Pre-Mature Empty Content Token Injection
- **Observed Behavior:**
  Streaming clients like Cline and OpenCode parsed incoming assistant turns as plain text rather than tool calls.
- **Code Path:**
  In `apps/web/app/v1/[...path]/route.ts` line 1991:
  `choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }]`
- **Impact:**
  Emitting `content: ""` in the very first SSE chunk before any tokens arrived signaled to agent state machines that the model was producing a text response. Subsequent `delta.tool_calls` chunks were either ignored or corrupted by the client parser.
- **Remediation:**
  Removed `content: ""` from the initial role announcement chunk:
  `choices: [{ index: 0, delta: { role: "assistant" }, finish_reason: null }]`.
  Now, when the upstream model emits `tool_calls`, the agent receives the tool definitions cleanly without prior text contamination.

---

### Root Cause 4: Anthropic Adapter Dropped Tools and Tool Continuation
- **Observed Behavior:**
  Claude Code and Anthropic-compatible clients could not execute tools and failed on multi-turn continuation.
- **Code Path:**
  In `packages/providers/src/anthropic.ts`:
  1. `buildBody` completely omitted `params.tools` and `params.toolChoice`. Tools were never sent to Anthropic.
  2. `splitMessages` dropped `tool_call_id` on `tool` role messages, converting them into plain text user messages.
  3. `splitMessages` dropped assistant's previous `tool_calls`, flattening assistant messages to text and breaking Anthropic's required `tool_use` message history.
  4. `chatStream` lacked handlers for `content_block_start` (`type: "tool_use"`) and `content_block_delta` (`type: "input_json_delta"`), silently discarding streaming tool calls from Anthropic.
- **Remediation:**
  1. Updated `buildBody` to map OpenAI tool definitions and `tool_choice` into Anthropic schema format.
  2. Updated `splitMessages` to preserve `tool_use_id` in `tool_result` content blocks and `tool_use` content blocks in assistant messages.
  3. Updated `chatStream` to yield `tool_call_delta` for `tool_use` start events and `input_json_delta` argument fragments.

---

### Root Cause 5: Streaming Parallel Tool Call Collisions in Anthropic Gateway Bridge
- **Observed Behavior:**
  When a model invoked multiple tools in parallel (e.g. reading two files in one turn), Anthropic streaming clients crashed with duplicate block index errors.
- **Code Path:**
  In `apps/web/app/v1/[...path]/route.ts`, lines 2400-2425 used a single boolean `hasToolBlock` and a single `blockIndex`. All parallel tool calls were dumped into block index 1.
- **Remediation:**
  Implemented a dynamic `toolBlockMap` keyed by tool call index. Each parallel tool call receives its own discrete `content_block_start`, argument deltas, and `content_block_stop`.

---

## 3. Affected Source Files

| File | Subsystem | Modifications |
| :--- | :--- | :--- |
| `apps/web/app/v1/[...path]/route.ts` | Edge Gateway | Key pool cleanup, 401 retry handling, timeout extension, initial chunk fix, Anthropic parallel block mapping |
| `packages/providers/src/anthropic.ts` | Provider Adapter | Tools mapping, tool_use/tool_result serialization, streaming tool delta handlers |
| `packages/providers/src/openai.ts` | Provider Adapter | Forwarded `parallel_tool_calls` parameter |
| `packages/providers/src/adapter.ts` | Provider Adapter | Added `parallelToolCalls` to interface |
| `apps/api/src/routes/chat.ts` | Fastify Backend | Added `parallel_tool_calls` to Zod schema and adapter params |
| `apps/api/src/lib/pipeline.ts` | Inference Pipeline | Set `started = true` for `tool_call_delta` to prevent mid-stream duplicate retries |

---

## 4. Verification and Regression Testing

A dedicated deterministic round-trip test suite was created in `tests/deterministic-tool-calling.test.ts`:
1. `read_test_file` complete round trip in isolated temporary directory: Passed.
2. `write_test_file` complete round trip with filesystem verification: Passed.
3. Fragmented SSE streaming chunk reassembly without corruption: Passed.
4. Anthropic Messages API `tool_use` and `tool_result` round trip: Passed.

All 60 tests across 7 test suites passed with zero failures. Next.js production build succeeded with zero type errors.

