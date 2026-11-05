# Google Antigravity Compatibility and Architecture Report

## 1. Executive Summary

This report provides a comprehensive technical assessment of Google Antigravity integration with Pro Router. It evaluates the supported surfaces (Antigravity IDE, Antigravity CLI, Antigravity 2.0, and MCP), protocol architectures, tool-calling capabilities, security boundaries, and recommended integration strategies.

---

## 2. Antigravity Surfaces Overview

Google Antigravity comprises three distinct client surfaces:

### A. Antigravity IDE
- **Architecture:** AI-first integrated development environment built on a VS Code core with proprietary DeepMind agent orchestration.
- **Backend Protocol:** Primarily communicates with Google DeepMind / Vertex AI infrastructure using the Gemini API protocol (supporting system instructions, function declarations, multimodal parts, and thinking tokens).
- **Custom Model Compatibility:** In settings, the IDE supports external OpenAI-compatible endpoints (`/v1/chat/completions`) for specific custom model profiles, provided the endpoint implements strict OpenAI wire formats with JSON Schema tool definitions.

### B. Antigravity CLI (`agy`)
- **Architecture:** Lightweight terminal interface for agent interaction, subagent management, and repository automation.
- **Configuration:** Managed via `~/.gemini/antigravity-cli/settings.json`.
- **Protocol:** Connects via authenticated Google cloud identity or configured API gateways.

### C. Antigravity 2.0 (Desktop Application)
- **Architecture:** Standalone desktop pair programming application featuring split-view auxiliary panes (Subagents, Background Tasks, Artifacts, File Changes, Terminals).
- **Tool Execution:** Executes filesystem, terminal, and workspace operations locally using verified host sandboxes and explicit user permission gates.

---

## 3. Protocol and Tool-Calling Evaluation

### 1. Endpoint Protocol Support
- **OpenAI Compatible Protocol (`/v1/chat/completions`):**
  Supported by Pro Router and compatible with Antigravity IDE custom model configurations. Pro Router now cleanly forwards `tools`, `tool_choice`, `parallel_tool_calls`, and extracts reasoning tokens without corrupting content.
- **Anthropic Messages Protocol (`/v1/messages` and `/messages`):**
  Supported by Pro Router for Anthropic-oriented workflows, fully mapping `tool_use` and `tool_result` content blocks.
- **Gemini Native Protocol:**
  Direct Gemini wire formats (`models/{model}:generateContent` and `streamGenerateContent`) are handled by Google's native SDKs. Where Antigravity is configured with an OpenAI-compatible custom model provider, Pro Router serves as the inference gateway.

### 2. Tool Execution Lifecycle in Antigravity
In Antigravity, coding tools (`read_file`, `edit_file`, `write_file`, `run_command`, `ask_question`) are owned and executed by the Antigravity client runtime on the user's machine, NOT by the Pro Router server:
1. **Tool Declaration:** Antigravity sends its tool registry schema in the `tools` array of the request.
2. **Gateway Transport:** Pro Router transports these tool definitions to the upstream provider without modification.
3. **Inference & Decision:** The upstream model emits a native tool call (e.g. `edit_file` with file path and replacement).
4. **Clean Gateway Streaming:** Pro Router streams the tool call directly to Antigravity via `delta.tool_calls` without injecting synthetic XML or text.
5. **Local Execution & Permissions:** Antigravity requests user confirmation (or auto-approves if configured), executes the file edit locally on disk, and gathers the result.
6. **Continuation:** Antigravity sends the tool output back with role `tool` and matching `tool_call_id`. Pro Router routes the subsequent turn back to the model.

### 3. Model Context Protocol (MCP) Integration
Antigravity supports extensibility through MCP:
- **Local MCP Servers:** Defined in configuration files (e.g. stdio transport for local CLI tools and file servers).
- **Remote MCP Servers:** Supported via documented Stream/HTTP transports.
- **Compatibility Status:** When using Pro Router, MCP tools are exposed by the Antigravity host into the model request's `tools` array. Because Pro Router preserves full tool schemas and arguments, all MCP tools function with full fidelity.

---

## 4. Key Limitations and Security Boundaries

1. **Permission Gating:**
   Antigravity enforces host-level security boundaries. If an agent fails to execute a command because of missing user approval or read-only directory permissions, this is an intentional Antigravity security feature and must not be bypassed by the gateway.
2. **Model Reasoning & Planning Behavior:**
   Reasoning models (like DeepSeek-R1) generate extensive reasoning steps. If reasoning tokens are emitted into `content`, Antigravity treats them as conversational text. Pro Router extracts internal thoughts into `reasoning_content`, ensuring Antigravity receives only actionable tool calls.

---

## 5. Recommended Configuration for Antigravity

To route custom models in Antigravity through Pro Router:

```json
{
  "antigravity.customProviders": [
    {
      "name": "Pro Router",
      "baseUrl": "https://your-domain.com/v1",
      "apiKey": "sk-pro-your-api-key",
      "models": [
        {
          "id": "deepseek-v4.1-flash",
          "name": "DeepSeek V4.1 Flash",
          "capabilities": {
            "toolCalling": true,
            "streaming": true
          }
        },
        {
          "id": "qwen3.8-27b",
          "name": "Qwen 3.8 27B",
          "capabilities": {
            "toolCalling": true,
            "streaming": true
          }
        }
      ]
    }
  ]
}
```
