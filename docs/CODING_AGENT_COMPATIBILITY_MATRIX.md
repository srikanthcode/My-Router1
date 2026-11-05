# Coding Agent Compatibility Matrix

This document provides verified compatibility ratings across external AI coding agents, protocols, and integration surfaces for Pro Router.

Status Classifications:
- **PASS**: Verified and functionally operational through automated test suites and gateway validation.
- **FAIL**: Attempted but failing due to protocol or functional defects.
- **NOT RUN**: Not yet tested in active suite.
- **BLOCKED BY CLIENT OR PROVIDER LIMITATION**: Client surface requires a proprietary protocol not implemented by this gateway.

---

## 1. Compatibility Matrix

| Client Surface | Target Endpoint | Protocol Format | Tool Calling Mode | Streaming Support | Overall Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cline** | `/v1/chat/completions` | OpenAI Compatible | Native JSON `tool_calls` | OpenAI SSE | **PASS** |
| **Kilo Code** | `/v1/chat/completions` | OpenAI Compatible | Native JSON `tool_calls` | OpenAI SSE | **PASS** |
| **OpenCode** | `/v1/chat/completions` | OpenAI Compatible | Native JSON `tool_calls` | OpenAI SSE | **PASS** |
| **Claude Code** | `/v1/messages`, `/messages` | Anthropic Messages | `tool_use` / `tool_result` | Anthropic SSE | **PASS** |
| **Google Antigravity (Custom Model Mode)** | `/v1/chat/completions` | OpenAI Compatible | Native JSON `tool_calls` | OpenAI SSE | **PASS** |
| **Google Antigravity (Native Gemini Direct)** | `models/*:generateContent` | Google Gemini API | Gemini functionDeclarations | Gemini gRPC / SSE | **BLOCKED BY CLIENT OR PROVIDER LIMITATION** |

---

## 2. Feature Verification Breakdown

### A. Cline (PASS)
- **Model Catalog Retrieval:** Verified (`GET /v1/models` returns active models).
- **Native Tool Calling:** Verified (Emits valid JSON `tool_calls` with `name` and `arguments`).
- **File Exploration & Editing:** Verified (`read_file`, `write_to_file` executed cleanly).
- **Multi-Turn Tool Continuation:** Verified (Receives tool results and continues conversation).
- **Reasoning Stream Extraction:** Verified (`reasoning_content` isolated without polluting content).

### B. Kilo Code (PASS)
- **Streaming Tool Tokens:** Verified (Progressive argument assembly across SSE chunks).
- **Tool Execution Signals:** Verified (`finish_reason: "tool_calls"` emitted accurately).
- **Error Recovery:** Verified (Standard OpenAI error envelopes returned on failures).

### C. OpenCode (PASS)
- **OpenAI Standard Parity:** Verified (`messages`, `tools`, `tool_choice`, `temperature`).
- **Parallel Tool Calling:** Verified (`parallel_tool_calls` forwarded to supported upstream providers).
- **CLI Workspace Tool Execution:** Verified via deterministic tool round-trip test.

### D. Claude Code (PASS)
- **Anthropic Messages Protocol:** Verified (`POST /v1/messages` and `POST /messages`).
- **Tool Use Blocks:** Verified (Emits `type: "tool_use"` with unique `id`, `name`, and `input`).
- **Tool Result Blocks:** Verified (Processes `role: "user"` with `type: "tool_result"` blocks).
- **Streaming Content Blocks:** Verified (Emits `content_block_start`, `content_block_delta`, `content_block_stop`).
- **Parallel Block Isolation:** Verified (Discrete block index per tool call index).

### E. Google Antigravity (Custom Model Mode: PASS | Native Gemini Direct: BLOCKED)
- **Custom Model Provider Mode:** Verified PASS when configured using OpenAI-compatible base URL (`https://your-domain.com/v1`).
- **Native Gemini API Direct:** BLOCKED BY CLIENT OR PROVIDER LIMITATION. Antigravity's default direct surface communicates with Google Cloud / Vertex AI using Gemini protobuf wire formats (`generateContent`). Pro Router exposes OpenAI and Anthropic API protocols. To use Pro Router with Antigravity, developers must configure Antigravity's custom OpenAI provider setting or expose Pro Router models through an MCP server.
