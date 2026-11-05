# Coding Agent Compatibility Matrix

This document provides configuration specifications, protocol requirements, and verification details for integrating external AI coding agents with Pro Router.

---

## 1. Compatibility Overview

| Client | Protocol Standard | Default Base URL | Tool Calling Method | Streaming Format | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cline** | OpenAI Chat Completions | `https://your-domain.com/v1` | Native JSON `tools` & `tool_calls` | OpenAI SSE (`data: { delta: ... }`) | Verified Ready |
| **Kilo Code** | OpenAI Chat Completions | `https://your-domain.com/v1` | Native JSON `tools` & `tool_calls` | OpenAI SSE (`data: { delta: ... }`) | Verified Ready |
| **OpenCode** | OpenAI Chat Completions | `https://your-domain.com/v1` | Native JSON `tools` & `tool_calls` | OpenAI SSE (`data: { delta: ... }`) | Verified Ready |
| **Claude Code** | Anthropic Messages API | `https://your-domain.com` (or `/v1`) | Anthropic `tool_use` / `tool_result` | Anthropic SSE (`event: ... data: ...`) | Verified Ready |

---

## 2. Client-by-Client Setup Guide

### 1. Cline

Cline is an autonomous coding agent extension for VS Code that requires high-fidelity tool calling and accurate token streaming.

- **API Provider:** Select `OpenAI Compatible` or `OpenRouter`
- **Base URL:** `https://your-domain.com/v1` (e.g., `http://localhost:3000/v1` during local development)
- **API Key:** Your Pro Router client key (`sk-pro-...`)
- **Recommended Models:**
  - `deepseek-v4.1-flash` (Fast, high intelligence, cost-effective)
  - `anthropic/claude-3-5-sonnet` (Frontier code generation)
  - `deepseek/deepseek-chat` (Standard DeepSeek V3)
  - `qwen3.8-27b` (High-efficiency reasoning and refactoring)

**Cline Configuration JSON (`settings.json`):**
```json
{
  "cline.apiProvider": "openai-compatible",
  "cline.openAiBaseUrl": "https://your-domain.com/v1",
  "cline.openAiApiKey": "sk-pro-your-api-key-here",
  "cline.openAiModelId": "deepseek-v4.1-flash"
}
```

---

### 2. Kilo Code

Kilo Code connects via the OpenAI standard with streaming tool execution.

- **API Provider:** `OpenAI Compatible`
- **Base URL:** `https://your-domain.com/v1`
- **API Key:** `sk-pro-...`
- **Recommended Models:**
  - `deepseek-v4.1-flash`
  - `openai/gpt-4o`
  - `deepseek/deepseek-coder`

**Configuration:**
```json
{
  "kilo.provider": "custom",
  "kilo.endpoint": "https://your-domain.com/v1",
  "kilo.apiKey": "sk-pro-your-api-key-here",
  "kilo.model": "deepseek-v4.1-flash"
}
```

---

### 3. OpenCode

OpenCode uses standard OpenAI API conventions for agent orchestration, command running, and file editing.

- **API Provider:** `OpenAI`
- **Base URL:** `https://your-domain.com/v1`
- **API Key:** `sk-pro-...`
- **Recommended Models:**
  - `deepseek-v4.1-flash`
  - `qwen3.8-27b`
  - `meta-llama/llama-3.3-70b-instruct`

**Environment Configuration (`.env` or shell):**
```bash
export OPENAI_BASE_URL="https://your-domain.com/v1"
export OPENAI_API_KEY="sk-pro-your-api-key-here"
export OPENCODE_MODEL="deepseek-v4.1-flash"
```

---

### 4. Claude Code

Claude Code CLI uses the Anthropic Messages API (`POST /v1/messages` and `POST /messages`). Pro Router natively translates Anthropic requests and SSE events, allowing Claude Code to communicate seamlessly through Pro Router.

- **API Format:** Anthropic Messages Protocol
- **Base URL:** `https://your-domain.com` (or `https://your-domain.com/v1`)
- **Auth Header:** `x-api-key: sk-pro-...` or `Authorization: Bearer sk-pro-...`
- **Anthropic Version Header:** `anthropic-version: 2023-06-01`
- **Recommended Models:**
  - `claude-3-5-sonnet-20241022`
  - `claude-3-5-haiku-20241022`
  - `deepseek-v4.1-flash` (Mapped via Anthropic bridge)

**Claude Code CLI Configuration:**
```bash
export ANTHROPIC_BASE_URL="https://your-domain.com"
export ANTHROPIC_API_KEY="sk-pro-your-api-key-here"
claude
```

---

## 3. Tool Calling Verification

Pro Router supports the full agentic execution lifecycle:

1. **Client Submits Request with Tools:** Client sends prompt and schema definitions in `tools` array.
2. **Pro Router Upstream Dispatch:** Pro Router forwards tools to the optimal provider cluster.
3. **Structured Tool Call Generation:** Upstream model generates tool call indices, function names, and arguments.
4. **Clean Token Streaming:** Pro Router streams arguments progressively via `delta.tool_calls` chunks without XML pollution.
5. **Client Local Execution:** Agent executes local action (e.g. `read_file`, `write_to_file`, `execute_command`).
6. **Multi-Turn Continuation:** Agent sends `tool` role message with `tool_call_id`. Pro Router routes subsequent turn cleanly.
