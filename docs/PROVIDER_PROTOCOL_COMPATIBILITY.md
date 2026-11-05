# Provider Protocol Compatibility

Pro Router provides an adaptive multi-provider translation layer that abstracts upstream AI provider idiosyncrasies into a unified, high-reliability gateway.

---

## 1. Supported Upstream AI Providers

| Provider | Base URL | Protocol Format | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **TokenJuice** | `https://api.tokenjuice.ai/v1` | OpenAI Compatible | High-speed inference, deepseek-v4.1-flash, qwen3.8-27b |
| **Requesty** | `https://router.requesty.ai/v1` | OpenAI Compatible | Global multi-cluster routing, low latency failover |
| **Nabh Cloud** | `https://api.nabh.cloud/v1` | OpenAI Compatible | gpt-oss-20b, specialized regional compute |
| **OpenAI Direct** | `https://api.openai.com/v1` | Native OpenAI | GPT-4o, GPT-4o-mini, o1, o3-mini |
| **Anthropic Direct** | `https://api.anthropic.com/v1` | Anthropic Messages | Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus |
| **DeepSeek Direct** | `https://api.deepseek.com/v1` | OpenAI Compatible | DeepSeek-Chat (V3), DeepSeek-Reasoner (R1) |
| **OpenRouter Direct** | `https://openrouter.ai/api/v1` | OpenRouter Extended | Comprehensive 500+ model aggregation |

---

## 2. Request Wire Format Transformations

When a request arrives at Pro Router, the gateway normalizes client parameters into the upstream provider's expected format:

### A. Parameter Normalization
- **`max_tokens` vs `max_output_tokens`:**
  Automatically mapped according to the target provider. For Anthropic endpoints, `max_tokens` is strictly enforced and injected if absent (default 4096).
- **`temperature` and `top_p`:**
  Validated and passed through. For reasoning models that disallow temperature adjustments (e.g. o1/o3-mini or strict R1 configurations), unsupported sampling parameters are safely stripped.
- **`stream` Mode Handling:**
  Full parity between streaming (`stream: true`) and non-streaming (`stream: false`).
- **`tool_choice` Handling:**
  Normalized across `"auto"`, `"none"`, `"required"`, or specific function descriptors.

### B. Header Harmonization
- Client authentication (`Authorization: Bearer sk-pro-...` or `x-api-key`) is validated at the gateway.
- Upstream credentials (`TOKENJUICE_API_KEY`, `REQUESTY_API_KEY`, `OPENAI_API_KEY`, etc.) are securely attached to the upstream request.
- Client IP, agent user-agent, and correlation request IDs are propagated in diagnostic tracing headers:
  - `x-request-id: req_...`
  - `x-prorouter-model: ...`
  - `x-prorouter-cluster: ...`

---

## 3. Tool Calling Protocol Harmonization

Upstream providers return tool calls in slight variations:

```
Client Schema (OpenAI format):
{
  "tools": [{
    "type": "function",
    "function": {
      "name": "edit_file",
      "description": "Edits a file at the specified path",
      "parameters": {
        "type": "object",
        "properties": {
          "path": { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["path", "content"]
      }
    }
  }]
}
```

- **OpenAI Compatible Providers (TokenJuice, Requesty, OpenAI, DeepSeek):**
  Tools schema is forwarded unmodified. Streaming chunks stream `delta.tool_calls` with index, id, name, and incremental `arguments` fragments.
- **Anthropic Messages API:**
  When serving `/v1/messages`, incoming Anthropic `tools` definitions are mapped to Anthropic wire format, and responses are converted to `tool_use` content blocks with matching `id` and `input`.

---

## 4. Reasoning and Thinking Extraction

Reasoning models produce internal chain-of-thought tokens that require structured isolation:

- **DeepSeek-R1 / DeepSeek V4.1:**
  - Token streams containing `<think>...</think>` tags are intercepted by `StreamChunkProcessor`.
  - Content within think tags is routed to `delta.reasoning_content` (OpenAI format) or `thinking` event blocks (Anthropic format).
  - Cleaned text content is routed to `delta.content`.
- **Untagged Meta-Thoughts:**
  - Initial introspective tokens (e.g. "The user is asking for...") are extracted into `reasoning_content` before normal conversational output begins, ensuring coding agents never confuse internal thoughts with direct commands.

---

## 5. Standardized Error Translation

When an upstream provider fails or returns an error, Pro Router maps the failure into standard OpenAI-compatible or Anthropic-compatible error envelopes:

```json
{
  "error": {
    "message": "Model 'deepseek-v4.1-flash' temporarily unavailable. Retrying alternative cluster.",
    "type": "provider_error",
    "code": "upstream_unavailable",
    "status": 502
  }
}
```

This prevents external coding agents from crashing due to non-standard HTTP payloads or unstructured HTML error pages.
