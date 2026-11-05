# Provider Key Routing and Security Architecture

Pro Router implements a decoupled, zero-trust credential routing architecture. Client credentials and upstream provider credentials never mix, ensuring optimal security, accounting accuracy, and provider redundancy.

---

## 1. Dual Credential Topology

```
+-------------------------------------------------------------+
| CLIENT APPLICATION (Cline, Kilo, OpenCode, Claude Code)     |
+-------------------------------------------------------------+
                              |
                              | Uses Pro Router API Key (`sk-pro-...`)
                              v
+-------------------------------------------------------------+
| PRO ROUTER SECURITY & ROUTING GATEWAY                       |
|                                                             |
| 1. SHA-256 Key Hash Verification & Organization Lookup     |
| 2. Balance & Rate Limit Validation                          |
| 3. Dynamic Model Routing & Cluster Selection                |
+-------------------------------------------------------------+
                              |
                              | Injects Upstream Provider API Key
                              v
+-------------------------------------------------------------+
| UPSTREAM PROVIDER CLUSTERS                                  |
| (TokenJuice / Requesty / Nabh Cloud / OpenAI / Anthropic)   |
+-------------------------------------------------------------+
```

---

## 2. Upstream Provider Credentials

Upstream credentials provide backend access to AI infrastructure providers.

- **Storage Location:** Secure server environment variables (`.env`, Docker secrets, Kubernetes secrets, or cloud vault).
- **Exposure Risk:** Zero. Upstream provider keys are strictly consumed server-side and are NEVER transmitted to clients or logged in telemetry.
- **Configured Providers & Keys:**
  - `TOKENJUICE_API_KEY`: High-throughput DeepSeek and Qwen cluster execution.
  - `REQUESTY_API_KEY`: Multi-model secondary routing cluster.
  - `NABH_API_KEY`: Regional and specialized compute models.
  - `OPENAI_API_KEY`: Direct OpenAI frontier model inference.
  - `ANTHROPIC_API_KEY`: Direct Anthropic Claude inference.
  - `DEEPSEEK_API_KEY`: Direct DeepSeek official endpoints.
  - `OPENROUTER_API_KEY`: Extended aggregation fallback.

---

## 3. Pro Router Client API Keys

Clients connect to Pro Router using managed client keys:

- **Format:** `sk-pro-<random_base64url_string>`
- **Storage Policy:**
  - Plaintext key is displayed to the user only once upon creation.
  - Database stores a one-way `SHA-256` hash alongside the key prefix (`sk-pro-abc...`) for administrative display.
- **Capabilities & Scopes:**
  - Linked to a user account and organization ledger.
  - Associated with rate limits (requests per minute, tokens per minute).
  - Linked to wallet balance or promotional free allowance.

---

## 4. Multi-Cluster Fallback & Routing Strategy

Pro Router uses a layered failover waterfall to guarantee 99.9% uptime for autonomous coding tasks:

```
[Incoming Request]
        |
        v
[Primary Engine: TokenJuice AI]
  - Fast execution for DeepSeek V4.1 & Qwen
  - If 200 OK: Stream response
  - If 429 Rate Limit / 5xx / Connection Timeout:
        |
        v
[Secondary Engine: Requesty High-Performance Gateway]
  - Seamless retry without dropping client connection
  - If 200 OK: Stream response
  - If 429 / 5xx / Timeout:
        |
        v
[Tertiary Engine: Nabh Cloud & Direct Upstream Providers]
  - Final compute tier fallback
  - If successful: Stream response
  - If all fail: Return structured 502/503 error with actionable diagnostic details
```

This ensures coding sessions do not terminate abruptly during upstream provider maintenance windows or rate spikes.

---

## 5. Key Rotation and Revocation

1. **User Key Revocation:** Users can instantly revoke compromised keys via the Pro Router dashboard (`/dashboard/keys`). Revocations take effect immediately across all edge nodes.
2. **Upstream Provider Rotation:** Updating upstream provider keys in the production environment requires zero codebase changes. Simply update the environment variable and trigger a zero-downtime rolling restart.
