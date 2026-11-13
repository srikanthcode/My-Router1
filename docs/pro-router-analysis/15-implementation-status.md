# 15 — Implementation Status

Statuses: **FULLY IMPLEMENTED** · **PARTIALLY IMPLEMENTED** · **CONFIGURED BUT NOT CONNECTED** · **NOT IMPLEMENTED** · **NEEDS VERIFICATION**

## 1. Backend platform

| Feature | Status | Evidence / note |
|---|---|---|
| Fastify app, plugins, error envelope | FULLY IMPLEMENTED | `app.ts`, shared errors |
| Zod request validation | FULLY IMPLEMENTED | Route schemas |
| Email/password auth + sessions | FULLY IMPLEMENTED | scrypt, hashed tokens, cookies |
| Gmail-only registration policy | FULLY IMPLEMENTED | Auth route validation |
| API key create/list/revoke | FULLY IMPLEMENTED | `pro_sk_live_`, hash-only storage |
| Key expiry + spend limits + model allowlist | FULLY IMPLEMENTED | Schema + enforcement points |
| Rate limiting (IP/user/key) | FULLY IMPLEMENTED | In-memory, per instance |
| Free quota buckets | FULLY IMPLEMENTED | Atomic upserts |
| Catalog APIs (models/providers/pricing) | FULLY IMPLEMENTED | 11 route modules |
| Generated catalog (300 aliases, 500+ profiles) | FULLY IMPLEMENTED | Synthetic; single upstream fallback |
| Routing engine (intent, capability, scoring) | FULLY IMPLEMENTED | Deterministic scoring |
| Health-aware circuit breaking | PARTIALLY IMPLEMENTED | Key mismatch suspected |
| Multi-backend fallback (pre-token) | FULLY IMPLEMENTED | `fallback-manager.ts` |
| Streaming chat completions | FULLY IMPLEMENTED | SSE + usage chunk |
| Tool-call pass-through | PARTIALLY IMPLEMENTED | Adapter-dependent; no server-side execution |
| Server-side tool execution | NOT IMPLEMENTED | No executor found |
| Embeddings / images / audio | NOT IMPLEMENTED | Chat-only adapters |
| Wallet + immutable ledger | FULLY IMPLEMENTED | Integer paise, idempotency |
| Streaming reservations | FULLY IMPLEMENTED | Hold/settle/release |
| Razorpay checkout/verify/webhook | FULLY IMPLEMENTED | Signature checks |
| Stripe webhook | FULLY IMPLEMENTED | Replay log |
| Subscriptions/renewals | PARTIALLY IMPLEMENTED | Tables exist; no renewal job |
| Refunds/invoices/tax | NOT IMPLEMENTED | Manual only |
| Promotions (48h + Astra) | FULLY IMPLEMENTED | Gift codes, entitlements |
| Usage/dashboard APIs | FULLY IMPLEMENTED | Denormalized `requests` |
| SSE dashboard events | PARTIALLY IMPLEMENTED | In-process; breaks on multi-instance |
| Admin APIs (providers/pricing/users/settings) | FULLY IMPLEMENTED | Route coverage broad; UI depth unverified |
| Audit logging | PARTIALLY IMPLEMENTED | Table + writes; coverage unverified |
| Notifications/incidents | PARTIALLY IMPLEMENTED | Schema + APIs; delivery jobs unverified |
| Email delivery | CONFIGURED BUT NOT CONNECTED | `email_log` exists; provider wiring unverified |
| Persona/impersonation layer | FULLY IMPLEMENTED | `persona.ts` + output sanitization |
| Mongo persistence | PARTIALLY IMPLEMENTED | Client + schema; store implementations unverified |
| DataStore abstraction implementations | NEEDS VERIFICATION | `sql-store.ts`/`mongo-store.ts` absent from glob |
| Metrics/tracing | NOT IMPLEMENTED | No exporter found |
| Background workers/scheduler | PARTIALLY IMPLEMENTED | Some jobs referenced; no durable worker |

## 2. Frontend

| Feature | Status | Note |
|---|---|---|
| Marketing pages (home, pricing, providers, rankings, docs, status, legal) | FULLY IMPLEMENTED | Page files present |
| Auth pages | FULLY IMPLEMENTED | Login/signup |
| Chat UI with streaming | PARTIALLY IMPLEMENTED | Tool-call rendering needs QA |
| Conversation persistence UI | NEEDS VERIFICATION | Tables exist; wiring unread |
| Dashboard overview/usage/activity/inspector | PARTIALLY IMPLEMENTED | Pages + APIs; internals unread |
| Wallet/checkout UI | PARTIALLY IMPLEMENTED | Text-mode pages exist |
| Astra/redeem UI | PARTIALLY IMPLEMENTED | Pages present |
| Admin console | PARTIALLY IMPLEMENTED | Broad API, UI depth unverified |
| `/api` proxy with cooldown + fallback | FULLY IMPLEMENTED | 2.5 s timeout, 45 s cooldown |
| `/v1` OpenAI-compatible gateway | FULLY IMPLEMENTED | Includes demo mode |
| Demo-mode billing bypass | PARTIALLY IMPLEMENTED | Intentional demo; billing risk |
| Responsive/mobile audit | NEEDS VERIFICATION | No audit artifacts |
| Accessibility (WCAG) | NEEDS VERIFICATION | No audit artifacts |
| i18n | NOT IMPLEMENTED | English only |

## 3. Routing and model policy

| Feature | Status |
|---|---|
| Task/intent classification | FULLY IMPLEMENTED |
| Capability matching (vision/tools/context) | FULLY IMPLEMENTED |
| Weighted scoring (quality/cost/context) | FULLY IMPLEMENTED |
| Residency/preference adjustments | FULLY IMPLEMENTED |
| Auto model resolution | FULLY IMPLEMENTED |
| Alias resolution | FULLY IMPLEMENTED |
| Free-tier priority queue | PARTIALLY IMPLEMENTED (in-memory) |
| Provider price sync | PARTIALLY IMPLEMENTED |
| Dynamic concurrency/adaptive routing | NOT IMPLEMENTED |

## 4. Security and compliance

| Feature | Status |
|---|---|
| Password hashing (scrypt) | FULLY IMPLEMENTED |
| Session token hashing | FULLY IMPLEMENTED |
| API key hashing + prefix display | FULLY IMPLEMENTED |
| Provider credential encryption (AES-256-GCM) | FULLY IMPLEMENTED |
| CSRF protection (SameSite=Lax only) | PARTIALLY IMPLEMENTED |
| Admin role checks | FULLY IMPLEMENTED |
| Secret scanning test | PARTIALLY IMPLEMENTED (unverified coverage) |
| Persona impersonation controls | PARTIALLY IMPLEMENTED (disclosure/ethics gap) |
| GDPR export/delete | NOT IMPLEMENTED |
| Retention policies | NOT IMPLEMENTED |
| SOC2/ISO evidence | NOT IMPLEMENTED |

## 5. Testing and operations

| Feature | Status |
|---|---|
| Unit/integration tests (13 files) | PARTIALLY IMPLEMENTED |
| End-to-end tests | NOT IMPLEMENTED |
| Load/performance tests | NOT IMPLEMENTED |
| Contract tests per provider | NOT IMPLEMENTED |
| CI pipeline | NEEDS VERIFICATION |
| Docker/deployment manifests | NEEDS VERIFICATION |
| Backups/restore | NOT IMPLEMENTED |
| Runbooks/on-call | NOT IMPLEMENTED |
| Status page data source | PARTIALLY IMPLEMENTED (`/status`, incidents schema) |

## 6. Status rollup

| Status | Count (approx.) |
|---|---|
| FULLY IMPLEMENTED | 30 |
| PARTIALLY IMPLEMENTED | 22 |
| CONFIGURED BUT NOT CONNECTED | 1 |
| NOT IMPLEMENTED | 14 |
| NEEDS VERIFICATION | 9 |

The product is a functional single-instance MVP with unusually complete billing and routing internals. The largest gaps are durable/distributed state, non-chat modalities, compliance/retention, and independent verification of several persistence and health-check paths.
