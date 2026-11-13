# 14 — Configuration Reference

> All secret values are redacted. Names are the authoritative interface; `.env.example` is the source of truth for the full list.

## 1. Runtime environment variables

### Core

| Variable | Purpose | Default / notes |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` / `API_PORT` | Fastify listen port | `4000` (API) |
| `API_BASE_URL` | Web → API proxy target | `http://localhost:4000` in dev |
| `DATABASE_URL` | Postgres connection string | If unset, embedded PGlite is used |
| `DATABASE_DIR` | PGlite data directory | Local path |
| `MONGODB_URI` | Optional Mongo connection | Feature-gated |
| `MONGODB_DB` | Mongo database name | Optional |
| `REDIS_URL` | Referenced for shared state | **NEEDS VERIFICATION** (no Redis client path confirmed) |
| `AUTH_SECRET` | Session/token signing material | Secret; required in production |
| `ENCRYPTION_KEY` | AES-256-GCM key for provider credentials | Secret; required |
| `ROUTING_CONFIG_PATH` | JSON overrides for the router | Optional |
| `USD_TO_INR_RATE` | Seed/override conversion rate | Prod seed 97; dev 80 |
| `BILL_ESTIMATED_USAGE` | Bill estimated tokens when upstream usage is absent | `false` |
| `MAX_API_KEYS` | Per-user API key cap | `20` |

### Provider credentials (all secrets)

| Variable(s) | Provider |
|---|---|
| `OPENAI_API_KEY` | OpenAI |
| `ANTHROPIC_API_KEY` | Anthropic |
| `GOOGLE_API_KEY` (and/or Gemini key) | Google |
| `GROQ_API_KEY` | Groq |
| `MISTRAL_API_KEY` | Mistral |
| `PROVIDER_OPENROUTER_*` | OpenRouter |
| `PROVIDER_CUSTOM_OPENAI_*` | Custom OpenAI-compatible |
| `PROVIDER_PROROUTER_GATEWAY_*` | ProRouter gateway (`gpt-code-p2mf.onrender.com/v1`) |
| `PROVIDER_REQUESTY_*` | Requesty (`router.requesty.ai/v1`) |
| `PROVIDER_NABH_*` | Nabh |
| FreeModels credentials | Freemodels (`Origin: https://freemodels.pro`) |

### Payments

| Variable(s) | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Checkout + signature verification |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe webhook path |

## 2. Database-backed settings (`system_settings`)

Read through `getSetting` / `getNumber` / `getFlag` with a **15 s cache**:

| Key | Observed value | Effect |
|---|---|---|
| `USD_TO_INR_RATE` | 97 (prod seed) | Charging/display conversion |
| `USD_TO_INR_MARKET_RATE` | 88 | Market reference display |
| `BILL_ESTIMATED_USAGE` | false | Estimated-token billing toggle |
| `MAX_API_KEYS` | 20 | Key cap per user |
| Feature flags | various | `feature_flags` table |

## 3. Pricing configuration defaults

From `packages/shared/src/pricing-engine.ts` (`DEFAULT_PRICING_CONFIG`):

| Parameter | Default |
|---|---|
| `operationalReserve` | 0.10 |
| `targetGrossMargin` | 0.30 |
| `minimumPriceUsd` | 0.05 |
| `maximumMargin` | 0.85 |
| Cached input discount | 0.50 |

Whether every value can be overridden by settings is **NEEDS VERIFICATION**; the constants are the effective defaults in code.

## 4. Hardcoded operational constants

| Constant | Value | Location |
|---|---|---|
| IP rate limit | 120/min | `ratelimit.ts` |
| User rate limit | 60/min | `ratelimit.ts` |
| API-key rate limit | 60/min | `ratelimit.ts` |
| Settings cache TTL | 15 s | `settings.ts` |
| SSE heartbeat | 15 s | events route |
| SSE replay buffer | 100 events | `events.ts` |
| Proxy timeout | 2500 ms | web proxy |
| Proxy failure cooldown | 45000 ms | web proxy |
| Web gateway max duration | 60 s | `/v1` route |
| Demo daily cap | 10 requests | `/v1` route (in-memory) |
| Free models | `prorouter/deepseek-v4.1-flash`, `groq/qwen3.8-27b` | routing registry |
| Pricing tiers | lite/flash/standard/code/reason (+expert) | catalog aliases |

## 5. Config precedence

1. Process environment (`.env` loaded by the API).
2. `system_settings` for runtime-tunable values (with 15 s cache).
3. Hardcoded constants/defaults.

There are **two sources of truth** for several concerns:

- Currency: env seed vs `system_settings` vs pricing-engine default (97/88/80).
- Provider credentials: env + `provider_credentials` table + web gateway built-in pools.
- Catalogs: database catalog vs `backend-registry.ts` vs web `ALL_MODELS`.

## 6. Validation and failure behavior

- Environment parsing is Zod-based; invalid/missing critical values should fail fast at boot (exact required/optional split **NEEDS VERIFICATION**).
- Mongo is optional and lazily connected; failure degrades to SQL/PGlite where supported.
- Payment gateways are optional at boot but checkout/webhooks fail at call time if unconfigured.
- Missing provider keys disable those adapters at request time rather than at boot.

## 7. Security notes

- `AUTH_SECRET` and `ENCRYPTION_KEY` must be high-entropy and distinct per environment; rotating `ENCRYPTION_KEY` without re-encrypting `provider_credentials` breaks decryption.
- Provider keys in the web tier (`/v1` gateway) are a second secret store outside `provider_credentials`; they need the same rotation and access controls.
- Webhook secrets must be verified before any ledger mutation; both Razorpay and Stripe paths implement signature checks per doc 09.
- Never expose `system_settings` or credential DTOs to non-admin clients; admin routes are role-gated (doc 08).

## 8. Configuration status

| Area | Status |
|---|---|
| Core env validation | FULLY IMPLEMENTED |
| Provider env plumbing | FULLY IMPLEMENTED |
| Runtime settings + cache | FULLY IMPLEMENTED |
| Single source of truth for currency | PARTIALLY IMPLEMENTED |
| Single source of truth for provider keys | PARTIALLY IMPLEMENTED |
| Redis-backed shared config/state | NEEDS VERIFICATION |
| Config documentation parity with code | PARTIALLY IMPLEMENTED |
