# 01 — Project Overview

> Analysis basis: read-only review of the repository at `C:\Users\Lenovo\my router`. All statements below were derived from source files; inferred or unverified claims are explicitly tagged. Secret values are redacted.

## 1. What the project is

Pro Router is a self-hosted, OpenRouter-style AI model routing platform with:

- A **customer web application** (`apps/web`) built with Next.js 16 / React 19 / Tailwind CSS 4, offering marketing pages, an authenticated chat UI, a usage dashboard, a wallet/billing area, model rankings, and an admin console.
- A **Fastify 5 HTTP API** (`apps/api`) that owns authentication, API keys, catalog serving, billing, promotions, usage accounting, admin operations, and OpenAI-compatible chat completions.
- A **routing engine** (`packages/routing`) that selects upstream provider backends from a registry, with capability matching, health tracking, weighted scoring, and fallback management.
- **Provider adapters** (`packages/providers`) for OpenAI-compatible endpoints plus Anthropic-style and Freemodels upstreams.
- A **persistence layer** (`packages/database`) built on Drizzle ORM with an embedded PGlite/PostgreSQL driver and an optional MongoDB primary store.

The product targets the Indian market: wallet balances and per-token prices are stored as integer **paise**, and USD→INR rates are read from system settings.

## 2. Verified product surfaces

| Surface | Location | Status |
|---|---|---|
| Marketing site | `apps/web/app/page.tsx`, `pricing`, `providers`, `rankings`, `docs`, `changelog`, `security`, `status`, legal pages | Present |
| Auth UI | `apps/web/app/login`, `signup`, `redeem` | Present |
| Chat UI + dashboard shell | `apps/web/app/chat`, `apps/web/app/dashboard/layout.tsx` | Present |
| Dashboard pages | `dashboard` overview, `wallet`, `usage`, `activity`, `inspector`, `astra`, `admin`, `text/usage`, `text/fair-use`, `text/plans`, `text/checkout` | Present |
| Admin console | `apps/web/app/admin` + `/admin/*` API routes | Present |
| OpenAI-compatible API | `apps/api/src/routes/chat.ts`, `apps/web/app/v1/[...path]/route.ts` | Present |
| API key management | `apps/api/src/routes/keys.ts`, `apps/web/app/dashboard` UI | Present |

## 3. Technology stack (verified)

| Layer | Technology |
|---|---|
| Monorepo | npm workspaces (`packages/*`, `apps/*`); Node.js ≥ 20; TypeScript ESM |
| Backend framework | Fastify 5, `@fastify/cors`, `@fastify/cookie` |
| Validation | Zod |
| Frontend | Next.js 16 App Router, React 19, Tailwind CSS 4 |
| ORM / SQL | Drizzle ORM; default embedded PGlite at `.data/db`; optional external PostgreSQL |
| Optional document store | MongoDB (`mongodb` driver), enabled by `MONGODB_URI`, database `prorouter` |
| Auth | Opaque session tokens in httpOnly cookies; SHA-256-hashed API keys (`pro_sk_live_*`) |
| Password hashing | scrypt (`N=16384, r=8, p=1`, 64-byte key), `scrypt$salt$hash` format |
| Secret encryption | AES-256-GCM with a 12-byte IV; key derived from `ENCRYPTION_KEY` (prod-required) |
| Streaming | Server-Sent Events from the API and from the Next.js gateway; Drizzle persistence of request/usage rows |
| Payments | Razorpay (`/wallet/checkout`, `/wallet/verify`, webhook) and Stripe (webhook) |
| Tests | Vitest-style test files under `tests/` (13 files) |

## 4. Runtime topology

```
Browser
  ├─ Next.js app (apps/web)                     :3000/3100 locally
  │    ├─ /api/[...path] proxy  -> Fastify API  :4000 (2.5 s timeout, builtin fallback)
  │    ├─ /v1/[...path] gateway -> Fastify API or direct upstream providers (demo mode)
  │    └─ Server components / client pages
  └─ Direct API consumers -> Fastify API /v1/* with Bearer pro_sk_live_* keys
```

The Fastify server listens on `env.apiPort` (default 4000). After `listen()`, it runs `runMigrations()` and `seedDatabase(false)` in the background; requests can arrive before seeding completes.

## 5. Business model encoded in the code

- **Wallet billing in paise.** `wallet.balancePaise` is an integer; `walletTransactions` are immutable ledger entries; balance mutations use atomic SQL updates with reservations held during streaming.
- **Gmail-only registration.** `packages/shared/src/password.ts` exposes `isValidGmail`, which requires an address ending `@gmail.com`, no `+` alias, and a 6–30 character username.
- **Promotional free models.** Only `prorouter/deepseek-v4.1-flash` and `groq/qwen3.8-27b` (and their canonical aliases) are marked `isFree: true`; free access is time-boxed to a 48-hour launch promotion.
- **Tiered pricing.** `PRICING_TIER_SEEDS` in `packages/database/src/catalog-aliases.ts` defines lite/flash/standard/code/reason/expert per-1M-token prices (USD cents) with cached-input discounts.
- **Generated alias catalog.** `catalog-generator.ts` emits 500+ customer-facing "profiles" — many are synthetic display identities whose routing policy points at a small set of shared backends.
- **Persona layer.** `packages/shared/src/persona.ts` can inject guidelines that make a backend model present itself as a different model/family (see 08-security and 16-summary for the risk assessment).

## 6. Analysis scope and method

- Method: static inspection only. No builds, installs, migrations, network calls, or credential use.
- Files read: ~60 source/config files across `apps/api`, `apps/web` (routing layers), `packages/shared`, `packages/database`, `packages/routing`, `packages/providers`, plus `docs/` inventory and page globs.
- Known blind spots: large files truncated during reading (`admin.ts`, `chat.ts`, `pipeline.ts`, `seed.ts`), the unread remainder of `catalog-generator.ts`, and parts of `apps/web` chat/dashboard components. Subagent findings on the database package were never delivered and are treated as unverified.

## 7. Status taxonomy used in this documentation

Every feature is labelled with one of:

- **FULLY IMPLEMENTED** — code path is complete and wired end to end.
- **PARTIALLY IMPLEMENTED** — works for some paths/cases; gaps identified.
- **CONFIGURED BUT NOT CONNECTED** — config/UI/model exists but is not used by the live runtime path.
- **NOT IMPLEMENTED** — no functional code path found.
- **NEEDS VERIFICATION** — evidence is ambiguous, truncated, or contradicted by another signal.

## 8. Headline findings

1. **Persona impersonation is a first-class feature.** `resolveModelPersona` returns display identities and custom guidelines that instruct backend models to claim to be Kimi, Claude, or Gemini. This is not a UI-only label.
2. **The catalog is largely synthetic.** `generateProfiles()` builds hundreds of profiles across 12 categories; their routing policies converge on a handful of backends and ultimately `prorouter/deepseek-v4.1-flash`.
3. **The Next.js gateway has a demo mode that bypasses backend billing.** `apps/web/app/v1/[...path]/route.ts` can serve anonymous requests using server-side provider credentials when no API key/session is present.
4. **Dual-backend storage is declared but may be incomplete.** `store/types.ts` defines a `DataStore` contract; the SQL/Mongo implementations were not present in the `src` glob and must be verified.
5. **Exchange-rate values disagree across modules** (97 prod / 80 dev display / 88 market), which can misprice wallet top-ups and cost displays.

Details and file-level evidence are in the remaining documents.
