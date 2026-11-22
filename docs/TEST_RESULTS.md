# Automated Test and Verification Results

This document records the verified test, typecheck, and build results for the Pro Router codebase.

Verified on: 2026-11-22

---

## 1. Test Suite Summary

- **Total Test Files:** 18
- **Total Test Cases:** 150
- **Passed:** 150
- **Failed:** 0
- **Pass Rate:** 100%
- **Execution Engine:** Vitest v5.0.3 (`npm test`, exit code 0)

Additional checks:

- `npm run typecheck` — passed (shared, database, providers, routing, api workspaces).
- `npx tsc --noEmit -p apps/web` — no output (0 type errors).
- `npm --prefix apps/web run build` — succeeded (see section 3).

---

## 2. Test Suite Breakdown

| Suite | Tests | Coverage Areas |
| :--- | ---: | :--- |
| `tests/e2e.test.ts` | 27 | Role elevation, dynamic provider registration, tier-priced aliases, billing ledger, free-quota concurrency protection, SSE streaming, Razorpay webhook and wallet lifecycle |
| `tests/public-gateway-auth.test.ts` | 18 | Unauthenticated/invalid-key rejection, demo-mode gating, credential forwarding, Anthropic `/v1/messages` proxying, `/v1/models` catalog behavior |
| `tests/coding-agent-full-roundtrip.test.ts` | 13 | End-to-end coding-agent request/response roundtrips, usage accounting, provider health integration |
| `tests/fallback-gateway.test.ts` | 12 | Demo-mode gate, signed session cookies, password/registration handling, role derivation, per-user wallet isolation, Astra redemption, keys 503, Razorpay verification |
| `tests/gateway-routing-honesty.test.ts` | 11 | Key rotation/cooldown, served-model honesty headers, `finish_reason` normalization, split-tag streaming, Anthropic SSE buffering, `tool_use` conversion |
| `tests/routing.test.ts` | 11 | Dynamic provider selection, latency scoring, upstream failover, health-check recovery |
| `tests/anthropic-messages-protocol.test.ts` | 8 | Anthropic Messages API request/response and streaming protocol coverage |
| `tests/money.test.ts` | 8 | USD-to-INR paise arithmetic, reserve/margin application, floor pricing |
| `tests/providers-contract.test.ts` | 8 | Provider adapter contract coverage (`packages/providers`) |
| `tests/agent-coding.test.ts` | 6 | Native `tool_calls` preservation, reasoning extraction, `think` tag isolation, tool-call rejection, message sanitization |
| `tests/wallet-atomicity.test.ts` | 6 | Concurrent debit consistency, reservation over-commit prevention, settle retry idempotency, ownership/status guards, dedupe |
| `tests/coding-agent-compatibility.test.ts` | 5 | Coding-agent compatibility behavior across supported clients |
| `tests/catalog-aliases.test.ts` | 4 | Canonical model resolution, shorthand aliases, database/runtime merging, tier filtering |
| `tests/deterministic-tool-calling.test.ts` | 4 | Deterministic native tool-call streaming and non-streaming behavior |
| `tests/pro-router-coding-agent-regression.test.ts` | 3 | Coding-agent regression coverage |
| `tests/pro-router-instruction-following.test.ts` | 3 | Instruction-following coverage |
| `tests/wallet-and-events.test.ts` | 2 | Ledger transaction immutability, real-time balance calculation |
| `tests/no-hardcoded-secrets.test.ts` | 1 | No hardcoded provider/Razorpay secrets |

**Total:** 18 files, 150 tests, all passing.

---

## 3. Frontend & Edge Gateway Build Verification

- **Command:** `npm --prefix apps/web run build`
- **Compiler:** Next.js 16.4.5 (Turbopack)
- **Compile:** succeeded in 13.3s
- **TypeScript:** finished in 10.9s with 0 type errors
- **Static generation:** 21 / 21 pages generated successfully
- **Verified routes include:** `/v1/[...path]`, `/api/[...path]`, `/chat/completions`, `/messages`, `/models`, `/models/[slug]`

---

## 4. Coding Agent Compatibility Verification Matrix

Protocol-level compatibility is verified by the automated suites above. Live end-to-end runs against the actual client applications were **not** executed in this environment (no live provider credentials/network), so they are not claimed here.

| Agent Client | Feature | Verification Outcome |
| :--- | :--- | :--- |
| **Cline** | Native Tool Calls | Protocol-verified: valid JSON `tool_calls` preserved without XML contamination (`tests/agent-coding.test.ts`, `tests/deterministic-tool-calling.test.ts`) |
| **Kilo Code** | Streaming Completions | Protocol-verified: progressive chunks, normalized `finish_reason` including `tool_calls` (`tests/gateway-routing-honesty.test.ts`) |
| **OpenCode** | OpenAI Protocol Parity | Protocol-verified: standard OpenAI request/response shapes on `/v1/chat/completions` |
| **Continue** | OpenAI Protocol Parity | Protocol-verified: same OpenAI-compatible surface as OpenCode |
| **Claude Code** | Anthropic Messages API | Protocol-verified: `/v1/messages` streaming and non-streaming conversion with `tool_use` blocks, split SSE buffering, and upstream usage in `message_delta` (`tests/gateway-routing-honesty.test.ts`) |

---

## 5. Known Deviations

- `GET /v1/models` proxies the Fastify catalog for API-key callers (so the list matches what the key can use); anonymous, session-only, and demo callers receive the local catalog, and an unreachable catalog backend returns a 503 rather than a fabricated list.
- Anthropic streaming `message_start` reports an estimated input-token count (the authoritative upstream count is only known after the stream completes); the final `message_delta` carries the upstream `usage` values.
