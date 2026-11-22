# ProRouter: Complete Architecture, Catalog, and Pricing Report

> **Scope:** ProRouter backend and web application, the 500-profile runtime catalog, the 20 seeded database models, the 300 Pro alias rows, and every pricing layer that a request can encounter.
>
> **Source basis:** Current repository source under `packages/`, `apps/api/`, and `apps/web/`; generated catalog output in `docs/_catalog_dump.json` and `docs/_catalog_grouped.md`; architecture notes in `docs/pro-router-analysis/`.
>
> **Convention:** ₹ amounts are shown per 1,000,000 tokens unless stated otherwise. USD amounts are per 1,000,000 tokens. Wallet balances and database prices use integer paise (₹1 = 100 paise). Context windows and output limits are in tokens.
>
> **Important:** The 500 runtime profiles are routing profiles, not 500 independently hosted upstream models. Some are explicit legacy or verified-cost profiles; most are generated from category templates. The 300 "Pro" aliases are database rows that all route to `deepseek-ai/DeepSeek-V4.1-Flash-1017`.

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [System architecture](#2-system-architecture)
3. [The catalog model](#3-the-catalog-model)
4. [Pricing](#4-pricing)
5. [Findings and operational gaps](#5-findings-and-operational-gaps)
6. [Verification and provenance](#6-verification-and-provenance)
7. [Appendix A: Full 500-profile catalog](#appendix-a-full-500-profile-catalog)
8. [Appendix B: API registration summary](#appendix-b-api-registration-summary)

---

## 1. Executive summary

ProRouter is an India-focused AI gateway with a marketing site, model catalog, OpenAI-compatible chat gateway, wallet, dashboard, API-key management, promotions, and admin surface. The backend is a Fastify 5 API backed by Drizzle ORM over PGlite or PostgreSQL, with an optional MongoDB mirror. The web application is a separate Next.js 16 application that proxies browser calls through `/api/[...path]` and exposes an OpenAI-compatible surface at `/v1/[...path]`.

The catalog has three distinct layers that are easy to confuse:

| Layer | Count | Where it lives | What it represents |
|---|---:|---|---|
| Runtime profiles | **500** | `ModelProfileRegistry`, generated in `catalog-generator.ts` | Routing profiles with capabilities, context, pricing, backends, and fallbacks |
| Seeded database models | **20** | `packages/database/src/seed.ts` | Concrete retail model rows with explicit paise pricing |
| Pro alias rows | **300** | `packages/database/src/catalog-aliases.ts` | 30 families × 10 variants; all route to DeepSeek V4.1 Flash |

Consequently, the database can contain **320 model rows** while the public profile catalog contains **500 profiles**. The 500-profile catalog does not contain the 300 aliases, and the 320-row database does not contain the 461 generated profiles.

Key facts:

- **500 runtime profiles**: 22 legacy explicit + 17 verified-cost explicit + 461 generated.
- **12 categories**: general, reasoning, coding, agentic, research, math/science, multilingual, vision, fast, long-context, creative, business.
- **Only four free profiles**: `deepseek-v4.1-flash`, `deepseek-v4.1-flash-1017`, `qwen3.8-27b`, and `qwen/qwen3.8-27b`.
- **Provider adapters**: OpenAI, Anthropic, and Freemodels, plus a backend key pool for ProRouter Gateway, Requesty, and Groq.
- **API surface**: 107 static route registrations across 12 modules.
- **Database schema**: 44 tables across 6 schema modules.
- **Pricing formula**: `(upstream cost × (1 + reserve + markups)) / (1 − target margin)`, with defaults of 10% operational reserve and 30% gross margin.
- **Rate layers do not agree**: generated-profile billing uses a fixed ₹80/USD, display/tier pricing uses a configurable `USD_TO_INR_RATE` defaulting to ₹97, and the shared constants also define a ₹88 "market" rate.
- **The catalog advertises "500+"** in UI copy, but the runtime profile catalog is exactly 500.

### 1.1 What is production-ready

The codebase builds and tests cleanly as of the final verification run:

- backend TypeScript typecheck: passed;
- web TypeScript check: passed;
- test suite: **150/150 passed**;
- Next.js build: **21/21 static pages generated**.

The core request path is implemented end to end: auth, model resolution, candidate hydration, routing, provider invocation, fallback, wallet charging, request-attempt persistence, and SSE streaming. The main caveats are pricing consistency, the synthetic nature of the generated catalog, a few routing/health identity mismatches, and the fact that generated profiles and aliases are not stored in the same catalog layer.

---

## 2. System architecture

### 2.1 Product surfaces

| Surface | Purpose | Primary implementation |
|---|---|---|
| Marketing site | Positioning, model catalog, pricing, docs, trust pages | `apps/web/app/*` |
| Model catalog | Browse/search 500 profiles; model detail pages | `/models`, `/models/[slug]` |
| Chat | Session-authenticated chat UI plus OpenAI-compatible gateway | `/chat`, `/v1/chat/completions` |
| Dashboard | Wallets, usage, keys, requests, settings | `/dashboard/*` |
| Admin | Model, provider, plan, promotion, user, and request administration | `/admin` |
| Public API | OpenAI-compatible model list and chat completions | Fastify API on port 4000 |
| Developer API keys | `pro_sk_live_...` keys with revocation, expiry, spend limits, and model allowlists | `/api/keys`, `/v1` |

### 2.2 Runtime topology

```mermaid
flowchart LR
  C[Browser / SDK / CLI] --> W[Next.js web app]
  W -->|/api/[...path] proxy| A[Fastify API :4000]
  W -->|/v1 OpenAI-compatible proxy| A
  A --> AUTH[Session / API key / admin auth]
  A --> R[Model resolution and routing]
  R --> DB[(PGlite or PostgreSQL)]
  R --> REG[500-profile registry]
  R --> H[Provider health monitor]
  R --> FB[Fallback manager]
  FB --> OAI[OpenAI adapter]
  FB --> ANT[Anthropic adapter]
  FB --> FREE[Freemodels adapter]
  A -. optional mirror .-> MONGO[(MongoDB)]
  A --> RAZORPAY[Razorpay]
```

Two properties matter operationally:

1. **PGlite is single-process.** It serializes writers and does not provide multi-instance coordination. The API's routing health state and in-memory caches are also process-local.
2. **The web proxy is a separate hop.** `/api/[...path]` has a 2.5-second timeout and a 45-second cooldown. `/v1/*` has its own OpenAI-compatible proxy path and demo-mode fallback.

### 2.3 Repository layout

| Path | Role |
|---|---|
| `apps/api` | Fastify API, route modules, auth, billing, routing orchestration, seeded DB bootstrap |
| `apps/web` | Next.js App Router site, dashboard, catalog, chat UI, proxy routes |
| `packages/shared` | Pricing engine, money helpers, persona, auth utilities, shared types |
| `packages/database` | Drizzle schema, migrations, seed data, alias seeds, optional Mongo mirror |
| `packages/routing` | 500-profile generator/registry, capability matcher, router, health, fallback, catalog service |
| `packages/providers` | OpenAI, Anthropic, and Freemodels adapters and adapter registry |
| `scripts` | Build/start scripts, catalog dumps, verification helpers |
| `docs` | Architecture notes, compatibility reports, test results, this report |

### 2.4 Request lifecycle

1. **Authenticate.** The API resolves a public route, a session cookie (`uno_session`), a bearer API key (`pro_sk_live_...`), or an admin session.
2. **Parse and validate.** Request bodies are validated with Zod. OpenAI-compatible requests use the chat-completions shape.
3. **Resolve the model.** The pipeline checks DB models and aliases, profile IDs, `prorouter/` and `uno/` prefixes, and known shortcuts (`sonnet`, `opus`, `haiku`). `prorouter/auto` triggers automatic model selection. Unknown IDs are rejected rather than silently mapped to a different model.
4. **Hydrate candidates.** DB provider links are loaded with effective pricing and latest health. If a profile has no DB links, the profile's routing chain is converted into dynamic candidates.
5. **Route.** `routeRequest()` filters unusable candidates, applies optional tool support and budget preferences, scores the remaining candidates, and returns a primary route plus fallback chain.
6. **Decrypt provider credentials.** Provider keys are loaded from the encrypted credential store or environment-backed pools.
7. **Invoke the upstream adapter.** The adapter call is bounded by provider timeout/retry settings.
8. **Apply fallback rules.** Retry the next provider only when the failure is retryable and tokens have not been streamed. A failure after tokens have been emitted becomes `abort_error`; a safety refusal becomes `preserve_refusal`.
9. **Charge and record.** Wallet debit, ledger entry, request row, and per-attempt records are written. Streaming requests emit SSE frames and a final usage/metadata frame.

### 2.5 Model resolution

Important behaviors from `apps/api/src/lib/pipeline.ts`:

- `MODEL_ALIASES` is consulted for short names and legacy aliases.
- Profile lookup precedes alias lookup for `profile-*` IDs.
- `resolveModelInput()` accepts `slug`, `prorouter/slug`, `uno/slug`, `deepseek-ai/slug`, other provider prefixes, and short model-family shortcuts.
- `prorouter/auto` selects an automatic model using the profile registry and request requirements.
- DB models and aliases are priced through `resolveEffectivePricing()`: an active pricing tier wins when the model's `pricing_tier` matches; otherwise explicit `model_pricing` is used.
- Generated profiles that are not represented in the DB fall back to the profile's `customerPricingUsd`, converted at a **fixed ₹80/USD** in `loadModelContext()`.

That last point is a central pricing distinction and is covered in detail in §4.10.

### 2.6 Routing and scoring

`packages/routing/src/index.ts` contains the actual `routeRequest()` used for candidate selection. It is deterministic but not the four-factor quality/cost/context/latency model described in some architecture notes.

Candidate eligibility (`isUsable()`):

- exclude `disabled`, `degraded`, or `unknown` provider/link states;
- exclude candidates whose health is explicitly unavailable;
- treat health older than 15 minutes as stale unless the latest health is available;
- optionally require native tool-call support (`requiresTools`);
- budget filter: keep candidates when `maxInputCostPerMillion` is undefined, the candidate is free, or the candidate's input price is within the maximum. If the filter removes every candidate, routing falls back to all usable candidates rather than failing outright.

Scoring, per candidate:

```text
score = 1000
      − 2 × min(linkPriority, providerPriority)
      + successRateBp / 100
      − min(200, round(latencyMs / 50))
      + 50   if provider is active
      − 500  if provider status is unknown
      − 10000 if non-free and over the input budget
      + 200  if preferred free routing and candidate is free
      + 10   if plan is ultra
      − 5    if plan is free
```

Tie-breaking is intended to use provider priority and then provider slug. `routeRequest()` returns `null` when no candidate is usable; otherwise it returns primary, fallback chain, scores, and a human-readable trace.

**Health identity mismatch.** In practice, three call sites use different keys:

- `IntelligentModelRouter` checks `ProviderHealthMonitor.isAvailable(primaryBackend.id, primaryBackend.provider)` — keyed by backend ID;
- profile fallback hydration checks `isAvailable(backend.provider)` — keyed by provider slug;
- success/failure recording uses `recordSuccess(candidate.providerSlug, ...)` and `recordFailure(candidate.providerSlug, ...)` — keyed by provider slug.

Because the monitor stores records under the first argument passed to it, backend-ID lookups generally do not see records written under provider slugs. The profile router's health gate can therefore report a backend healthy while provider-level failures exist. The monitor is also process-local and does not share cooldowns across API instances.

### 2.7 Provider adapters

| Adapter | File | Role |
|---|---|---|
| OpenAI | `packages/providers/src/openai.ts` | OpenAI-compatible chat/completions, tools, streaming |
| Anthropic | `packages/providers/src/anthropic.ts` | Native Anthropic messages API translation |
| Freemodels | `packages/providers/src/freemodels.ts` | Free-model provider path |
| Registry | `packages/providers/src/registry.ts` | Adapter lookup and dispatch |

Provider credentials and backend pools are separate concepts:

- user-facing provider credentials are stored per user/provider;
- backend key pools exist in the pipeline for ProRouter Gateway, Requesty, and Groq;
- dynamic candidates are assembled from the profile route chain rather than from `model_providers` rows.

### 2.8 Persistence

The database has **44 tables across 6 schema modules**:

| Schema module | Tables | Main concerns |
|---|---:|---|
| `auth.ts` | 3 | users, sessions, API keys |
| `billing.ts` | 8 | wallets, transactions, ledger, credit packs, purchases, Razorpay records |
| `catalog.ts` | 16 | models, aliases, providers, links, pricing, capabilities, limits, tiers, health |
| `platform.ts` | 7 | settings, feature flags, audit, events, operational records |
| `promotions.ts` | 5 | campaigns, codes, redemptions, discounts, attribution |
| `requests.ts` | 5 | requests, attempts, usage, costs, request metadata |

Operational notes:

- PGlite serializes writers. There is no evidence of multi-instance write coordination or a distributed lock in this layer.
- MongoDB is an optional mirror/analytics store; it is not the source of truth for wallets, requests, or API auth.
- Settings are cached for 15 seconds.
- Mongo client defaults are `maxPoolSize: 10`, `minPoolSize: 0`, 15-second selection timeout.
- Indexes cover token/key hashes, email, wallet idempotency, and user/time access patterns.
- The `requests` table has no built-in retention or partitioning policy in the inspected schema.

### 2.9 API surface

There are exactly **107 static `app.<method>(` registrations** across 12 modules:

| Module | Routes |
|---|---:|
| admin | 43 |
| auth | 6 |
| catalog | 17 |
| chat | 4 |
| dashboard | 8 |
| events | 2 |
| keys | 4 |
| messages | 2 |
| plans | 1 |
| promotions | 9 |
| usage | 3 |
| wallet | 8 |
| **Total** | **107** |

The OpenAI-compatible chat routes are in `apps/api/src/routes/chat.ts`:

- `GET /v1/models`
- `GET /v1/models/:id`
- `POST /v1/chat/completions`
- `POST /chat/completions`

The catalog API is in `apps/api/src/routes/catalog.ts`. It exposes `/catalog/profiles`, `/api/catalog/profiles`, and `/models`-oriented handlers. The public profiles endpoint accepts `q`, `category`, `provider`, `tier`, `promotionalOnly|free`, `paidOnly|paid`, `pricingPendingOnly|pending`, `pageSize`, and `sort`, and defaults to a page size of 50.

**Catalog-tier gap:** the route passes `tier: q.tier` into `ModelCatalogService.list()`. `list()` accepts `tier` but does not pass it into `query()`, and `CatalogQueryOptions` has no `tier` field. The `tier` query parameter is therefore currently ignored.

Standard error envelope:

```json
{ "error": { "message": "…", "type": "…", "code": "…", "param": "…" } }
```

### 2.10 Authentication and key handling

- Signup is restricted to standard `@gmail.com` addresses. Temporary-email domains and `+` aliases are rejected.
- Passwords are hashed with scrypt: `N=16384`, `r=8`, `p=1`.
- Password policy: at least 8 characters, including a letter and a number.
- Session cookie: `uno_session`, httpOnly, `sameSite=lax`, path `/`.
- API keys: `pro_sk_live_` prefix plus a 24-byte base64url random component.
- API keys are stored as SHA-256 hashes, not plaintext.
- Keys support revocation, expiry, per-key spend limits, and allowed-model restrictions.
- Admin routes require an admin session and are counted separately in the route inventory.

### 2.11 Streaming

The streaming contract is OpenAI-compatible SSE:

```text
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

Frames are:

```text
data: <JSON>\n\n
...
data: [DONE]\n\n
```

A final usage/metadata chunk may precede `[DONE]`. Once any token has been emitted, a provider failure must become an `abort_error`; it must not silently switch providers and splice two different completions together. Safety/moderation refusals are preserved as refusals, not retried as generic failures.

### 2.12 Performance and operational characteristics

- Production start uses Node with `--max-old-space-size=384`.
- No container definition or compose file was found at the repository root; deployment is process/Node-oriented.
- The web proxy's 2.5-second timeout and 45-second cooldown are hard-coded.
- Routing, health, and settings caches are process-local.
- No dedicated metrics/tracing exporter was found in the inspected source.
- The 500-profile catalog is computed on import; it is not a database table.
- The grouped catalog table is 157,617 bytes and is suitable for static documentation, but should not be treated as a transactional source of truth.

### 2.13 Implementation status

| Area | Status | Notes |
|---|---|---|
| Auth | Implemented | Gmail-only signup, scrypt, sessions, API keys, admin |
| Model resolution | Implemented | DB, aliases, profile IDs, prefixes, shortcuts, auto |
| Routing | Implemented | Deterministic scoring, budget preference, tool filter, fallback |
| Provider adapters | Implemented | OpenAI, Anthropic, Freemodels |
| Streaming | Implemented | SSE with abort/refusal handling rules |
| Billing | Implemented | Wallet, ledger, tiers, packs, promotions, Razorpay paths |
| Catalog API | Implemented with gap | 500 profiles, but `tier` filtering is ignored |
| Health sharing | Process-local | No distributed health/cooldown state |
| Generated profiles | Implemented | Synthetic template-based, not independently hosted |
| Pro aliases | Implemented | 300 DB rows; all route to DeepSeek V4.1 Flash |

---

## 3. The catalog model

### 3.1 Three catalogs, three jobs

| Catalog | Count | Source | Public exposure | Persistence |
|---|---:|---|---|---|
| Runtime profiles | 500 | `generateProfiles()` in `packages/routing/src/catalog-generator.ts` | `/catalog/profiles`, `/api/catalog/profiles`, `/api/models/pricing` | Computed in memory |
| DB models | 20 | `packages/database/src/seed.ts` | `/v1/models`, admin, model detail paths | DB rows |
| Pro aliases | 300 | `packages/database/src/catalog-aliases.ts` | DB/admin/model resolution | DB rows |

`ModelCatalogService.query()` pages the **500-profile** registry. It defaults to 50 results, caps a page at 600, supports text search across ID/name/description/category/provider/canonical/tags, and sorts by popularity, rank, rating, score, newest, lowest input, lowest output, highest context, alphabetical, price ascending, and price descending.

The `/models` page is DB-backed via the API's `listModels()`. It blends registry profiles only while the database model count is below 100. With 320 DB rows, blending is inactive.

### 3.2 Composition

| Origin | Count | Meaning |
|---|---:|---|
| Legacy explicit | 22 | Pre-existing frontend identities, all paid |
| Verified-cost explicit | 17 | Explicit profiles with verified upstream costs and live backends |
| Generated | 461 | Template-generated profiles that fill category quotas |
| **Total** | **500** | |

All 461 generated profiles are paid (`isFree: false`) and marked `pricingStatus: "approved"`. Generated profiles do not carry benchmark scores; their benchmark arrays are empty. Capabilities and behavior defaults come from category templates.

### 3.3 Category distribution

| Category | Profiles | Tier mix | Origin mix | Generated quota |
|---|---:|---|---|---:|
| General | 70 | standard 68, lite 2 | Legacy 4, Generated 66 | 66 |
| Reasoning | 65 | ultra 2, max 1, expert 2, reason 56, standard 4 | Legacy 6, Verified 4, Generated 55 | 55 |
| Coding | 85 | expert 2, code 77, standard 6 | Legacy 5, Verified 6, Generated 74 | 74 |
| Agentic | 45 | code 45 | Generated 45 | 45 |
| Research | 45 | max 1, expert 44 | Legacy 1, Generated 44 | 44 |
| Math/science | 30 | reason 30 | Generated 30 | 30 |
| Multilingual | 35 | standard 35 | Verified 2, Generated 33 | 33 |
| Vision | 35 | standard 35 | Verified 2, Generated 33 | 33 |
| Fast | 30 | flash 6, lite 24 | Legacy 4, Verified 3, Generated 23 | 23 |
| Long-context | 25 | standard 2, ultra 23 | Legacy 2, Generated 23 | 23 |
| Creative | 20 | standard 20 | Generated 20 | 20 |
| Business | 15 | standard 15 | Generated 15 | 15 |
| **Total** | **500** | | **22 + 17 + 461** | **461** |

### 3.4 Tier distribution

| Tier | Profiles |
|---|---:|
| standard | 185 |
| code | 122 |
| reason | 86 |
| expert | 48 |
| lite | 26 |
| ultra | 25 |
| flash | 6 |
| max | 2 |
| **Total** | **500** |

The pre-generated explicit profiles account for 39 profiles and the tier counts shown in the category table; the remaining tier counts are supplied by generated profiles.

### 3.5 Backend concentration

All profiles carry a routing policy with a primary backend, usually a secondary backend, and a final fallback. The final fallback is always `prorouter/deepseek-v4.1-flash`. The 22 legacy profiles have no secondary backend; the other 478 do.

Primary backend concentration:

| Primary backend | Profiles |
|---|---:|
| `requesty/nemotron-3-ultra-550b-a55b` | 124 |
| `prorouter/deepseek-v4.1-flash` | 110 |
| `groq/qwen3.8-27b` | 76 |
| `requesty/leanstral-1-5` | 45 |
| `requesty/gemma-4-31b-it` | 34 |
| `openrouter/nemotron-3.5-super-vl` | 34 |
| `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | 31 |
| `requesty/ling-3.1-flash` | 24 |
| `groq/gpt-oss-120b` | 16 |
| Six singleton backends | 6 |

Secondary backend concentration is also high: `groq/gpt-oss-120b` appears as secondary on 195 profiles, `requesty/nemotron-3-ultra-550b-a55b` on 89, `groq/qwen3.8-27b` on 78, and the remaining profiles use a long tail of Requesty, OpenRouter, Groq, Nabh, and ProRouter backends.

This is a **routing catalog**, not a hosting catalog. A profile name does not imply that the named model is hosted by ProRouter or that the upstream backend is the model whose name appears in the profile.

### 3.6 Profile construction rules

Generated profiles are built from category specs rather than from a database. The rules in `catalog-generator.ts` are:

- Category specs define a `targetCount`, prefix, tier, upstream input/output costs, primary/secondary/final backends, capabilities, behavior defaults, and subdomains.
- The generator fills the remainder of each category after legacy and verified profiles.
- Context window is 1,048,576 for `long_context`, 128,000 for `vision`, and 131,072 otherwise.
- Max output is 16,384 for `fast`, and 32,768 otherwise.
- Status is `production`; free is `false`; pricing status is `approved`.
- Generated profiles include a system prompt/behavior defaults derived from the category template.
- Popularity is `9000 − (globalRank % 1000)`.
- `routingPolicy` includes primary, secondary, final fallback, and capability keys.
- `canonicalModelId` is resolved by the generator and may be promotional; the profile ID is the stable identifier.
- Duplicate profile IDs throw during generation.

Generated profiles therefore answer the question “what routing shape and category price should this slot use?”, not “what independently evaluated model is this?” The report should not present generated names as independently benchmarked models.

### 3.7 The four free profiles

| Profile ID | Canonical/backend | Context | Max output | Notes |
|---|---|---|---:|---:|---|
| `deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` | 262,144 | 128,000 | Free canonical profile |
| `deepseek-v4.1-flash-1017` | `prorouter/deepseek-v4.1-flash` | 262,144 | 128,000 | Free canonical profile |
| `qwen3.8-27b` | `groq/qwen3.8-27b` | 131,072 | 64,000 | Free canonical profile |
| `qwen/qwen3.8-27b` | `groq/qwen3.8-27b` | 131,072 | 64,000 | Free canonical profile |

The 300 Pro aliases are **not** free, even though one of their upstream paths is DeepSeek V4.1 Flash. Aliases are priced by pricing tier, not by the canonical model's free status.

### 3.8 Seeded database models

The 20 seed models are concrete DB rows with explicit context, output, and paise retail prices:

| Model | Context | Max output | Retail input ₹/1M | Retail output ₹/1M | Free |
|---|---:|---:|---:|---:|---|
| `gpt-4.1` | 128,000 | 16,384 | ₹200.00 | ₹800.00 | No |
| `gpt-4o` | 128,000 | 16,384 | ₹200.00 | ₹800.00 | No |
| `deepseek-v4.1-flash-1017` | 262,144 | 128,000 | ₹17.60 | ₹35.20 | Yes |
| `deepseek-v4.1-flash` | 262,144 | 128,000 | ₹17.60 | ₹35.20 | Yes |
| `qwen/qwen3.8-27b` | 131,072 | 64,000 | ₹25.10 | ₹100.60 | Yes |
| `qwen3.8-27b` | 131,072 | 64,000 | ₹25.10 | ₹100.60 | Yes |
| `claude-sonnet` | 200,000 | 64,000 | ₹377.00 | ₹1,886.00 | No |
| `claude-opus` | 200,000 | 64,000 | ₹629.00 | ₹3,143.00 | No |
| `gemini-pro` | 1,000,000 | 64,000 | ₹19.00 | ₹75.00 | No |
| `grok` | 131,072 | 64,000 | ₹63.00 | ₹251.00 | No |
| `mistral-large` | 128,000 | 64,000 | ₹251.00 | ₹754.00 | No |
| `glm-5.3` | 200,000 | 128,000 | ₹75.40 | ₹226.30 | No |
| `kimi-k3` | 200,000 | 64,000 | ₹100.60 | ₹301.70 | No |
| `gpt-oss-120b` | 131,072 | 32,768 | ₹37.70 | ₹150.90 | No |
| `gpt-oss-20b` | 131,072 | 16,384 | ₹10.10 | ₹30.20 | No |
| `nemotron-3-ultra-550b-a55b` | 1,048,576 | 65,536 | ₹88.00 | ₹264.00 | No |
| `nemotron-3-nano-omni-30b-a3b-reasoning` | 131,072 | 20,480 | ₹18.90 | ₹56.60 | No |
| `gemma-4-31b-it` | 262,144 | 8,192 | ₹17.60 | ₹52.80 | No |
| `leanstral-1-5` | 262,144 | 32,768 | ₹15.10 | ₹45.30 | No |
| `ling-3.1-flash` | 262,144 | 32,768 | ₹10.10 | ₹30.20 | No |

### 3.9 The 300 Pro aliases

`PRO_ALIAS_FAMILIES` contains 30 names: orion, nova, atlas, vega, lyra, sirius, phoenix, titan, aurora, zephyr, onyx, ember, cobalt, quasar, helix, nimbus, eclipse, apex, vertex, summit, horizon, falcon, comet, meteor, pulsar, nebula, solstice, equinox, zenith, cardinal.

Each family has 10 variants. The variants map to pricing tiers:

| Variant | Tier | Input (USD cents/1M) | Output (USD cents/1M) | Retail at ₹97 (input) | Retail at ₹97 (output) |
|---|---|---:|---:|---:|---:|
| mini, lite | lite | 20 | 80 | ₹19.40 | ₹77.60 |
| flash | flash | 30 | 120 | ₹29.10 | ₹116.40 |
| standard, turbo | standard | 50 | 200 | ₹48.50 | ₹194.00 |
| code | code | 75 | 300 | ₹72.75 | ₹291.00 |
| reason | reason | 100 | 400 | ₹97.00 | ₹388.00 |
| expert | expert | 150 | 600 | ₹145.50 | ₹582.00 |
| ultra | ultra | 200 | 800 | ₹194.00 | ₹776.00 |
| max | max | 300 | 1,200 | ₹291.00 | ₹1,164.00 |

All aliases:

- use `prorouter-gateway` as provider;
- route to `deepseek-ai/DeepSeek-V4.1-Flash-1017`;
- have context window 1,000,000;
- have max output 128,000;
- are stored as DB model rows, not profile registry entries;
- are included in the 320-row database total.

### 3.10 Catalog API behavior

- `/catalog/profiles` and `/api/catalog/profiles` serve the 500-profile registry.
- `/api/models/pricing` returns all 500 profiles with pricing metadata.
- `/v1/models` is DB-backed and can include the 320 model rows.
- Page size defaults to 50; `ModelCatalogService.query()` caps a page at 600.
- Text search covers ID, name, description, category, provider, canonical ID, and tags.
- `tier` is accepted by the route and forwarded to `list()`, but `list()` does not forward it to `query()`. It is currently ignored.

---

## 4. Pricing

### 4.1 Currency and rate layers

| Layer | Value | Used by |
|---|---:|---|
| Billing/display rate | ₹97/USD | Default `USD_TO_INR_RATE`, DB tier pricing, catalog display |
| Market rate constant | ₹88/USD | Shared constant for market comparisons |
| Generated-profile billing | ₹80/USD | `loadModelContext()` for profiles with no DB row |
| Wallet/DB unit | paise | Wallet balances, DB `model_pricing`, transactions |
| USD price unit | USD per 1,000,000 tokens | Profile `customerPricingUsd`, upstream costs |

This means a generated profile's advertised USD price can be converted at ₹97 for display, while the same profile is charged from a DB-like paise price computed at ₹80. Those are not the same number.

### 4.2 Pricing formula

The shared engine in `packages/shared/src/pricing-engine.ts` uses:

```text
customer price = (upstream cost × (1 + operational reserve + model markup + provider markup))
                 / (1 − target gross margin)
```

Defaults:

- operational reserve: **10%**;
- target gross margin: **30%**;
- model markup: **0**;
- provider markup: **0**;
- minimum selling price: **$0.05/1M**;
- maximum approved margin: **85%**;
- cached input: **50% of input customer price** (generated profiles and the seed-aligned convention).

The raw price is floored at $0.05/1M. INR paise are computed with `ceil(price × rate × 100)`.

For a $0.20/1M input cost:

```text
(0.20 × 1.10) / 0.70 = $0.314285… → $0.3143/1M
```

For a $0.80/1M output cost:

```text
(0.80 × 1.10) / 0.70 = $1.257142… → $1.2571/1M
```

For generated profiles, `computePrice()` calls this engine with exactly 10% reserve and 30% margin. The multiplier is therefore `1.1 / 0.7 = 1.571428…`.

### 4.3 Pricing tiers

Tier prices are defined in USD cents per 1M and converted to paise for DB models whose active tier matches. Retail INR below uses ₹97/USD.

| Tier | Input cents | Output cents | Retail input ₹/1M | Retail output ₹/1M |
|---|---:|---:|---:|---:|
| lite | 20 | 80 | ₹19.40 | ₹77.60 |
| flash | 30 | 120 | ₹29.10 | ₹116.40 |
| standard | 50 | 200 | ₹48.50 | ₹194.00 |
| code | 75 | 300 | ₹72.75 | ₹291.00 |
| reason | 100 | 400 | ₹97.00 | ₹388.00 |
| expert | 150 | 600 | ₹145.50 | ₹582.00 |
| ultra | 200 | 800 | ₹194.00 | ₹776.00 |
| max | 300 | 1,200 | ₹291.00 | ₹1,164.00 |

Tier pricing wins over explicit model pricing when the model's tier is active and matches. This is why the 300 aliases are priced by variant tier rather than by the DeepSeek canonical model's free prices.

### 4.4 Generated profile prices

Generated profiles use category-level upstream costs, not tier retail. The category price is therefore not the same as the tier label attached to the profile.

| Category group | Upstream $/1M in/out | Customer $/1M in/out | Display ₹/1M in/out at ₹97 | Billing ₹/1M in/out at ₹80 |
|---|---:|---:|---:|---:|
| General, multilingual | $0.15 / $0.45 | $0.2357 / $0.7071 | ₹22.86 / ₹68.59 | ₹18.86 / ₹56.57 |
| Reasoning, research | $0.35 / $1.05 | $0.5500 / $1.6500 | ₹53.35 / ₹160.05 | ₹44.00 / ₹132.00 |
| Coding, math, vision | $0.25 / $0.75 | $0.3929 / $1.1786 | ₹38.11 / ₹114.32 | ₹31.43 / ₹94.29 |
| Agentic | $0.30 / $0.90 | $0.4714 / $1.4143 | ₹45.73 / ₹137.19 | ₹37.71 / ₹113.14 |
| Fast | $0.08 / $0.24 | $0.1257 / $0.3771 | ₹12.19 / ₹36.58 | ₹10.06 / ₹30.17 |
| Long-context | $0.40 / $1.20 | $0.6286 / $1.8857 | ₹60.97 / ₹182.91 | ₹50.29 / ₹150.86 |
| Creative, business | $0.20 / $0.60 | $0.3143 / $0.9429 | ₹30.49 / ₹91.46 | ₹25.14 / ₹75.43 |

“Billing” figures are the fixed-₹80 conversion used by `loadModelContext()` for profiles without DB rows. The actual wallet charge is computed in paise with `ceil`, so minor rounding differences are expected.

The table in Appendix A uses the customer USD prices and ₹97 display conversion. It is a catalog/display view; for generated profiles the charged paise are derived at ₹80.

### 4.5 Seed DB prices

The seed rows in §3.8 use explicit paise prices. They do not go through the generator formula. Examples:

- `deepseek-v4.1-flash-1017`: ₹17.60/₹35.20 per 1M, free;
- `qwen3.8-27b`: ₹25.10/₹100.60 per 1M, free;
- `claude-sonnet`: ₹377.00/₹1,886.00 per 1M;
- `gemini-pro`: ₹19.00/₹75.00 per 1M;
- `nemotron-3-ultra-550b-a55b`: ₹88.00/₹264.00 per 1M.

The seed's `claude-sonnet` retail is consistent with the generated profile's upstream $3/$15 at a fixed ₹80/USD, but not with ₹97 display conversion. This is one of the clearest examples of the rate-layer split.

### 4.6 Alias prices

All 300 aliases use tier pricing from §4.3. The cheapest aliases (`mini` and `lite`) are ₹19.40/₹77.60 per 1M; the most expensive (`max`) are ₹291.00/₹1,164.00 per 1M. They are not free and are not priced at the free canonical model's ₹17.60/₹35.20.

### 4.7 Plans

Plans are seeded in paise and include rate limits, concurrency, queue priority, and sort order:

| Plan | Price | RPM | RPH | RPD | Concurrency | Queue priority |
|---|---:|---:|---:|---:|---:|---:|
| Free | ₹0 | 1 | 20 | 100 | 1 | 5 |
| Boost | ₹1,999 | 5 | 120 | 1,500 | 3 | 3 |
| Ultra | ₹4,999 | 10 | 300 | 5,000 | 5 | 1 |

Feature copy:

- **Free:** 1 free-model request/minute; standard free queue; basic API access; community support.
- **Boost:** 5 free-model requests/minute; faster queue; higher concurrency; email support.
- **Ultra:** 10 free-model requests/minute; priority routing with no scheduled queue delay; highest concurrency; premium support.

The web's static pricing content has advertised free/builder/pro at ₹0/₹999/₹2,499, which does not match these backend seeds. Use the backend plan rows for API behavior and treat the static page as a display inconsistency until reconciled.

### 4.8 Credit packs

| Pack | Price | Bonus | Total credit |
|---|---:|---:|---:|
| `starter-100` | ₹100 | ₹0 | ₹100 |
| `pro-500` | ₹500 | ₹50 | ₹550 |
| `scale-1000` | ₹1,000 | ₹200 | ₹1,200 |
| `power-2500` | ₹2,500 | ₹650 | ₹3,150 |
| Legacy starter | ₹499 | ₹0 | ₹499 |
| Legacy builder | ₹999 | ₹51 | ₹1,050 |
| Legacy pro | ₹2,499 | ₹251 | ₹2,750 |
| Legacy power | ₹4,999 | ₹751 | ₹5,750 |

The canonical wallet page exposes the four current packs; the legacy packs remain in seed data for compatibility.

### 4.9 Astra promotion

Astra is seeded as the canonical promotional offer:

- original price: ₹4,000 (400,000 paise);
- discount: 80%;
- promotional price: ₹800 (80,000 paise);
- trial: 7 days;
- multi-redeem enabled.

The wallet page includes fallback handling so the offer still renders if the promotions endpoint fails.

### 4.10 Billing resolution and the rate split

The effective price for a DB model or alias is:

1. If `model.pricing_tier` matches an active tier, use the tier's USD-cent prices converted at `USD_TO_INR_RATE` (default 97).
2. Otherwise, use the explicit `model_pricing` paise row.
3. If no DB row exists and a profile is found, use `profile.customerPricingUsd` and convert at fixed ₹80/USD with `ceil`.
4. If no pricing exists, use zero/pending behavior.

Important consequences:

- **Aliases are tier-priced at ₹97.** Changing `USD_TO_INR_RATE` changes alias prices.
- **Generated profiles are charged at ₹80.** Changing the setting does not change their DB-like paise price.
- **Catalog display is not a billing quote** for generated profiles.
- **`/models` can show zero prices when DB is under 100 rows.** `apps/api/src/lib/catalog.ts` blends profile DTOs only when the DB model count is below 100; in a seed-only state, those blended DTOs have `pricing: {0, 0}`. With 320 rows, blending is inactive.

### 4.11 Pricing consistency matrix

| Item | Declared | Actual source of charge | Risk |
|---|---|---|---|
| Generated-profile USD price | $0.1257–$0.6286 input; $0.3771–$1.8857 output | `customerPricingUsd × 80` paise | Display at ₹97 differs from charge at ₹80 |
| All-profile USD price | $0.0786–$9.4286 input; $0.2357–$47.1429 output | DB tier/explicit price, or fixed-₹80 fallback | Price depends on surface and path |
| Pricing tier label | e.g. `expert` | Category upstream cost, not tier retail | Label does not imply tier price |
| `claude-sonnet` | Profile $4.7143/$23.5714 | DB ₹377/₹1,886 or ₹80 conversion | ₹97 vs ₹80 mismatch |
| 300 aliases | Tier retail | Tier paise at ₹97 | Not free despite DeepSeek upstream |
| `/models` seed-only | Catalog price | Blended DTOs can be zero | Zero-price display |
| Pro file fallback | `isFree: true`, zero cost | Effective pricing separately | Routing preference distortion |

### 4.12 Candidate pricing risk

`hydrateCandidates()` builds profile-fallback candidates with:

```ts
inputPerMillion: 0,
outputPerMillion: 0,
isFree: true,
```

This happens only when the requested DB model has no provider links and a matching profile exists. Billing still uses the separately returned `effectivePricing`; however, `routeRequest()` uses candidate `inputPerMillion` and `isFree` for:

- the budget filter (`isFree` bypasses the max input cost);
- the `+200` free preference score when `preferFree` is true;
- over-budget penalties for non-free candidates.

As a result, profile-only fallback candidates can look cheaper and more “free” to the router than their billing prices imply. This is a routing/pricing consistency risk, not evidence that the wallet is undercharging.

---

## 5. Findings and operational gaps

| Severity | Finding | Evidence | Impact |
|---|---|---|---|
| High | Generated-profile display and billing use different FX rates | `customerPricingUsd` display at ₹97; fallback charge at ₹80 | Users can see a different effective price than the one charged |
| High | Generated profiles are synthetic routing slots, not 461 independently hosted models | `catalog-generator.ts` builds from category specs; empty benchmarks | Catalog marketing can overstate model provenance |
| Medium | Pricing-tier labels do not match generated category prices | Research is `expert` but priced $0.55/$1.65 vs expert $1.50/$6.00 | Tier names can mislead plan/catalog expectations |
| Medium | `claude-sonnet` profile and DB prices diverge at ₹97 | Profile $4.7143/$23.5714 vs DB ₹377/₹1,886 | Inconsistent quotes across surfaces |
| Medium | `/models` can display zero prices in seed-only state | `catalog.ts` blend condition and zeroed DTO pricing | Broken catalog display during setup/demo |
| Medium | Profile fallback candidates hard-code zero cost and `isFree: true` | `pipeline.ts` dynamic candidate construction | Budget/free-preference routing can be distorted |
| Medium | Health monitor keys are inconsistent | Router checks backend ID; recording uses provider slug | Profile health gates may miss provider failures |
| Medium | Catalog `tier` filter is ignored | `list()` accepts `tier` but does not pass it to `query()` | API parameter silently has no effect |
| Low | Static pricing page does not match backend plan seeds | Web ₹0/999/2499 vs backend ₹0/1999/4999 | Marketing/backend mismatch |
| Low | Architecture docs contain stale rates and table counts | Chapter 09 rates, chapter 07 table count | Readers may cite obsolete values |
| Low | Pro aliases are not free despite DeepSeek upstream | Alias rows use tier pricing and `isFree: false` | Catalog/support confusion |
| Low | Health state is process-local | In-memory `Map`, no shared store | Cooldowns are lost on restart and not shared across instances |

None of these findings, by itself, proves that wallet debits are incorrect for DB-backed models. The core billing path and idempotency tests passed. The risk is concentrated in catalog presentation, generated-profile fallback pricing, and routing metadata consistency.

---

## 6. Verification and provenance

### 6.1 Verification run

| Check | Result |
|---|---|
| Backend TypeScript typecheck | Passed |
| Web TypeScript check (`tsc --noEmit -p apps/web`) | Passed |
| Vitest suite | **150/150 passed** |
| Next.js production build | **21/21 static pages** |
| Catalog profile count | **500** |
| Grouped table rows | **500** |
| Grouped table category headings | **12** |
| Grouped table UTF-8 | Valid (`₹` and `—` preserved) |
| Grouped table bytes | 157,617 |
| Grouped table lines | 584 by `split(/\r?\n/)` |
| DB tables | **44 across 6 schema modules** |
| Static API route registrations | **107 across 12 modules** |
| Seed models | **20** |
| Pro aliases | **300** |

The PowerShell console can render the grouped table's `₹`/`—` as mojibake. The file itself is valid UTF-8. Use Node `fs.readFileSync(..., "utf8")` and `writeFileSync(..., "utf8")` for any further table processing.

### 6.2 Source of truth

For this report, current source code wins over older architecture notes on conflict. The most important corrections are:

- the DB has six schema modules and 44 tables, not five modules;
- current rate constants are ₹97 billing/display, ₹88 market, and ₹80 for generated-profile billing;
- current persona code does not fabricate model identity;
- current routing is deterministic `routeRequest()` scoring, not the docs' full four-factor weighted model;
- generated profiles are synthetic and do not have benchmark scores.

### 6.3 Files used for catalog generation

- `packages/routing/src/catalog-generator.ts`
- `packages/routing/src/profile-registry.ts`
- `packages/routing/src/types.ts`
- `packages/shared/src/pricing-engine.ts`
- `scripts/.tmp-dump-catalog.ts` (temporary generator)
- `docs/_catalog_dump.json`
- `docs/_catalog_grouped.md`

---

## Appendix A: Full 500-profile catalog

The table below is generated from `docs/_catalog_grouped.md`. It contains exactly 500 runtime profiles grouped into the 12 categories. “Customer ₹” columns use the ₹97 display conversion of the profile's customer USD price; generated-profile wallet charges use the fixed ₹80 conversion described in §4.10.

### General-Purpose AI (general)

**Profiles:** 70 | **Tier mix:** standard 68, lite 2 | **Origin:** Legacy 4, Generated 66

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 1 | `gemini-pro` | Gemini Pro | `gemini-1.5-pro` | Legacy | standard | 1,048,576 | 64,000 | $1.2500 | $5.0000 | $1.9643 | $7.8571 | ₹190.54 | ₹762.14 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 2 | `grok` | Grok | `grok-2` | Legacy | standard | 131,072 | 64,000 | $2.0000 | $10.0000 | $3.1429 | $15.7143 | ₹304.86 | ₹1524.29 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 3 | `beam` | Beam | `beam-v1` | Legacy | lite | 200,000 | 64,000 | $0.1000 | $0.3000 | $0.1571 | $0.4714 | ₹15.24 | ₹45.73 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 4 | `jev-1.13` | Jev 1.13 | `jev-1.13` | Legacy | lite | 131,072 | 32,768 | $0.1000 | $0.3000 | $0.1571 | $0.4714 | ₹15.24 | ₹45.73 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 5 | `pr-gen-omni-core` | Omni Core | `pr-gen-omni-core` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 6 | `pr-gen-dialogue-pro` | Dialogue Pro | `pr-gen-dialogue-pro` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 7 | `pr-gen-knowledge-base` | Knowledge Base | `pr-gen-knowledge-base` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 8 | `pr-gen-briefing-desk` | Briefing Desk | `pr-gen-briefing-desk` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 9 | `pr-gen-clarity-engine` | Clarity Engine | `pr-gen-clarity-engine` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 10 | `pr-gen-writer-companion` | Writer Companion | `pr-gen-writer-companion` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 11 | `pr-gen-inquiry-agent` | Inquiry Agent | `pr-gen-inquiry-agent` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 12 | `pr-gen-omni-core-v2` | Omni Core (Tier 2) | `pr-gen-omni-core-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 13 | `pr-gen-dialogue-pro-v2` | Dialogue Pro (Tier 2) | `pr-gen-dialogue-pro-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 14 | `pr-gen-knowledge-base-v2` | Knowledge Base (Tier 2) | `pr-gen-knowledge-base-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 15 | `pr-gen-briefing-desk-v2` | Briefing Desk (Tier 2) | `pr-gen-briefing-desk-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 16 | `pr-gen-clarity-engine-v2` | Clarity Engine (Tier 2) | `pr-gen-clarity-engine-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 17 | `pr-gen-writer-companion-v2` | Writer Companion (Tier 2) | `pr-gen-writer-companion-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 18 | `pr-gen-inquiry-agent-v2` | Inquiry Agent (Tier 2) | `pr-gen-inquiry-agent-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 19 | `pr-gen-omni-core-v3` | Omni Core (Tier 3) | `pr-gen-omni-core-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 20 | `pr-gen-dialogue-pro-v3` | Dialogue Pro (Tier 3) | `pr-gen-dialogue-pro-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 21 | `pr-gen-knowledge-base-v3` | Knowledge Base (Tier 3) | `pr-gen-knowledge-base-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 22 | `pr-gen-briefing-desk-v3` | Briefing Desk (Tier 3) | `pr-gen-briefing-desk-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 23 | `pr-gen-clarity-engine-v3` | Clarity Engine (Tier 3) | `pr-gen-clarity-engine-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 24 | `pr-gen-writer-companion-v3` | Writer Companion (Tier 3) | `pr-gen-writer-companion-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 25 | `pr-gen-inquiry-agent-v3` | Inquiry Agent (Tier 3) | `pr-gen-inquiry-agent-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 26 | `pr-gen-omni-core-v4` | Omni Core (Tier 4) | `pr-gen-omni-core-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 27 | `pr-gen-dialogue-pro-v4` | Dialogue Pro (Tier 4) | `pr-gen-dialogue-pro-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 28 | `pr-gen-knowledge-base-v4` | Knowledge Base (Tier 4) | `pr-gen-knowledge-base-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 29 | `pr-gen-briefing-desk-v4` | Briefing Desk (Tier 4) | `pr-gen-briefing-desk-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 30 | `pr-gen-clarity-engine-v4` | Clarity Engine (Tier 4) | `pr-gen-clarity-engine-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 31 | `pr-gen-writer-companion-v4` | Writer Companion (Tier 4) | `pr-gen-writer-companion-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 32 | `pr-gen-inquiry-agent-v4` | Inquiry Agent (Tier 4) | `pr-gen-inquiry-agent-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 33 | `pr-gen-omni-core-v5` | Omni Core (Tier 5) | `pr-gen-omni-core-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 34 | `pr-gen-dialogue-pro-v5` | Dialogue Pro (Tier 5) | `pr-gen-dialogue-pro-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 35 | `pr-gen-knowledge-base-v5` | Knowledge Base (Tier 5) | `pr-gen-knowledge-base-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 36 | `pr-gen-briefing-desk-v5` | Briefing Desk (Tier 5) | `pr-gen-briefing-desk-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 37 | `pr-gen-clarity-engine-v5` | Clarity Engine (Tier 5) | `pr-gen-clarity-engine-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 38 | `pr-gen-writer-companion-v5` | Writer Companion (Tier 5) | `pr-gen-writer-companion-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 39 | `pr-gen-inquiry-agent-v5` | Inquiry Agent (Tier 5) | `pr-gen-inquiry-agent-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 40 | `pr-gen-omni-core-v6` | Omni Core (Tier 6) | `pr-gen-omni-core-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 41 | `pr-gen-dialogue-pro-v6` | Dialogue Pro (Tier 6) | `pr-gen-dialogue-pro-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 42 | `pr-gen-knowledge-base-v6` | Knowledge Base (Tier 6) | `pr-gen-knowledge-base-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 43 | `pr-gen-briefing-desk-v6` | Briefing Desk (Tier 6) | `pr-gen-briefing-desk-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 44 | `pr-gen-clarity-engine-v6` | Clarity Engine (Tier 6) | `pr-gen-clarity-engine-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 45 | `pr-gen-writer-companion-v6` | Writer Companion (Tier 6) | `pr-gen-writer-companion-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 46 | `pr-gen-inquiry-agent-v6` | Inquiry Agent (Tier 6) | `pr-gen-inquiry-agent-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 47 | `pr-gen-omni-core-v7` | Omni Core (Tier 7) | `pr-gen-omni-core-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 48 | `pr-gen-dialogue-pro-v7` | Dialogue Pro (Tier 7) | `pr-gen-dialogue-pro-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 49 | `pr-gen-knowledge-base-v7` | Knowledge Base (Tier 7) | `pr-gen-knowledge-base-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 50 | `pr-gen-briefing-desk-v7` | Briefing Desk (Tier 7) | `pr-gen-briefing-desk-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 51 | `pr-gen-clarity-engine-v7` | Clarity Engine (Tier 7) | `pr-gen-clarity-engine-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 52 | `pr-gen-writer-companion-v7` | Writer Companion (Tier 7) | `pr-gen-writer-companion-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 53 | `pr-gen-inquiry-agent-v7` | Inquiry Agent (Tier 7) | `pr-gen-inquiry-agent-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 54 | `pr-gen-omni-core-v8` | Omni Core (Tier 8) | `pr-gen-omni-core-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 55 | `pr-gen-dialogue-pro-v8` | Dialogue Pro (Tier 8) | `pr-gen-dialogue-pro-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 56 | `pr-gen-knowledge-base-v8` | Knowledge Base (Tier 8) | `pr-gen-knowledge-base-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 57 | `pr-gen-briefing-desk-v8` | Briefing Desk (Tier 8) | `pr-gen-briefing-desk-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 58 | `pr-gen-clarity-engine-v8` | Clarity Engine (Tier 8) | `pr-gen-clarity-engine-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 59 | `pr-gen-writer-companion-v8` | Writer Companion (Tier 8) | `pr-gen-writer-companion-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 60 | `pr-gen-inquiry-agent-v8` | Inquiry Agent (Tier 8) | `pr-gen-inquiry-agent-v8` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 61 | `pr-gen-omni-core-v9` | Omni Core (Tier 9) | `pr-gen-omni-core-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 62 | `pr-gen-dialogue-pro-v9` | Dialogue Pro (Tier 9) | `pr-gen-dialogue-pro-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 63 | `pr-gen-knowledge-base-v9` | Knowledge Base (Tier 9) | `pr-gen-knowledge-base-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 64 | `pr-gen-briefing-desk-v9` | Briefing Desk (Tier 9) | `pr-gen-briefing-desk-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 65 | `pr-gen-clarity-engine-v9` | Clarity Engine (Tier 9) | `pr-gen-clarity-engine-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 66 | `pr-gen-writer-companion-v9` | Writer Companion (Tier 9) | `pr-gen-writer-companion-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 67 | `pr-gen-inquiry-agent-v9` | Inquiry Agent (Tier 9) | `pr-gen-inquiry-agent-v9` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 68 | `pr-gen-omni-core-v10` | Omni Core (Tier 10) | `pr-gen-omni-core-v10` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 69 | `pr-gen-dialogue-pro-v10` | Dialogue Pro (Tier 10) | `pr-gen-dialogue-pro-v10` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 70 | `pr-gen-knowledge-base-v10` | Knowledge Base (Tier 10) | `pr-gen-knowledge-base-v10` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |

### Advanced Reasoning (reasoning)

**Profiles:** 65 | **Tier mix:** ultra 2, max 1, expert 2, reason 56, standard 4 | **Origin:** Legacy 6, Verified 4, Generated 55

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 71 | `claude-opus` | Claude Opus | `claude-3-opus` | Legacy | ultra | 262,144 | 64,000 | $5.0000 | $25.0000 | $7.8571 | $39.2857 | ₹762.14 | ₹3810.71 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 72 | `claude-opus-5` | Claude Opus 5 | `claude-opus-5` | Legacy | max | 250,000 | 64,000 | $6.0000 | $30.0000 | $9.4286 | $47.1429 | ₹914.57 | ₹4572.86 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 73 | `mistral-large` | Mistral Large | `mistral-large-2407` | Legacy | expert | 128,000 | 64,000 | $2.0000 | $6.0000 | $3.1429 | $9.4286 | ₹304.86 | ₹914.57 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 74 | `gpt-6.1-sol` | GPT-6.1 Sol | `gpt-6.1-sol` | Legacy | ultra | 256,000 | 64,000 | $2.5000 | $10.0000 | $3.9286 | $15.7143 | ₹381.07 | ₹1524.29 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 75 | `glm-5.3` | GLM-5.3 | `glm-5.3` | Legacy | reason | 200,000 | 128,000 | $0.6000 | $1.8000 | $0.9429 | $2.8286 | ₹91.46 | ₹274.37 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 76 | `mimo-v2.6-pro` | MiMo-V2.6-Pro | `mimo-v2.6-pro` | Legacy | expert | 1,048,576 | 131,072 | $0.9000 | $2.7000 | $1.4143 | $4.2429 | ₹137.19 | ₹411.56 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 77 | `gpt-oss-20b` | GPT OSS 20B | `gpt-oss-20b` | Verified | standard | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `nabh/gpt-oss-20b` | `groq/gpt-oss-20b` | `prorouter/deepseek-v4.1-flash` |
| 78 | `gpt-oss-120b` | GPT OSS 120B | `gpt-oss-120b` | Verified | standard | 131,072 | 32,768 | $0.3000 | $1.2000 | $0.4714 | $1.8857 | ₹45.73 | ₹182.91 | no | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 79 | `nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra 550B A55B | `nemotron-3-ultra-550b` | Verified | standard | 1,048,576 | 65,536 | $0.7000 | $2.1000 | $1.1000 | $3.3000 | ₹106.70 | ₹320.10 | no | `requesty/nemotron-3-ultra-550b-a55b` | `openrouter/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 80 | `leanstral-1-5` | Leanstral 1.5 | `leanstral-1-5` | Verified | standard | 262,144 | 32,768 | $0.1200 | $0.3600 | $0.1886 | $0.5657 | ₹18.29 | ₹54.87 | no | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 81 | `pr-reason-cot-analytical` | Chain-of-Thought Analyst | `pr-reason-cot-analytical` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 82 | `pr-reason-deductive-logic` | Deductive Logic Engine | `pr-reason-deductive-logic` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 83 | `pr-reason-causal-inference` | Causal Inference Model | `pr-reason-causal-inference` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 84 | `pr-reason-systems-thinker` | Systems Architecture Thinker | `pr-reason-systems-thinker` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 85 | `pr-reason-fallacy-detector` | Cognitive Auditor | `pr-reason-fallacy-detector` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 86 | `pr-reason-decision-matrix` | Decision Matrix Pro | `pr-reason-decision-matrix` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 87 | `pr-reason-hypothesis-tester` | Scientific Hypothesizer | `pr-reason-hypothesis-tester` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 88 | `pr-reason-cot-analytical-v2` | Chain-of-Thought Analyst (Tier 2) | `pr-reason-cot-analytical-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 89 | `pr-reason-deductive-logic-v2` | Deductive Logic Engine (Tier 2) | `pr-reason-deductive-logic-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 90 | `pr-reason-causal-inference-v2` | Causal Inference Model (Tier 2) | `pr-reason-causal-inference-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 91 | `pr-reason-systems-thinker-v2` | Systems Architecture Thinker (Tier 2) | `pr-reason-systems-thinker-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 92 | `pr-reason-fallacy-detector-v2` | Cognitive Auditor (Tier 2) | `pr-reason-fallacy-detector-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 93 | `pr-reason-decision-matrix-v2` | Decision Matrix Pro (Tier 2) | `pr-reason-decision-matrix-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 94 | `pr-reason-hypothesis-tester-v2` | Scientific Hypothesizer (Tier 2) | `pr-reason-hypothesis-tester-v2` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 95 | `pr-reason-cot-analytical-v3` | Chain-of-Thought Analyst (Tier 3) | `pr-reason-cot-analytical-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 96 | `pr-reason-deductive-logic-v3` | Deductive Logic Engine (Tier 3) | `pr-reason-deductive-logic-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 97 | `pr-reason-causal-inference-v3` | Causal Inference Model (Tier 3) | `pr-reason-causal-inference-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 98 | `pr-reason-systems-thinker-v3` | Systems Architecture Thinker (Tier 3) | `pr-reason-systems-thinker-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 99 | `pr-reason-fallacy-detector-v3` | Cognitive Auditor (Tier 3) | `pr-reason-fallacy-detector-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 100 | `pr-reason-decision-matrix-v3` | Decision Matrix Pro (Tier 3) | `pr-reason-decision-matrix-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 101 | `pr-reason-hypothesis-tester-v3` | Scientific Hypothesizer (Tier 3) | `pr-reason-hypothesis-tester-v3` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 102 | `pr-reason-cot-analytical-v4` | Chain-of-Thought Analyst (Tier 4) | `pr-reason-cot-analytical-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 103 | `pr-reason-deductive-logic-v4` | Deductive Logic Engine (Tier 4) | `pr-reason-deductive-logic-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 104 | `pr-reason-causal-inference-v4` | Causal Inference Model (Tier 4) | `pr-reason-causal-inference-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 105 | `pr-reason-systems-thinker-v4` | Systems Architecture Thinker (Tier 4) | `pr-reason-systems-thinker-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 106 | `pr-reason-fallacy-detector-v4` | Cognitive Auditor (Tier 4) | `pr-reason-fallacy-detector-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 107 | `pr-reason-decision-matrix-v4` | Decision Matrix Pro (Tier 4) | `pr-reason-decision-matrix-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 108 | `pr-reason-hypothesis-tester-v4` | Scientific Hypothesizer (Tier 4) | `pr-reason-hypothesis-tester-v4` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 109 | `pr-reason-cot-analytical-v5` | Chain-of-Thought Analyst (Tier 5) | `pr-reason-cot-analytical-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 110 | `pr-reason-deductive-logic-v5` | Deductive Logic Engine (Tier 5) | `pr-reason-deductive-logic-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 111 | `pr-reason-causal-inference-v5` | Causal Inference Model (Tier 5) | `pr-reason-causal-inference-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 112 | `pr-reason-systems-thinker-v5` | Systems Architecture Thinker (Tier 5) | `pr-reason-systems-thinker-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 113 | `pr-reason-fallacy-detector-v5` | Cognitive Auditor (Tier 5) | `pr-reason-fallacy-detector-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 114 | `pr-reason-decision-matrix-v5` | Decision Matrix Pro (Tier 5) | `pr-reason-decision-matrix-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 115 | `pr-reason-hypothesis-tester-v5` | Scientific Hypothesizer (Tier 5) | `pr-reason-hypothesis-tester-v5` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 116 | `pr-reason-cot-analytical-v6` | Chain-of-Thought Analyst (Tier 6) | `pr-reason-cot-analytical-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 117 | `pr-reason-deductive-logic-v6` | Deductive Logic Engine (Tier 6) | `pr-reason-deductive-logic-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 118 | `pr-reason-causal-inference-v6` | Causal Inference Model (Tier 6) | `pr-reason-causal-inference-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 119 | `pr-reason-systems-thinker-v6` | Systems Architecture Thinker (Tier 6) | `pr-reason-systems-thinker-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 120 | `pr-reason-fallacy-detector-v6` | Cognitive Auditor (Tier 6) | `pr-reason-fallacy-detector-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 121 | `pr-reason-decision-matrix-v6` | Decision Matrix Pro (Tier 6) | `pr-reason-decision-matrix-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 122 | `pr-reason-hypothesis-tester-v6` | Scientific Hypothesizer (Tier 6) | `pr-reason-hypothesis-tester-v6` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 123 | `pr-reason-cot-analytical-v7` | Chain-of-Thought Analyst (Tier 7) | `pr-reason-cot-analytical-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 124 | `pr-reason-deductive-logic-v7` | Deductive Logic Engine (Tier 7) | `pr-reason-deductive-logic-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 125 | `pr-reason-causal-inference-v7` | Causal Inference Model (Tier 7) | `pr-reason-causal-inference-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 126 | `pr-reason-systems-thinker-v7` | Systems Architecture Thinker (Tier 7) | `pr-reason-systems-thinker-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 127 | `pr-reason-fallacy-detector-v7` | Cognitive Auditor (Tier 7) | `pr-reason-fallacy-detector-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 128 | `pr-reason-decision-matrix-v7` | Decision Matrix Pro (Tier 7) | `pr-reason-decision-matrix-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 129 | `pr-reason-hypothesis-tester-v7` | Scientific Hypothesizer (Tier 7) | `pr-reason-hypothesis-tester-v7` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 130 | `pr-reason-cot-analytical-v8` | Chain-of-Thought Analyst (Tier 8) | `pr-reason-cot-analytical-v8` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 131 | `pr-reason-deductive-logic-v8` | Deductive Logic Engine (Tier 8) | `pr-reason-deductive-logic-v8` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 132 | `pr-reason-causal-inference-v8` | Causal Inference Model (Tier 8) | `pr-reason-causal-inference-v8` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 133 | `pr-reason-systems-thinker-v8` | Systems Architecture Thinker (Tier 8) | `pr-reason-systems-thinker-v8` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 134 | `pr-reason-fallacy-detector-v8` | Cognitive Auditor (Tier 8) | `pr-reason-fallacy-detector-v8` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 135 | `pr-reason-decision-matrix-v8` | Decision Matrix Pro (Tier 8) | `pr-reason-decision-matrix-v8` | Generated | reason | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |

### Coding & Software Engineering (coding)

**Profiles:** 85 | **Tier mix:** expert 2, code 77, standard 6 | **Origin:** Legacy 5, Verified 6, Generated 74

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 136 | `claude-sonnet` | Claude Sonnet | `claude-3-5-sonnet` | Legacy | expert | 262,144 | 64,000 | $3.0000 | $15.0000 | $4.7143 | $23.5714 | ₹457.29 | ₹2286.43 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 137 | `devstral-24b` | Devstral 24B | `devstral-24b` | Legacy | code | 128,000 | 64,000 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 138 | `kimi-k2.7-code` | Kimi K2.7 Code | `kimi-k2.7-code` | Legacy | code | 200,000 | 64,000 | $0.7000 | $2.1000 | $1.1000 | $3.3000 | ₹106.70 | ₹320.10 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 139 | `qwen3-coder-next` | Qwen3-Coder-Next | `qwen3-coder-next` | Legacy | code | 131,072 | 64,000 | $0.5000 | $1.5000 | $0.7857 | $2.3571 | ₹76.21 | ₹228.64 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 140 | `deepseek-v4-pro-0813` | DeepSeek-V4-Pro-0813 | `deepseek-v4-pro-0813` | Legacy | expert | 262,144 | 128,000 | $0.8000 | $2.4000 | $1.2571 | $3.7714 | ₹121.94 | ₹365.83 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 141 | `gpt-4.1` | GPT-4.1 | `gpt-4.1` | Verified | standard | 128,000 | 16,384 | $2.5000 | $10.0000 | $3.9286 | $15.7143 | ₹381.07 | ₹1524.29 | no | `openai/gpt-4.1` | `openrouter/openai/gpt-4.1` | `prorouter/deepseek-v4.1-flash` |
| 142 | `gpt-4o` | GPT-4o | `gpt-4o` | Verified | standard | 128,000 | 16,384 | $2.5000 | $10.0000 | $3.9286 | $15.7143 | ₹381.07 | ₹1524.29 | no | `openai/gpt-4o` | `openrouter/openai/gpt-4o` | `prorouter/deepseek-v4.1-flash` |
| 143 | `deepseek-v4.1-flash` | DeepSeek V4.1 Flash | `deepseek-v4.1-flash` | Verified | standard | 262,144 | 128,000 | $0.1400 | $0.2800 | $0.2200 | $0.4400 | ₹21.34 | ₹42.68 | YES | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 144 | `deepseek-v4.1-flash-1017` | DeepSeek-V4.1-Flash-1017 | `deepseek-v4.1-flash` | Verified | standard | 262,144 | 128,000 | $0.1400 | $0.2800 | $0.2200 | $0.4400 | ₹21.34 | ₹42.68 | YES | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 145 | `qwen3.8-27b` | Qwen3.8-27B | `qwen3.8-27b` | Verified | standard | 131,072 | 64,000 | $0.2000 | $0.8000 | $0.3143 | $1.2571 | ₹30.49 | ₹121.94 | YES | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 146 | `qwen/qwen3.8-27b` | Qwen 3.8 27B (Groq LPU) | `qwen3.8-27b` | Verified | standard | 131,072 | 64,000 | $0.2000 | $0.8000 | $0.3143 | $1.2571 | ₹30.49 | ₹121.94 | YES | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 147 | `pr-code-fullstack-architect` | Fullstack Architect | `pr-code-fullstack-architect` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 148 | `pr-code-python-systems` | Python Systems Engineer | `pr-code-python-systems` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 149 | `pr-code-rust-memory` | Rust & Systems Safety | `pr-code-rust-memory` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 150 | `pr-code-database-internals` | Database & SQL Specialist | `pr-code-database-internals` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 151 | `pr-code-devops-cloud` | Cloud & Kubernetes Engineer | `pr-code-devops-cloud` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 152 | `pr-code-frontend-perf` | React & Web Performance | `pr-code-frontend-perf` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 153 | `pr-code-security-auditor` | Application Security Auditor | `pr-code-security-auditor` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 154 | `pr-code-refactor-clean` | Refactoring & Clean Code | `pr-code-refactor-clean` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 155 | `pr-code-fullstack-architect-v2` | Fullstack Architect (Tier 2) | `pr-code-fullstack-architect-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 156 | `pr-code-python-systems-v2` | Python Systems Engineer (Tier 2) | `pr-code-python-systems-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 157 | `pr-code-rust-memory-v2` | Rust & Systems Safety (Tier 2) | `pr-code-rust-memory-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 158 | `pr-code-database-internals-v2` | Database & SQL Specialist (Tier 2) | `pr-code-database-internals-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 159 | `pr-code-devops-cloud-v2` | Cloud & Kubernetes Engineer (Tier 2) | `pr-code-devops-cloud-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 160 | `pr-code-frontend-perf-v2` | React & Web Performance (Tier 2) | `pr-code-frontend-perf-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 161 | `pr-code-security-auditor-v2` | Application Security Auditor (Tier 2) | `pr-code-security-auditor-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 162 | `pr-code-refactor-clean-v2` | Refactoring & Clean Code (Tier 2) | `pr-code-refactor-clean-v2` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 163 | `pr-code-fullstack-architect-v3` | Fullstack Architect (Tier 3) | `pr-code-fullstack-architect-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 164 | `pr-code-python-systems-v3` | Python Systems Engineer (Tier 3) | `pr-code-python-systems-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 165 | `pr-code-rust-memory-v3` | Rust & Systems Safety (Tier 3) | `pr-code-rust-memory-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 166 | `pr-code-database-internals-v3` | Database & SQL Specialist (Tier 3) | `pr-code-database-internals-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 167 | `pr-code-devops-cloud-v3` | Cloud & Kubernetes Engineer (Tier 3) | `pr-code-devops-cloud-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 168 | `pr-code-frontend-perf-v3` | React & Web Performance (Tier 3) | `pr-code-frontend-perf-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 169 | `pr-code-security-auditor-v3` | Application Security Auditor (Tier 3) | `pr-code-security-auditor-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 170 | `pr-code-refactor-clean-v3` | Refactoring & Clean Code (Tier 3) | `pr-code-refactor-clean-v3` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 171 | `pr-code-fullstack-architect-v4` | Fullstack Architect (Tier 4) | `pr-code-fullstack-architect-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 172 | `pr-code-python-systems-v4` | Python Systems Engineer (Tier 4) | `pr-code-python-systems-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 173 | `pr-code-rust-memory-v4` | Rust & Systems Safety (Tier 4) | `pr-code-rust-memory-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 174 | `pr-code-database-internals-v4` | Database & SQL Specialist (Tier 4) | `pr-code-database-internals-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 175 | `pr-code-devops-cloud-v4` | Cloud & Kubernetes Engineer (Tier 4) | `pr-code-devops-cloud-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 176 | `pr-code-frontend-perf-v4` | React & Web Performance (Tier 4) | `pr-code-frontend-perf-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 177 | `pr-code-security-auditor-v4` | Application Security Auditor (Tier 4) | `pr-code-security-auditor-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 178 | `pr-code-refactor-clean-v4` | Refactoring & Clean Code (Tier 4) | `pr-code-refactor-clean-v4` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 179 | `pr-code-fullstack-architect-v5` | Fullstack Architect (Tier 5) | `pr-code-fullstack-architect-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 180 | `pr-code-python-systems-v5` | Python Systems Engineer (Tier 5) | `pr-code-python-systems-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 181 | `pr-code-rust-memory-v5` | Rust & Systems Safety (Tier 5) | `pr-code-rust-memory-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 182 | `pr-code-database-internals-v5` | Database & SQL Specialist (Tier 5) | `pr-code-database-internals-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 183 | `pr-code-devops-cloud-v5` | Cloud & Kubernetes Engineer (Tier 5) | `pr-code-devops-cloud-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 184 | `pr-code-frontend-perf-v5` | React & Web Performance (Tier 5) | `pr-code-frontend-perf-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 185 | `pr-code-security-auditor-v5` | Application Security Auditor (Tier 5) | `pr-code-security-auditor-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 186 | `pr-code-refactor-clean-v5` | Refactoring & Clean Code (Tier 5) | `pr-code-refactor-clean-v5` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 187 | `pr-code-fullstack-architect-v6` | Fullstack Architect (Tier 6) | `pr-code-fullstack-architect-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 188 | `pr-code-python-systems-v6` | Python Systems Engineer (Tier 6) | `pr-code-python-systems-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 189 | `pr-code-rust-memory-v6` | Rust & Systems Safety (Tier 6) | `pr-code-rust-memory-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 190 | `pr-code-database-internals-v6` | Database & SQL Specialist (Tier 6) | `pr-code-database-internals-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 191 | `pr-code-devops-cloud-v6` | Cloud & Kubernetes Engineer (Tier 6) | `pr-code-devops-cloud-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 192 | `pr-code-frontend-perf-v6` | React & Web Performance (Tier 6) | `pr-code-frontend-perf-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 193 | `pr-code-security-auditor-v6` | Application Security Auditor (Tier 6) | `pr-code-security-auditor-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 194 | `pr-code-refactor-clean-v6` | Refactoring & Clean Code (Tier 6) | `pr-code-refactor-clean-v6` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 195 | `pr-code-fullstack-architect-v7` | Fullstack Architect (Tier 7) | `pr-code-fullstack-architect-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 196 | `pr-code-python-systems-v7` | Python Systems Engineer (Tier 7) | `pr-code-python-systems-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 197 | `pr-code-rust-memory-v7` | Rust & Systems Safety (Tier 7) | `pr-code-rust-memory-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 198 | `pr-code-database-internals-v7` | Database & SQL Specialist (Tier 7) | `pr-code-database-internals-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 199 | `pr-code-devops-cloud-v7` | Cloud & Kubernetes Engineer (Tier 7) | `pr-code-devops-cloud-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 200 | `pr-code-frontend-perf-v7` | React & Web Performance (Tier 7) | `pr-code-frontend-perf-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 201 | `pr-code-security-auditor-v7` | Application Security Auditor (Tier 7) | `pr-code-security-auditor-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 202 | `pr-code-refactor-clean-v7` | Refactoring & Clean Code (Tier 7) | `pr-code-refactor-clean-v7` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 203 | `pr-code-fullstack-architect-v8` | Fullstack Architect (Tier 8) | `pr-code-fullstack-architect-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 204 | `pr-code-python-systems-v8` | Python Systems Engineer (Tier 8) | `pr-code-python-systems-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 205 | `pr-code-rust-memory-v8` | Rust & Systems Safety (Tier 8) | `pr-code-rust-memory-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 206 | `pr-code-database-internals-v8` | Database & SQL Specialist (Tier 8) | `pr-code-database-internals-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 207 | `pr-code-devops-cloud-v8` | Cloud & Kubernetes Engineer (Tier 8) | `pr-code-devops-cloud-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 208 | `pr-code-frontend-perf-v8` | React & Web Performance (Tier 8) | `pr-code-frontend-perf-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 209 | `pr-code-security-auditor-v8` | Application Security Auditor (Tier 8) | `pr-code-security-auditor-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 210 | `pr-code-refactor-clean-v8` | Refactoring & Clean Code (Tier 8) | `pr-code-refactor-clean-v8` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 211 | `pr-code-fullstack-architect-v9` | Fullstack Architect (Tier 9) | `pr-code-fullstack-architect-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 212 | `pr-code-python-systems-v9` | Python Systems Engineer (Tier 9) | `pr-code-python-systems-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 213 | `pr-code-rust-memory-v9` | Rust & Systems Safety (Tier 9) | `pr-code-rust-memory-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 214 | `pr-code-database-internals-v9` | Database & SQL Specialist (Tier 9) | `pr-code-database-internals-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 215 | `pr-code-devops-cloud-v9` | Cloud & Kubernetes Engineer (Tier 9) | `pr-code-devops-cloud-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 216 | `pr-code-frontend-perf-v9` | React & Web Performance (Tier 9) | `pr-code-frontend-perf-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 217 | `pr-code-security-auditor-v9` | Application Security Auditor (Tier 9) | `pr-code-security-auditor-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 218 | `pr-code-refactor-clean-v9` | Refactoring & Clean Code (Tier 9) | `pr-code-refactor-clean-v9` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 219 | `pr-code-fullstack-architect-v10` | Fullstack Architect (Tier 10) | `pr-code-fullstack-architect-v10` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 220 | `pr-code-python-systems-v10` | Python Systems Engineer (Tier 10) | `pr-code-python-systems-v10` | Generated | code | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `groq/qwen3.8-27b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |

### Agentic Coding & Tools (agentic)

**Profiles:** 45 | **Tier mix:** code 45 | **Origin:** Generated 45

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 221 | `pr-agent-workflow-runner` | Autonomous Workflow Orchestrator | `pr-agent-workflow-runner` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 222 | `pr-agent-repo-synthesizer` | Repo-Level Agent | `pr-agent-repo-synthesizer` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 223 | `pr-agent-schema-tooler` | Strict Schema Invoker | `pr-agent-schema-tooler` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 224 | `pr-agent-sandbox-debugger` | Runtime Sandbox Debugger | `pr-agent-sandbox-debugger` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 225 | `pr-agent-agent-swarm` | Subagent Team Lead | `pr-agent-agent-swarm` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 226 | `pr-agent-workflow-runner-v2` | Autonomous Workflow Orchestrator (Tier 2) | `pr-agent-workflow-runner-v2` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 227 | `pr-agent-repo-synthesizer-v2` | Repo-Level Agent (Tier 2) | `pr-agent-repo-synthesizer-v2` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 228 | `pr-agent-schema-tooler-v2` | Strict Schema Invoker (Tier 2) | `pr-agent-schema-tooler-v2` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 229 | `pr-agent-sandbox-debugger-v2` | Runtime Sandbox Debugger (Tier 2) | `pr-agent-sandbox-debugger-v2` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 230 | `pr-agent-agent-swarm-v2` | Subagent Team Lead (Tier 2) | `pr-agent-agent-swarm-v2` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 231 | `pr-agent-workflow-runner-v3` | Autonomous Workflow Orchestrator (Tier 3) | `pr-agent-workflow-runner-v3` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 232 | `pr-agent-repo-synthesizer-v3` | Repo-Level Agent (Tier 3) | `pr-agent-repo-synthesizer-v3` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 233 | `pr-agent-schema-tooler-v3` | Strict Schema Invoker (Tier 3) | `pr-agent-schema-tooler-v3` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 234 | `pr-agent-sandbox-debugger-v3` | Runtime Sandbox Debugger (Tier 3) | `pr-agent-sandbox-debugger-v3` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 235 | `pr-agent-agent-swarm-v3` | Subagent Team Lead (Tier 3) | `pr-agent-agent-swarm-v3` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 236 | `pr-agent-workflow-runner-v4` | Autonomous Workflow Orchestrator (Tier 4) | `pr-agent-workflow-runner-v4` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 237 | `pr-agent-repo-synthesizer-v4` | Repo-Level Agent (Tier 4) | `pr-agent-repo-synthesizer-v4` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 238 | `pr-agent-schema-tooler-v4` | Strict Schema Invoker (Tier 4) | `pr-agent-schema-tooler-v4` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 239 | `pr-agent-sandbox-debugger-v4` | Runtime Sandbox Debugger (Tier 4) | `pr-agent-sandbox-debugger-v4` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 240 | `pr-agent-agent-swarm-v4` | Subagent Team Lead (Tier 4) | `pr-agent-agent-swarm-v4` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 241 | `pr-agent-workflow-runner-v5` | Autonomous Workflow Orchestrator (Tier 5) | `pr-agent-workflow-runner-v5` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 242 | `pr-agent-repo-synthesizer-v5` | Repo-Level Agent (Tier 5) | `pr-agent-repo-synthesizer-v5` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 243 | `pr-agent-schema-tooler-v5` | Strict Schema Invoker (Tier 5) | `pr-agent-schema-tooler-v5` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 244 | `pr-agent-sandbox-debugger-v5` | Runtime Sandbox Debugger (Tier 5) | `pr-agent-sandbox-debugger-v5` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 245 | `pr-agent-agent-swarm-v5` | Subagent Team Lead (Tier 5) | `pr-agent-agent-swarm-v5` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 246 | `pr-agent-workflow-runner-v6` | Autonomous Workflow Orchestrator (Tier 6) | `pr-agent-workflow-runner-v6` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 247 | `pr-agent-repo-synthesizer-v6` | Repo-Level Agent (Tier 6) | `pr-agent-repo-synthesizer-v6` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 248 | `pr-agent-schema-tooler-v6` | Strict Schema Invoker (Tier 6) | `pr-agent-schema-tooler-v6` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 249 | `pr-agent-sandbox-debugger-v6` | Runtime Sandbox Debugger (Tier 6) | `pr-agent-sandbox-debugger-v6` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 250 | `pr-agent-agent-swarm-v6` | Subagent Team Lead (Tier 6) | `pr-agent-agent-swarm-v6` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 251 | `pr-agent-workflow-runner-v7` | Autonomous Workflow Orchestrator (Tier 7) | `pr-agent-workflow-runner-v7` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 252 | `pr-agent-repo-synthesizer-v7` | Repo-Level Agent (Tier 7) | `pr-agent-repo-synthesizer-v7` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 253 | `pr-agent-schema-tooler-v7` | Strict Schema Invoker (Tier 7) | `pr-agent-schema-tooler-v7` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 254 | `pr-agent-sandbox-debugger-v7` | Runtime Sandbox Debugger (Tier 7) | `pr-agent-sandbox-debugger-v7` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 255 | `pr-agent-agent-swarm-v7` | Subagent Team Lead (Tier 7) | `pr-agent-agent-swarm-v7` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 256 | `pr-agent-workflow-runner-v8` | Autonomous Workflow Orchestrator (Tier 8) | `pr-agent-workflow-runner-v8` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 257 | `pr-agent-repo-synthesizer-v8` | Repo-Level Agent (Tier 8) | `pr-agent-repo-synthesizer-v8` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 258 | `pr-agent-schema-tooler-v8` | Strict Schema Invoker (Tier 8) | `pr-agent-schema-tooler-v8` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 259 | `pr-agent-sandbox-debugger-v8` | Runtime Sandbox Debugger (Tier 8) | `pr-agent-sandbox-debugger-v8` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 260 | `pr-agent-agent-swarm-v8` | Subagent Team Lead (Tier 8) | `pr-agent-agent-swarm-v8` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 261 | `pr-agent-workflow-runner-v9` | Autonomous Workflow Orchestrator (Tier 9) | `pr-agent-workflow-runner-v9` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 262 | `pr-agent-repo-synthesizer-v9` | Repo-Level Agent (Tier 9) | `pr-agent-repo-synthesizer-v9` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 263 | `pr-agent-schema-tooler-v9` | Strict Schema Invoker (Tier 9) | `pr-agent-schema-tooler-v9` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 264 | `pr-agent-sandbox-debugger-v9` | Runtime Sandbox Debugger (Tier 9) | `pr-agent-sandbox-debugger-v9` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 265 | `pr-agent-agent-swarm-v9` | Subagent Team Lead (Tier 9) | `pr-agent-agent-swarm-v9` | Generated | code | 131,072 | 32,768 | $0.3000 | $0.9000 | $0.4714 | $1.4143 | ₹45.73 | ₹137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |

### Research & Analysis (research)

**Profiles:** 45 | **Tier mix:** max 1, expert 44 | **Origin:** Legacy 1, Generated 44

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 266 | `gpt-6.1-terra` | GPT-6.1 Terra | `gpt-6.1-terra` | Legacy | max | 256,000 | 64,000 | $3.5000 | $14.0000 | $5.5000 | $22.0000 | ₹533.50 | ₹2134.00 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 267 | `pr-research-literature-review` | Literature Reviewer | `pr-research-literature-review` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 268 | `pr-research-competitive-intel` | Market & Competitive Intel | `pr-research-competitive-intel` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 269 | `pr-research-data-synthesizer` | Qualitative Data Synthesizer | `pr-research-data-synthesizer` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 270 | `pr-research-meta-analyst` | Meta-Analysis Assistant | `pr-research-meta-analyst` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 271 | `pr-research-deep-investigator` | Deep Research Specialist | `pr-research-deep-investigator` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 272 | `pr-research-literature-review-v2` | Literature Reviewer (Tier 2) | `pr-research-literature-review-v2` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 273 | `pr-research-competitive-intel-v2` | Market & Competitive Intel (Tier 2) | `pr-research-competitive-intel-v2` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 274 | `pr-research-data-synthesizer-v2` | Qualitative Data Synthesizer (Tier 2) | `pr-research-data-synthesizer-v2` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 275 | `pr-research-meta-analyst-v2` | Meta-Analysis Assistant (Tier 2) | `pr-research-meta-analyst-v2` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 276 | `pr-research-deep-investigator-v2` | Deep Research Specialist (Tier 2) | `pr-research-deep-investigator-v2` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 277 | `pr-research-literature-review-v3` | Literature Reviewer (Tier 3) | `pr-research-literature-review-v3` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 278 | `pr-research-competitive-intel-v3` | Market & Competitive Intel (Tier 3) | `pr-research-competitive-intel-v3` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 279 | `pr-research-data-synthesizer-v3` | Qualitative Data Synthesizer (Tier 3) | `pr-research-data-synthesizer-v3` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 280 | `pr-research-meta-analyst-v3` | Meta-Analysis Assistant (Tier 3) | `pr-research-meta-analyst-v3` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 281 | `pr-research-deep-investigator-v3` | Deep Research Specialist (Tier 3) | `pr-research-deep-investigator-v3` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 282 | `pr-research-literature-review-v4` | Literature Reviewer (Tier 4) | `pr-research-literature-review-v4` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 283 | `pr-research-competitive-intel-v4` | Market & Competitive Intel (Tier 4) | `pr-research-competitive-intel-v4` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 284 | `pr-research-data-synthesizer-v4` | Qualitative Data Synthesizer (Tier 4) | `pr-research-data-synthesizer-v4` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 285 | `pr-research-meta-analyst-v4` | Meta-Analysis Assistant (Tier 4) | `pr-research-meta-analyst-v4` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 286 | `pr-research-deep-investigator-v4` | Deep Research Specialist (Tier 4) | `pr-research-deep-investigator-v4` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 287 | `pr-research-literature-review-v5` | Literature Reviewer (Tier 5) | `pr-research-literature-review-v5` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 288 | `pr-research-competitive-intel-v5` | Market & Competitive Intel (Tier 5) | `pr-research-competitive-intel-v5` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 289 | `pr-research-data-synthesizer-v5` | Qualitative Data Synthesizer (Tier 5) | `pr-research-data-synthesizer-v5` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 290 | `pr-research-meta-analyst-v5` | Meta-Analysis Assistant (Tier 5) | `pr-research-meta-analyst-v5` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 291 | `pr-research-deep-investigator-v5` | Deep Research Specialist (Tier 5) | `pr-research-deep-investigator-v5` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 292 | `pr-research-literature-review-v6` | Literature Reviewer (Tier 6) | `pr-research-literature-review-v6` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 293 | `pr-research-competitive-intel-v6` | Market & Competitive Intel (Tier 6) | `pr-research-competitive-intel-v6` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 294 | `pr-research-data-synthesizer-v6` | Qualitative Data Synthesizer (Tier 6) | `pr-research-data-synthesizer-v6` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 295 | `pr-research-meta-analyst-v6` | Meta-Analysis Assistant (Tier 6) | `pr-research-meta-analyst-v6` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 296 | `pr-research-deep-investigator-v6` | Deep Research Specialist (Tier 6) | `pr-research-deep-investigator-v6` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 297 | `pr-research-literature-review-v7` | Literature Reviewer (Tier 7) | `pr-research-literature-review-v7` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 298 | `pr-research-competitive-intel-v7` | Market & Competitive Intel (Tier 7) | `pr-research-competitive-intel-v7` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 299 | `pr-research-data-synthesizer-v7` | Qualitative Data Synthesizer (Tier 7) | `pr-research-data-synthesizer-v7` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 300 | `pr-research-meta-analyst-v7` | Meta-Analysis Assistant (Tier 7) | `pr-research-meta-analyst-v7` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 301 | `pr-research-deep-investigator-v7` | Deep Research Specialist (Tier 7) | `pr-research-deep-investigator-v7` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 302 | `pr-research-literature-review-v8` | Literature Reviewer (Tier 8) | `pr-research-literature-review-v8` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 303 | `pr-research-competitive-intel-v8` | Market & Competitive Intel (Tier 8) | `pr-research-competitive-intel-v8` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 304 | `pr-research-data-synthesizer-v8` | Qualitative Data Synthesizer (Tier 8) | `pr-research-data-synthesizer-v8` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 305 | `pr-research-meta-analyst-v8` | Meta-Analysis Assistant (Tier 8) | `pr-research-meta-analyst-v8` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 306 | `pr-research-deep-investigator-v8` | Deep Research Specialist (Tier 8) | `pr-research-deep-investigator-v8` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 307 | `pr-research-literature-review-v9` | Literature Reviewer (Tier 9) | `pr-research-literature-review-v9` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 308 | `pr-research-competitive-intel-v9` | Market & Competitive Intel (Tier 9) | `pr-research-competitive-intel-v9` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 309 | `pr-research-data-synthesizer-v9` | Qualitative Data Synthesizer (Tier 9) | `pr-research-data-synthesizer-v9` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 310 | `pr-research-meta-analyst-v9` | Meta-Analysis Assistant (Tier 9) | `pr-research-meta-analyst-v9` | Generated | expert | 131,072 | 32,768 | $0.3500 | $1.0500 | $0.5500 | $1.6500 | ₹53.35 | ₹160.05 | no | `requesty/leanstral-1-5` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |

### Mathematics & Science (math_science)

**Profiles:** 30 | **Tier mix:** reason 30 | **Origin:** Generated 30

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 311 | `pr-math-discrete-proofs` | Discrete Math & Proof Assistant | `pr-math-discrete-proofs` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 312 | `pr-math-calculus-analysis` | Continuous Calculus & ODEs | `pr-math-calculus-analysis` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 313 | `pr-math-linear-algebra` | Linear Algebra & Tensor Math | `pr-math-linear-algebra` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 314 | `pr-math-physics-simulator` | Classical & Quantum Physics | `pr-math-physics-simulator` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 315 | `pr-math-bio-cheminfo` | Biochemistry & Molecular Modeling | `pr-math-bio-cheminfo` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 316 | `pr-math-discrete-proofs-v2` | Discrete Math & Proof Assistant (Tier 2) | `pr-math-discrete-proofs-v2` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 317 | `pr-math-calculus-analysis-v2` | Continuous Calculus & ODEs (Tier 2) | `pr-math-calculus-analysis-v2` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 318 | `pr-math-linear-algebra-v2` | Linear Algebra & Tensor Math (Tier 2) | `pr-math-linear-algebra-v2` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 319 | `pr-math-physics-simulator-v2` | Classical & Quantum Physics (Tier 2) | `pr-math-physics-simulator-v2` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 320 | `pr-math-bio-cheminfo-v2` | Biochemistry & Molecular Modeling (Tier 2) | `pr-math-bio-cheminfo-v2` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 321 | `pr-math-discrete-proofs-v3` | Discrete Math & Proof Assistant (Tier 3) | `pr-math-discrete-proofs-v3` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 322 | `pr-math-calculus-analysis-v3` | Continuous Calculus & ODEs (Tier 3) | `pr-math-calculus-analysis-v3` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 323 | `pr-math-linear-algebra-v3` | Linear Algebra & Tensor Math (Tier 3) | `pr-math-linear-algebra-v3` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 324 | `pr-math-physics-simulator-v3` | Classical & Quantum Physics (Tier 3) | `pr-math-physics-simulator-v3` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 325 | `pr-math-bio-cheminfo-v3` | Biochemistry & Molecular Modeling (Tier 3) | `pr-math-bio-cheminfo-v3` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 326 | `pr-math-discrete-proofs-v4` | Discrete Math & Proof Assistant (Tier 4) | `pr-math-discrete-proofs-v4` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 327 | `pr-math-calculus-analysis-v4` | Continuous Calculus & ODEs (Tier 4) | `pr-math-calculus-analysis-v4` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 328 | `pr-math-linear-algebra-v4` | Linear Algebra & Tensor Math (Tier 4) | `pr-math-linear-algebra-v4` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 329 | `pr-math-physics-simulator-v4` | Classical & Quantum Physics (Tier 4) | `pr-math-physics-simulator-v4` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 330 | `pr-math-bio-cheminfo-v4` | Biochemistry & Molecular Modeling (Tier 4) | `pr-math-bio-cheminfo-v4` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 331 | `pr-math-discrete-proofs-v5` | Discrete Math & Proof Assistant (Tier 5) | `pr-math-discrete-proofs-v5` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 332 | `pr-math-calculus-analysis-v5` | Continuous Calculus & ODEs (Tier 5) | `pr-math-calculus-analysis-v5` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 333 | `pr-math-linear-algebra-v5` | Linear Algebra & Tensor Math (Tier 5) | `pr-math-linear-algebra-v5` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 334 | `pr-math-physics-simulator-v5` | Classical & Quantum Physics (Tier 5) | `pr-math-physics-simulator-v5` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 335 | `pr-math-bio-cheminfo-v5` | Biochemistry & Molecular Modeling (Tier 5) | `pr-math-bio-cheminfo-v5` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 336 | `pr-math-discrete-proofs-v6` | Discrete Math & Proof Assistant (Tier 6) | `pr-math-discrete-proofs-v6` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 337 | `pr-math-calculus-analysis-v6` | Continuous Calculus & ODEs (Tier 6) | `pr-math-calculus-analysis-v6` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 338 | `pr-math-linear-algebra-v6` | Linear Algebra & Tensor Math (Tier 6) | `pr-math-linear-algebra-v6` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 339 | `pr-math-physics-simulator-v6` | Classical & Quantum Physics (Tier 6) | `pr-math-physics-simulator-v6` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |
| 340 | `pr-math-bio-cheminfo-v6` | Biochemistry & Molecular Modeling (Tier 6) | `pr-math-bio-cheminfo-v6` | Generated | reason | 131,072 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `groq/gpt-oss-120b` | `prorouter/deepseek-v4.1-flash` |

### Multilingual & Indic AI (multilingual)

**Profiles:** 35 | **Tier mix:** standard 35 | **Origin:** Verified 2, Generated 33

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 341 | `gemma-4-31b-it` | Gemma 4 31B IT | `gemma-4-31b-it` | Verified | standard | 262,144 | 8,192 | $0.1400 | $0.4200 | $0.2200 | $0.6600 | ₹21.34 | ₹64.02 | no | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 342 | `allam-2-7b` | Allam 2 7B | `allam-2-7b` | Verified | standard | 4,096 | 2,048 | $0.0500 | $0.1500 | $0.0786 | $0.2357 | ₹7.62 | ₹22.86 | no | `groq/allam-2-7b` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 343 | `pr-lang-tamil-dravidian` | Tamil & Dravidian Scholar | `pr-lang-tamil-dravidian` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 344 | `pr-lang-indic-translingual` | Indic Polyglot | `pr-lang-indic-translingual` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 345 | `pr-lang-euro-multilingual` | European Romance & Germanic | `pr-lang-euro-multilingual` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 346 | `pr-lang-cjk-specialist` | East Asian CJK Specialist | `pr-lang-cjk-specialist` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 347 | `pr-lang-arabic-mena` | Arabic & MENA Dialectics | `pr-lang-arabic-mena` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 348 | `pr-lang-tamil-dravidian-v2` | Tamil & Dravidian Scholar (Tier 2) | `pr-lang-tamil-dravidian-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 349 | `pr-lang-indic-translingual-v2` | Indic Polyglot (Tier 2) | `pr-lang-indic-translingual-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 350 | `pr-lang-euro-multilingual-v2` | European Romance & Germanic (Tier 2) | `pr-lang-euro-multilingual-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 351 | `pr-lang-cjk-specialist-v2` | East Asian CJK Specialist (Tier 2) | `pr-lang-cjk-specialist-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 352 | `pr-lang-arabic-mena-v2` | Arabic & MENA Dialectics (Tier 2) | `pr-lang-arabic-mena-v2` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 353 | `pr-lang-tamil-dravidian-v3` | Tamil & Dravidian Scholar (Tier 3) | `pr-lang-tamil-dravidian-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 354 | `pr-lang-indic-translingual-v3` | Indic Polyglot (Tier 3) | `pr-lang-indic-translingual-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 355 | `pr-lang-euro-multilingual-v3` | European Romance & Germanic (Tier 3) | `pr-lang-euro-multilingual-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 356 | `pr-lang-cjk-specialist-v3` | East Asian CJK Specialist (Tier 3) | `pr-lang-cjk-specialist-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 357 | `pr-lang-arabic-mena-v3` | Arabic & MENA Dialectics (Tier 3) | `pr-lang-arabic-mena-v3` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 358 | `pr-lang-tamil-dravidian-v4` | Tamil & Dravidian Scholar (Tier 4) | `pr-lang-tamil-dravidian-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 359 | `pr-lang-indic-translingual-v4` | Indic Polyglot (Tier 4) | `pr-lang-indic-translingual-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 360 | `pr-lang-euro-multilingual-v4` | European Romance & Germanic (Tier 4) | `pr-lang-euro-multilingual-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 361 | `pr-lang-cjk-specialist-v4` | East Asian CJK Specialist (Tier 4) | `pr-lang-cjk-specialist-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 362 | `pr-lang-arabic-mena-v4` | Arabic & MENA Dialectics (Tier 4) | `pr-lang-arabic-mena-v4` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 363 | `pr-lang-tamil-dravidian-v5` | Tamil & Dravidian Scholar (Tier 5) | `pr-lang-tamil-dravidian-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 364 | `pr-lang-indic-translingual-v5` | Indic Polyglot (Tier 5) | `pr-lang-indic-translingual-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 365 | `pr-lang-euro-multilingual-v5` | European Romance & Germanic (Tier 5) | `pr-lang-euro-multilingual-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 366 | `pr-lang-cjk-specialist-v5` | East Asian CJK Specialist (Tier 5) | `pr-lang-cjk-specialist-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 367 | `pr-lang-arabic-mena-v5` | Arabic & MENA Dialectics (Tier 5) | `pr-lang-arabic-mena-v5` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 368 | `pr-lang-tamil-dravidian-v6` | Tamil & Dravidian Scholar (Tier 6) | `pr-lang-tamil-dravidian-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 369 | `pr-lang-indic-translingual-v6` | Indic Polyglot (Tier 6) | `pr-lang-indic-translingual-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 370 | `pr-lang-euro-multilingual-v6` | European Romance & Germanic (Tier 6) | `pr-lang-euro-multilingual-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 371 | `pr-lang-cjk-specialist-v6` | East Asian CJK Specialist (Tier 6) | `pr-lang-cjk-specialist-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 372 | `pr-lang-arabic-mena-v6` | Arabic & MENA Dialectics (Tier 6) | `pr-lang-arabic-mena-v6` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 373 | `pr-lang-tamil-dravidian-v7` | Tamil & Dravidian Scholar (Tier 7) | `pr-lang-tamil-dravidian-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 374 | `pr-lang-indic-translingual-v7` | Indic Polyglot (Tier 7) | `pr-lang-indic-translingual-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |
| 375 | `pr-lang-euro-multilingual-v7` | European Romance & Germanic (Tier 7) | `pr-lang-euro-multilingual-v7` | Generated | standard | 131,072 | 32,768 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/gemma-4-31b-it` | `groq/qwen3.8-27b` | `prorouter/deepseek-v4.1-flash` |

### Vision & Document Intelligence (vision)

**Profiles:** 35 | **Tier mix:** standard 35 | **Origin:** Verified 2, Generated 33

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 376 | `nemotron-3-nano-omni-30b-a3b-reasoning` | Nemotron 3 Nano Omni 30B Reasoning | `nemotron-3-nano-omni-30b` | Verified | standard | 131,072 | 20,480 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `openrouter/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 377 | `nemotron-3.5-super-vl` | Nemotron 3.5 Super VL | `nemotron-3.5-super-vl` | Verified | standard | 128,000 | 64,000 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `openrouter/nemotron-3.5-super-vl` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 378 | `pr-vision-ocr-doc-scanner` | OCR Document Intelligence | `pr-vision-ocr-doc-scanner` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 379 | `pr-vision-chart-diagram` | Chart & Architecture Visualizer | `pr-vision-chart-diagram` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 380 | `pr-vision-ui-ux-auditor` | UI/UX Screen Inspector | `pr-vision-ui-ux-auditor` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 381 | `pr-vision-infographic-parser` | Infographic Insight Extractor | `pr-vision-infographic-parser` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 382 | `pr-vision-scene-descriptor` | Spatial & Scene Comprehender | `pr-vision-scene-descriptor` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 383 | `pr-vision-ocr-doc-scanner-v2` | OCR Document Intelligence (Tier 2) | `pr-vision-ocr-doc-scanner-v2` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 384 | `pr-vision-chart-diagram-v2` | Chart & Architecture Visualizer (Tier 2) | `pr-vision-chart-diagram-v2` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 385 | `pr-vision-ui-ux-auditor-v2` | UI/UX Screen Inspector (Tier 2) | `pr-vision-ui-ux-auditor-v2` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 386 | `pr-vision-infographic-parser-v2` | Infographic Insight Extractor (Tier 2) | `pr-vision-infographic-parser-v2` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 387 | `pr-vision-scene-descriptor-v2` | Spatial & Scene Comprehender (Tier 2) | `pr-vision-scene-descriptor-v2` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 388 | `pr-vision-ocr-doc-scanner-v3` | OCR Document Intelligence (Tier 3) | `pr-vision-ocr-doc-scanner-v3` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 389 | `pr-vision-chart-diagram-v3` | Chart & Architecture Visualizer (Tier 3) | `pr-vision-chart-diagram-v3` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 390 | `pr-vision-ui-ux-auditor-v3` | UI/UX Screen Inspector (Tier 3) | `pr-vision-ui-ux-auditor-v3` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 391 | `pr-vision-infographic-parser-v3` | Infographic Insight Extractor (Tier 3) | `pr-vision-infographic-parser-v3` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 392 | `pr-vision-scene-descriptor-v3` | Spatial & Scene Comprehender (Tier 3) | `pr-vision-scene-descriptor-v3` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 393 | `pr-vision-ocr-doc-scanner-v4` | OCR Document Intelligence (Tier 4) | `pr-vision-ocr-doc-scanner-v4` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 394 | `pr-vision-chart-diagram-v4` | Chart & Architecture Visualizer (Tier 4) | `pr-vision-chart-diagram-v4` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 395 | `pr-vision-ui-ux-auditor-v4` | UI/UX Screen Inspector (Tier 4) | `pr-vision-ui-ux-auditor-v4` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 396 | `pr-vision-infographic-parser-v4` | Infographic Insight Extractor (Tier 4) | `pr-vision-infographic-parser-v4` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 397 | `pr-vision-scene-descriptor-v4` | Spatial & Scene Comprehender (Tier 4) | `pr-vision-scene-descriptor-v4` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 398 | `pr-vision-ocr-doc-scanner-v5` | OCR Document Intelligence (Tier 5) | `pr-vision-ocr-doc-scanner-v5` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 399 | `pr-vision-chart-diagram-v5` | Chart & Architecture Visualizer (Tier 5) | `pr-vision-chart-diagram-v5` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 400 | `pr-vision-ui-ux-auditor-v5` | UI/UX Screen Inspector (Tier 5) | `pr-vision-ui-ux-auditor-v5` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 401 | `pr-vision-infographic-parser-v5` | Infographic Insight Extractor (Tier 5) | `pr-vision-infographic-parser-v5` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 402 | `pr-vision-scene-descriptor-v5` | Spatial & Scene Comprehender (Tier 5) | `pr-vision-scene-descriptor-v5` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 403 | `pr-vision-ocr-doc-scanner-v6` | OCR Document Intelligence (Tier 6) | `pr-vision-ocr-doc-scanner-v6` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 404 | `pr-vision-chart-diagram-v6` | Chart & Architecture Visualizer (Tier 6) | `pr-vision-chart-diagram-v6` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 405 | `pr-vision-ui-ux-auditor-v6` | UI/UX Screen Inspector (Tier 6) | `pr-vision-ui-ux-auditor-v6` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 406 | `pr-vision-infographic-parser-v6` | Infographic Insight Extractor (Tier 6) | `pr-vision-infographic-parser-v6` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 407 | `pr-vision-scene-descriptor-v6` | Spatial & Scene Comprehender (Tier 6) | `pr-vision-scene-descriptor-v6` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 408 | `pr-vision-ocr-doc-scanner-v7` | OCR Document Intelligence (Tier 7) | `pr-vision-ocr-doc-scanner-v7` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 409 | `pr-vision-chart-diagram-v7` | Chart & Architecture Visualizer (Tier 7) | `pr-vision-chart-diagram-v7` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |
| 410 | `pr-vision-ui-ux-auditor-v7` | UI/UX Screen Inspector (Tier 7) | `pr-vision-ui-ux-auditor-v7` | Generated | standard | 128,000 | 32,768 | $0.2500 | $0.7500 | $0.3929 | $1.1786 | ₹38.11 | ₹114.32 | no | `openrouter/nemotron-3.5-super-vl` | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` | `prorouter/deepseek-v4.1-flash` |

### Fast-Response AI (fast)

**Profiles:** 30 | **Tier mix:** flash 6, lite 24 | **Origin:** Legacy 4, Verified 3, Generated 23

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 411 | `gpt-6-luna` | GPT-6 Luna | `gpt-6-luna` | Legacy | flash | 256,000 | 64,000 | $0.4000 | $1.6000 | $0.6286 | $2.5143 | ₹60.97 | ₹243.89 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 412 | `glm-5.3-flash` | GLM-5.3-Flash | `glm-5.3-flash` | Legacy | flash | 200,000 | 128,000 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 413 | `mimo-v2.6-flash` | MiMo-V2.6-Flash | `mimo-v2.6-flash` | Legacy | lite | 1,048,576 | 131,072 | $0.1000 | $0.3000 | $0.1571 | $0.4714 | ₹15.24 | ₹45.73 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 414 | `minimax-m3.1-flash` | MiniMax M3.1 Flash | `minimax-m3.1-flash` | Legacy | flash | 1,000,000 | 131,072 | $0.1500 | $0.4500 | $0.2357 | $0.7071 | ₹22.86 | ₹68.59 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 415 | `nemotron-3.5-lightning-30b-a3b` | Nemotron 3.5 Lightning 30B A3B | `nemotron-3.5-lightning` | Verified | flash | 1,048,576 | 65,536 | $0.1000 | $0.3000 | $0.1571 | $0.4714 | ₹15.24 | ₹45.73 | no | `requesty/nemotron-3.5-lightning-30b-a3b` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 416 | `nemotron-3.5-lightning` | Nemotron 3.5 Lightning | `nemotron-3.5-lightning` | Verified | flash | 1,048,576 | 65,536 | $0.1000 | $0.3000 | $0.1571 | $0.4714 | ₹15.24 | ₹45.73 | no | `openrouter/nemotron-3.5-lightning` | `requesty/nemotron-3.5-lightning-30b-a3b` | `prorouter/deepseek-v4.1-flash` |
| 417 | `ling-3.1-flash` | Ling 3.1 Flash | `ling-3.1-flash` | Verified | flash | 262,144 | 32,768 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `prorouter/deepseek-v4.1-flash` | `prorouter/deepseek-v4.1-flash` |
| 418 | `pr-fast-instant-reply` | Instant Customer Reply | `pr-fast-instant-reply` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 419 | `pr-fast-realtime-moderator` | Realtime Stream Moderator | `pr-fast-realtime-moderator` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 420 | `pr-fast-micro-parser` | Micro-Payload Parser | `pr-fast-micro-parser` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 421 | `pr-fast-quick-editor` | Instant Grammar & Polish | `pr-fast-quick-editor` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 422 | `pr-fast-autocomplete-hint` | Autocomplete Code Predictor | `pr-fast-autocomplete-hint` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 423 | `pr-fast-instant-reply-v2` | Instant Customer Reply (Tier 2) | `pr-fast-instant-reply-v2` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 424 | `pr-fast-realtime-moderator-v2` | Realtime Stream Moderator (Tier 2) | `pr-fast-realtime-moderator-v2` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 425 | `pr-fast-micro-parser-v2` | Micro-Payload Parser (Tier 2) | `pr-fast-micro-parser-v2` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 426 | `pr-fast-quick-editor-v2` | Instant Grammar & Polish (Tier 2) | `pr-fast-quick-editor-v2` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 427 | `pr-fast-autocomplete-hint-v2` | Autocomplete Code Predictor (Tier 2) | `pr-fast-autocomplete-hint-v2` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 428 | `pr-fast-instant-reply-v3` | Instant Customer Reply (Tier 3) | `pr-fast-instant-reply-v3` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 429 | `pr-fast-realtime-moderator-v3` | Realtime Stream Moderator (Tier 3) | `pr-fast-realtime-moderator-v3` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 430 | `pr-fast-micro-parser-v3` | Micro-Payload Parser (Tier 3) | `pr-fast-micro-parser-v3` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 431 | `pr-fast-quick-editor-v3` | Instant Grammar & Polish (Tier 3) | `pr-fast-quick-editor-v3` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 432 | `pr-fast-autocomplete-hint-v3` | Autocomplete Code Predictor (Tier 3) | `pr-fast-autocomplete-hint-v3` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 433 | `pr-fast-instant-reply-v4` | Instant Customer Reply (Tier 4) | `pr-fast-instant-reply-v4` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 434 | `pr-fast-realtime-moderator-v4` | Realtime Stream Moderator (Tier 4) | `pr-fast-realtime-moderator-v4` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 435 | `pr-fast-micro-parser-v4` | Micro-Payload Parser (Tier 4) | `pr-fast-micro-parser-v4` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 436 | `pr-fast-quick-editor-v4` | Instant Grammar & Polish (Tier 4) | `pr-fast-quick-editor-v4` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 437 | `pr-fast-autocomplete-hint-v4` | Autocomplete Code Predictor (Tier 4) | `pr-fast-autocomplete-hint-v4` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 438 | `pr-fast-instant-reply-v5` | Instant Customer Reply (Tier 5) | `pr-fast-instant-reply-v5` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 439 | `pr-fast-realtime-moderator-v5` | Realtime Stream Moderator (Tier 5) | `pr-fast-realtime-moderator-v5` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |
| 440 | `pr-fast-micro-parser-v5` | Micro-Payload Parser (Tier 5) | `pr-fast-micro-parser-v5` | Generated | lite | 131,072 | 16,384 | $0.0800 | $0.2400 | $0.1257 | $0.3771 | ₹12.19 | ₹36.58 | no | `requesty/ling-3.1-flash` | `openrouter/nemotron-3.5-lightning` | `prorouter/deepseek-v4.1-flash` |

### Long-Context AI (long_context)

**Profiles:** 25 | **Tier mix:** standard 2, ultra 23 | **Origin:** Legacy 2, Generated 23

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 441 | `kimi-k3` | Kimi K3 | `kimi-k3` | Legacy | standard | 200,000 | 64,000 | $0.8000 | $2.4000 | $1.2571 | $3.7714 | ₹121.94 | ₹365.83 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 442 | `longcat-2.5-preview` | LongCat 2.5 Preview | `longcat-2.5-preview` | Legacy | standard | 200,000 | 64,000 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `prorouter/deepseek-v4.1-flash` | `—` | `prorouter/deepseek-v4.1-flash` |
| 443 | `pr-ctx-million-token-auditor` | 1M+ Token Corpus Auditor | `pr-ctx-million-token-auditor` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 444 | `pr-ctx-codebase-indexer` | Monorepo Codebase Indexer | `pr-ctx-codebase-indexer` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 445 | `pr-ctx-legal-contract-depot` | Multi-Contract Master Agreement | `pr-ctx-legal-contract-depot` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 446 | `pr-ctx-financial-ledger-book` | Annual Report & 10-K Synthesizer | `pr-ctx-financial-ledger-book` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 447 | `pr-ctx-historical-archive` | Full-Transcript Meeting Digest | `pr-ctx-historical-archive` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 448 | `pr-ctx-million-token-auditor-v2` | 1M+ Token Corpus Auditor (Tier 2) | `pr-ctx-million-token-auditor-v2` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 449 | `pr-ctx-codebase-indexer-v2` | Monorepo Codebase Indexer (Tier 2) | `pr-ctx-codebase-indexer-v2` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 450 | `pr-ctx-legal-contract-depot-v2` | Multi-Contract Master Agreement (Tier 2) | `pr-ctx-legal-contract-depot-v2` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 451 | `pr-ctx-financial-ledger-book-v2` | Annual Report & 10-K Synthesizer (Tier 2) | `pr-ctx-financial-ledger-book-v2` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 452 | `pr-ctx-historical-archive-v2` | Full-Transcript Meeting Digest (Tier 2) | `pr-ctx-historical-archive-v2` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 453 | `pr-ctx-million-token-auditor-v3` | 1M+ Token Corpus Auditor (Tier 3) | `pr-ctx-million-token-auditor-v3` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 454 | `pr-ctx-codebase-indexer-v3` | Monorepo Codebase Indexer (Tier 3) | `pr-ctx-codebase-indexer-v3` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 455 | `pr-ctx-legal-contract-depot-v3` | Multi-Contract Master Agreement (Tier 3) | `pr-ctx-legal-contract-depot-v3` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 456 | `pr-ctx-financial-ledger-book-v3` | Annual Report & 10-K Synthesizer (Tier 3) | `pr-ctx-financial-ledger-book-v3` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 457 | `pr-ctx-historical-archive-v3` | Full-Transcript Meeting Digest (Tier 3) | `pr-ctx-historical-archive-v3` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 458 | `pr-ctx-million-token-auditor-v4` | 1M+ Token Corpus Auditor (Tier 4) | `pr-ctx-million-token-auditor-v4` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 459 | `pr-ctx-codebase-indexer-v4` | Monorepo Codebase Indexer (Tier 4) | `pr-ctx-codebase-indexer-v4` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 460 | `pr-ctx-legal-contract-depot-v4` | Multi-Contract Master Agreement (Tier 4) | `pr-ctx-legal-contract-depot-v4` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 461 | `pr-ctx-financial-ledger-book-v4` | Annual Report & 10-K Synthesizer (Tier 4) | `pr-ctx-financial-ledger-book-v4` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 462 | `pr-ctx-historical-archive-v4` | Full-Transcript Meeting Digest (Tier 4) | `pr-ctx-historical-archive-v4` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 463 | `pr-ctx-million-token-auditor-v5` | 1M+ Token Corpus Auditor (Tier 5) | `pr-ctx-million-token-auditor-v5` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 464 | `pr-ctx-codebase-indexer-v5` | Monorepo Codebase Indexer (Tier 5) | `pr-ctx-codebase-indexer-v5` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |
| 465 | `pr-ctx-legal-contract-depot-v5` | Multi-Contract Master Agreement (Tier 5) | `pr-ctx-legal-contract-depot-v5` | Generated | ultra | 1,048,576 | 32,768 | $0.4000 | $1.2000 | $0.6286 | $1.8857 | ₹60.97 | ₹182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` | `requesty/leanstral-1-5` | `prorouter/deepseek-v4.1-flash` |

### Creative Writing (creative)

**Profiles:** 20 | **Tier mix:** standard 20 | **Origin:** Generated 20

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 466 | `pr-creative-fiction-worldbuilder` | Fiction & Worldbuilder | `pr-creative-fiction-worldbuilder` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 467 | `pr-creative-screenplay-dialogue` | Screenplay & Scene Writer | `pr-creative-screenplay-dialogue` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 468 | `pr-creative-poetic-artisan` | Poetic & Metaphoric Artisan | `pr-creative-poetic-artisan` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 469 | `pr-creative-game-lore-craftsman` | Game Lore & NPC Dialogue | `pr-creative-game-lore-craftsman` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 470 | `pr-creative-fiction-worldbuilder-v2` | Fiction & Worldbuilder (Tier 2) | `pr-creative-fiction-worldbuilder-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 471 | `pr-creative-screenplay-dialogue-v2` | Screenplay & Scene Writer (Tier 2) | `pr-creative-screenplay-dialogue-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 472 | `pr-creative-poetic-artisan-v2` | Poetic & Metaphoric Artisan (Tier 2) | `pr-creative-poetic-artisan-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 473 | `pr-creative-game-lore-craftsman-v2` | Game Lore & NPC Dialogue (Tier 2) | `pr-creative-game-lore-craftsman-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 474 | `pr-creative-fiction-worldbuilder-v3` | Fiction & Worldbuilder (Tier 3) | `pr-creative-fiction-worldbuilder-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 475 | `pr-creative-screenplay-dialogue-v3` | Screenplay & Scene Writer (Tier 3) | `pr-creative-screenplay-dialogue-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 476 | `pr-creative-poetic-artisan-v3` | Poetic & Metaphoric Artisan (Tier 3) | `pr-creative-poetic-artisan-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 477 | `pr-creative-game-lore-craftsman-v3` | Game Lore & NPC Dialogue (Tier 3) | `pr-creative-game-lore-craftsman-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 478 | `pr-creative-fiction-worldbuilder-v4` | Fiction & Worldbuilder (Tier 4) | `pr-creative-fiction-worldbuilder-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 479 | `pr-creative-screenplay-dialogue-v4` | Screenplay & Scene Writer (Tier 4) | `pr-creative-screenplay-dialogue-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 480 | `pr-creative-poetic-artisan-v4` | Poetic & Metaphoric Artisan (Tier 4) | `pr-creative-poetic-artisan-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 481 | `pr-creative-game-lore-craftsman-v4` | Game Lore & NPC Dialogue (Tier 4) | `pr-creative-game-lore-craftsman-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 482 | `pr-creative-fiction-worldbuilder-v5` | Fiction & Worldbuilder (Tier 5) | `pr-creative-fiction-worldbuilder-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 483 | `pr-creative-screenplay-dialogue-v5` | Screenplay & Scene Writer (Tier 5) | `pr-creative-screenplay-dialogue-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 484 | `pr-creative-poetic-artisan-v5` | Poetic & Metaphoric Artisan (Tier 5) | `pr-creative-poetic-artisan-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |
| 485 | `pr-creative-game-lore-craftsman-v5` | Game Lore & NPC Dialogue (Tier 5) | `pr-creative-game-lore-craftsman-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `prorouter/deepseek-v4.1-flash` | `requesty/gemma-4-31b-it` | `prorouter/deepseek-v4.1-flash` |

### Business & Productivity (business)

**Profiles:** 15 | **Tier mix:** standard 15 | **Origin:** Generated 15

| # | Model ID | Display name | Canonical ID | Origin | Tier | Context | Max out | Upstream $/1M in | Upstream $/1M out | Customer $/1M in | Customer $/1M out | Customer ₹/1M in | Customer ₹/1M out | Free | Primary backend | Secondary backend | Final fallback |
|---:|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|:---:|---|---|---|
| 486 | `pr-biz-board-memo` | Board Memo & Investor Update | `pr-biz-board-memo` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 487 | `pr-biz-sales-pitch-craft` | Enterprise Sales Strategist | `pr-biz-sales-pitch-craft` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 488 | `pr-biz-product-spec-lead` | PRD & Product Spec Lead | `pr-biz-product-spec-lead` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 489 | `pr-biz-board-memo-v2` | Board Memo & Investor Update (Tier 2) | `pr-biz-board-memo-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 490 | `pr-biz-sales-pitch-craft-v2` | Enterprise Sales Strategist (Tier 2) | `pr-biz-sales-pitch-craft-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 491 | `pr-biz-product-spec-lead-v2` | PRD & Product Spec Lead (Tier 2) | `pr-biz-product-spec-lead-v2` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 492 | `pr-biz-board-memo-v3` | Board Memo & Investor Update (Tier 3) | `pr-biz-board-memo-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 493 | `pr-biz-sales-pitch-craft-v3` | Enterprise Sales Strategist (Tier 3) | `pr-biz-sales-pitch-craft-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 494 | `pr-biz-product-spec-lead-v3` | PRD & Product Spec Lead (Tier 3) | `pr-biz-product-spec-lead-v3` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 495 | `pr-biz-board-memo-v4` | Board Memo & Investor Update (Tier 4) | `pr-biz-board-memo-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 496 | `pr-biz-sales-pitch-craft-v4` | Enterprise Sales Strategist (Tier 4) | `pr-biz-sales-pitch-craft-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 497 | `pr-biz-product-spec-lead-v4` | PRD & Product Spec Lead (Tier 4) | `pr-biz-product-spec-lead-v4` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 498 | `pr-biz-board-memo-v5` | Board Memo & Investor Update (Tier 5) | `pr-biz-board-memo-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 499 | `pr-biz-sales-pitch-craft-v5` | Enterprise Sales Strategist (Tier 5) | `pr-biz-sales-pitch-craft-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |
| 500 | `pr-biz-product-spec-lead-v5` | PRD & Product Spec Lead (Tier 5) | `pr-biz-product-spec-lead-v5` | Generated | standard | 131,072 | 32,768 | $0.2000 | $0.6000 | $0.3143 | $0.9429 | ₹30.49 | ₹91.46 | no | `groq/gpt-oss-120b` | `requesty/nemotron-3-ultra-550b-a55b` | `prorouter/deepseek-v4.1-flash` |

---

## Appendix B: API registration summary

| Module | Count | Representative paths |
|---|---:|---|
| admin | 43 | Admin users, models, providers, plans, promotions, requests |
| auth | 6 | Signup, login, logout, session, password change |
| catalog | 17 | `/catalog/profiles`, `/api/catalog/profiles`, `/models` handlers |
| chat | 4 | `/v1/models`, `/v1/models/:id`, `/v1/chat/completions`, `/chat/completions` |
| dashboard | 8 | Summary, activity, usage, wallet, keys |
| events | 2 | Event stream/recording paths |
| keys | 4 | List, create, revoke, update API keys |
| messages | 2 | Chat message persistence paths |
| plans | 1 | Public plan listing |
| promotions | 9 | Astra/promotional validation and redemption |
| usage | 3 | Usage summary and history |
| wallet | 8 | Balance, transactions, top-up, packs |
| **Total** | **107** | |

The route count is a static registration count taken from `app.<method>(` calls; it does not count alias paths registered through helpers or routes mounted by plugins. The chat module's four registrations include both the versioned OpenAI path and the unversioned compatibility path.

---

*End of report.*
