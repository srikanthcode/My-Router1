# Phase 0 Audit — Production Readiness

Date: 2026-11-09
Scope: `apps/web` public gateway + fallback, `apps/api` chat/wallet/auth, `packages/routing`, `packages/providers`, database schema, tests.
Method: source review with line-level evidence; baseline `npm test` executed; no claims taken from docs without verification.
Baseline: 9 test files / 67 tests passing (docs claim 60/60 — stale).

## Severity summary

| ID | Severity | Area | One-line impact |
|----|----------|------|-----------------|
| F-01 | CRITICAL | Public `/v1` | Unauthenticated inference on server-side provider keys; billing bypassed |
| F-02 | CRITICAL | Fallback wallet | Free ₹500 credit without signature; replay double-credits; hardcoded Razorpay keys |
| F-03 | HIGH | Fallback auth | No password verification; unsigned cookie; client-controlled `role`; fake balances/keys |
| F-04 | CRITICAL | Wallet settle | Retry double-debits the wallet (balance update before ledger dedupe) |
| F-05 | HIGH | Wallet settle/release | No ownership/status guard on `requestId` updates |
| F-06 | HIGH | Wallet debit | Concurrent debits over-report the ledger (stale read vs `GREATEST` clamp) |
| F-07 | HIGH | Wallet reserve | Over-reservation race (no row lock); conflict update lacks user guard |
| F-08 | HIGH | Model routing | Silent substitution of requested models; response rewrites `model` back |
| F-09 | MEDIUM | Tool calling | `finish_reason: "stop"` preserved even when `tool_calls` are present |
| F-10 | MEDIUM | Anthropic API | Inaccurate `usage`; non-streaming `/v1/messages` skips Requesty path |
| F-11 | MEDIUM | Stream processing | Raw upstream `tool_calls` forwarded without `type`/`index` normalization |
| F-12 | LOW | Fallback API | Fabricated keys/dashboard data; secrets test misses Razorpay literals |
| F-13 | LOW | Gateway keys | Rotation cursor starts at index 1; retry can return last non-OK response |

## F-01 (CRITICAL) — Unauthenticated inference via public `/v1`

Evidence:
- `apps/web/app/v1/[...path]/route.ts:40` declares `BACKEND_BASE`; grep shows no other use. The route never calls Fastify.
- `route.ts:1772-1774` extracts `clientKey` and treats missing/`pro_sk_live_playground_default` as anonymous; the key is never validated.
- `route.ts:1778-1811` applies a 10 req/day/IP in-memory cap only to non-promo models; promo models (`deepseek-v4.1*`, `qwen3.8*`, `qwen-2.5-coder*`) bypass it entirely.
- `route.ts:2084-2085` same for `/v1/messages` with no limit at all.
- Upstream calls use server-side env keys: `route.ts:1136-1146` (TokenJuice), `2384-2396` (TokenJuice non-stream), `2442-2462` (Nabh).
- No wallet, API-key, rate-limit, or tenant check anywhere in the handler.

Impact: anyone can consume paid provider capacity for free; abuse cannot be attributed or revoked; a single leaked deployment URL burns provider quota.

Repro: `curl https://<host>/v1/chat/completions -d '{"model":"deepseek-v4.1-flash","messages":[{"role":"user","content":"hi"}]}'` with no Authorization header returns a completion.

Fix: require a valid Fastify API key/session for all inference. Proxy `/v1/chat/completions` and `/v1/models` to `${BACKEND_BASE}` forwarding the caller's credentials; convert Anthropic `/v1/messages` to the backend OpenAI endpoint. Only allow the demo path when explicitly enabled (`PROROUTER_ENABLE_DEMO_GATEWAY=true`), never in production by default.

Regression tests: unauthenticated request → 401; invalid key → 401; valid key → backend called with the same Authorization; promo model without key → 401.

## F-02 (CRITICAL) — Fallback wallet grants money without payment

Evidence (`apps/web/lib/builtin-gateway.ts`):
- `445-446`: Razorpay key/secret fall back to hardcoded `rzp_test_…` / `bHdafnoL9…` literals.
- `538-555`: signature is verified only when **all three** fields are present; `POST {}` skips verification.
- `557-563`: `addedPaise = order ? order.totalPaise : 50000` — missing order defaults to ₹500 credit.
- `563` increments `balancePaise` unconditionally **before** the transaction dedupe at `565-575`; replaying the same `razorpayPaymentId` credits again every time.
- `539`: same hardcoded secret fallback in verify.

Impact: free balance and replayable credit; hardcoded payment credentials; the `no-hardcoded-secrets` test does not scan Razorpay patterns.

Fix: remove all hardcoded credential fallbacks (503 if env missing); require payment id + order id + signature always; verify HMAC; require a known order and match amount; credit exactly once keyed by order/payment id; reject unknown orders.

Regression tests: `POST /wallet/verify {}` → 400/403, balance unchanged; bad signature → 403; valid signature twice → one credit; missing env keys → 503.

## F-03 (HIGH) — Fallback auth is forgeable and ignores passwords

Evidence:
- `builtin-gateway.ts:92-115` parses `uno_session` as unsigned base64url JSON; `role` comes from the payload (`106`).
- `117-130` creates the same unsigned cookie.
- `137-198` register/login validate only the email shape; `password` from the frontend (`apps/web/components/AuthForm.tsx:51,54`) is ignored.
- `209-219` `/auth/me` returns hardcoded `balancePaise: 25000`.
- `232-276`, `730-797` keys endpoints return fabricated keys and do not persist/validate them.
- Nuance: Fastify sessions are secure (`apps/api/src/lib/auth.ts:16-62` uses random token + DB hash), so the forged cookie does not authenticate to the real backend — impact is confined to the fallback surface.

Impact: account takeover within fallback mode, fake balances/keys, misleading billing state; during backend outages the proxy silently serves this surface.

Fix: sign cookies with HMAC (`SESSION_SECRET`), verify signature, never trust `role` from the cookie (derive from server config), require and verify passwords (salted scrypt, in-memory store for demo), return real fallback balance, and gate the whole fallback behind `PROROUTER_ENABLE_DEMO_FALLBACK` (disabled in production by default).

Regression tests: tampered cookie rejected; login with wrong password → 401; register duplicate → 409; `/auth/me` reflects actual balance.

## F-04 (CRITICAL) — `settleReservation` double-debits on retry

Evidence (`apps/api/src/lib/wallet.ts:280-322`):
- `282-289` marks the reservation settled by `requestId` with no status check.
- `296-300` applies the balance decrement.
- `306-318` inserts the ledger row with `onConflictDoNothing()`; the dedupe happens **after** the debit, so a retry with the same `usage:<requestId>` deducts again while the ledger stays single.
- Called from `apps/api/src/routes/chat.ts:333-341`.

Impact: retries (timeouts, double finalize) silently steal user balance with no ledger trail.

Fix: inside the transaction, lock the reservation (`SELECT … FOR UPDATE` by `requestId` **and** `userId`), return unchanged if not `active`; check the ledger key before debiting; let a unique violation abort the whole transaction (remove `onConflictDoNothing`) and translate to a deduped result.

Regression tests: settle twice → balance debited once, one ledger row; settle with wrong user → no-op/404; settle non-active reservation → no debit.

## F-05 (HIGH) — Settle/release do not verify ownership or status

Evidence: `wallet.ts:282-289` and `338-346` update by `requestId` only. `requestId` is `req_` + 12 random bytes (`chat.ts:63-65`), so guessing is hard, but any code path that exposes or reuses ids can cross users; release also flips already-settled rows.

Fix: `WHERE requestId = ? AND userId = ? AND status = 'active'`; return the affected count and no-op otherwise.

## F-06 (HIGH) — `debitWallet` ledger over-reports under concurrency

Evidence: `wallet.ts:119-127` reads `oldBalance`, computes `deducted = min(amount, oldBalance)`, then updates with `GREATEST(balance - amount, 0)`. Two concurrent debits can each record the full amount while the balance only loses the true total.

Fix: single atomic statement (CTE with `SELECT … FOR UPDATE` + `UPDATE … RETURNING`) so `deducted = old - new` is computed from the locked row; insert the ledger from that value.

Regression test: two concurrent debits against a balance smaller than their sum → ledger sum equals actual balance decrease.

## F-07 (HIGH) — Reservation over-commit

Evidence: `wallet.ts:216-254` reads balance and active reservations without locking the wallet row; two concurrent reserves both pass the check. `onConflictDoUpdate` (`250-253`) does not include `userId` in the update guard. Schema confirms `requestId` is globally unique (`packages/database/src/schema/billing.ts:195`).

Fix: lock the wallet row (`FOR UPDATE`) or perform the availability check and insert atomically in SQL; add `userId` to the conflict update predicate.

## F-08 (HIGH) — Silent model substitution

Evidence (`apps/web/app/v1/[...path]/route.ts`):
- `1142`, `1875`, `2028`, `2391`: upstream body forced to `GATEWAY_MODEL` (`deepseek-ai/DeepSeek-V4.1-Flash-1017`) regardless of the requested model.
- `1184`: streaming chunks rewrite `parsed.model` back to the requested name.
- Non-streaming TokenJuice path rewrites response `model` to the requested name (~`2038`).
- Requesty path maps non-DeepSeek/non-tool requests to leanstral/mistral/ling while still returning the requested name.

Impact: users pay for (and believe they receive) a different model; benchmark and quality claims become false; trust and compliance risk.

Fix: route by requested model through the backend catalog; if a fallback is required, return the actual served model in `model` and add an explicit `uno.served_model`/warning header. Never rewrite the served model to the requested one.

## F-09 (MEDIUM) — `finish_reason` not corrected for tool calls

Evidence: `route.ts:1194,1202` forwards upstream `finish_reason` unchanged; a provider returning `"stop"` alongside `tool_calls` makes clients skip tool execution. Only the Anthropic path maps `tool_calls` correctly (`2420-2426`).

Fix: if any tool call delta was emitted, force `finish_reason: "tool_calls"` (OpenAI) / `tool_use` (Anthropic).

## F-10 (MEDIUM) — Anthropic usage and fallback accuracy

Evidence: `route.ts:2216-2219` reports `output_tokens: 1` in `message_start`; `2231-2252` emits a second usage value; non-streaming `/v1/messages` (`2384-2515`) tries only TokenJuice then Nabh, skipping Requesty/other providers used by the OpenAI path.

Fix: emit a single accurate usage at `message_delta` (and `message_start` with prompt tokens only), and reuse one provider chain for both protocols.

## F-11 (MEDIUM) — Stream tool-call normalization

Evidence: `StreamChunkProcessor` (referenced by `tests/agent-coding.test.ts`) forwards upstream `tool_calls` without enforcing `type: "function"` or a numeric streaming `index`; providers omitting them produce malformed deltas.

Fix: normalize every emitted tool-call delta (`type`, `index`, `function.name/arguments` defaults) and add contract tests with sparse upstream deltas.

## F-12 (LOW) — Fabricated fallback data and secrets-test gap

Evidence: `builtin-gateway.ts:232-276,730-797` fabricated keys; `209-219` hardcoded balance; `tests/no-hardcoded-secrets.test.ts` patterns do not cover `rzp_`/Razorpay secrets.

Fix: remove fabricated data (503 in production fallback), extend the secrets test to `rzp_(test|live)_`, `RAZORPAY_KEY_SECRET`, and generic `key_secret` literals.

## F-13 (LOW) — Gateway key rotation edge cases

Evidence: `route.ts:57-67` increments `keyCursor` before use, so rotation starts at index 1; `80-84` `fetchGatewayWithRetry` can return the last non-OK response after exhausting attempts.

Fix: select at `cursor % len` then increment; surface the final status/body instead of a stale response.

## Verified facts

- Fastify chat endpoint is authenticated and billed (`chat.ts:142-149,236-262,318-402`).
- Fastify sessions are DB-backed random tokens, not forgeable (`auth.ts:16-62`).
- Wallet ledger has a unique idempotency index (`billing.ts:63-66`), which the settle path defeats by using `onConflictDoNothing` after the debit.
- Baseline tests: 9 files / 67 tests pass. Existing tests do not cover F-01–F-07.
- `apps/web/AGENTS.md` requires reading `node_modules/next/dist/docs/` before Next.js edits (relevant for F-01 fixes).

## Phase plan

1. **[DONE]** P1 — Money integrity**: rewrite `debitWallet`/`settleReservation`/`releaseReservation`/`reserveBalance` atomically; add wallet regression tests.
2. **[DONE]** P2 — Fallback hardening**: signed cookies, password verification, real balances, no hardcoded keys, no free credit, demo-mode gate; extend secrets test.
3. **[DONE]** P3 — Public gateway auth**: proxy OpenAI routes to Fastify with caller credentials; convert Anthropic `/v1/messages` to the backend; disable anonymous promo inference.
4. **[DONE]** P4 — Routing honesty**: remove silent model substitution; report served model; fix `finish_reason`; normalize stream tool calls.
5. **[DONE]** P5 — Protocol parity**: accurate Anthropic usage, unified provider chain, compatibility tests for Claude Code/Cline/Kilo/OpenCode/Continue.

## Remediation outcomes (P1-P5)

Verified 2026-11-09: `npm test` 13 files / 114 tests passing; `npx tsc --noEmit -p apps/web` clean; `npm --prefix apps/web run build` succeeds (Next.js 16.4.5, 21/21 static pages).

| ID | Fix | Regression tests | Status |
|----|-----|------------------|--------|
| F-01 | `handleV1` requires a backend credential or explicit demo mode; inference proxies to Fastify with caller credentials; demo gated by `PROROUTER_ENABLE_DEMO_GATEWAY` | `tests/public-gateway-auth.test.ts` | Fixed |
| F-02 | Fallback Razorpay requires env secrets, known order, HMAC signature, and credits once per payment id; promo code redeem-once with expiry | `tests/fallback-gateway.test.ts` | Fixed |
| F-03 | HMAC-signed `uno_session`; scrypt passwords; role derived server-side; real fallback balances; keys endpoint 503 | `tests/fallback-gateway.test.ts` | Fixed |
| F-04 | `settleReservation` locks reservation, guards ownership/status, applies ledger-first idempotent debit with 23505 retry | `tests/wallet-atomicity.test.ts` | Fixed |
| F-05 | Settle/release update by `requestId` + user ownership + status; guarded update results checked | `tests/wallet-atomicity.test.ts` | Fixed |
| F-06 | `debitWithinTx` uses row lock and `GREATEST` clamp; ledger amount equals applied amount | `tests/wallet-atomicity.test.ts` | Fixed |
| F-07 | `reserveBalance` row-locks the wallet, checks available balance, and guards conflict update by user | `tests/wallet-atomicity.test.ts` | Fixed |
| F-08 | Silent model rewrites removed; `x-prorouter-requested-model` / `x-prorouter-served-model` / `x-prorouter-model-substituted` headers and served-model stream chunk | `tests/gateway-routing-honesty.test.ts` | Fixed |
| F-09 | `normalizeFinishReason` emits `tool_calls` when tool calls are present at every finish site | `tests/gateway-routing-honesty.test.ts` | Fixed |
| F-10 | Anthropic streaming buffers partial SSE lines, captures upstream `usage`, reports it in `message_delta`, and defers stop emission until usage arrives; non-streaming `/v1/messages` now tries Requesty with the same narrowing rules as chat | `tests/gateway-routing-honesty.test.ts` | Fixed |
| F-11 | `StreamChunkProcessor` rewritten with boundary-safe think-tag parsing, delta flushing, and tail emission at every finish path | `tests/gateway-routing-honesty.test.ts`, `tests/agent-coding.test.ts` | Fixed |
| F-12 | Fallback fabricated keys removed (503); secrets test extended for Razorpay and generic secret literals | `tests/fallback-gateway.test.ts`, `tests/no-hardcoded-secrets.test.ts` | Fixed |
| F-13 | Key cursor selects before increment; cooling keys skipped with earliest-cooldown fallback; retry surfaces final response | `tests/gateway-routing-honesty.test.ts` | Fixed |

Known deviation: Anthropic streaming `message_start` reports an estimated input-token count; the authoritative value is in `message_delta`. `GET /v1/models` now proxies the Fastify catalog for API-key callers (local catalog for anonymous/session/demo callers); documented in `docs/TEST_RESULTS.md`.