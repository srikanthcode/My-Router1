# 04 — API Reference

All paths below are registered on the Fastify server unless explicitly marked as Next.js routes. Authentication is one of:

- **Public** — no auth.
- **Session** — `uno_session` httpOnly cookie (requires logged-in user).
- **API key** — `Authorization: Bearer pro_sk_live_...` (hashed lookup, revocation/expiry/spend limits enforced).
- **Admin** — session whose role is `admin` (enforced by `requireAdmin`).

Errors use an OpenAI-style envelope: `{ "error": { "message": "...", "type": "...", "code": "..." } }`. Validation failures return 400; auth failures 401; forbidden 403; missing resources 404; rate limits 429 with `Retry-After`; upstream failures 502/503.

## 1. Authentication (`routes/auth.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create account (Gmail-only + strong password); sets session cookie |
| POST | `/auth/login` | Public | Password login; sets session cookie |
| POST | `/auth/logout` | Session | Revoke current session and clear cookie |
| GET | `/auth/me` | Session | Current user profile |
| PATCH | `/auth/profile` | Session | Update display name/profile fields |
| POST | `/auth/password` | Session | Change password (requires current password) |

Registration body (Zod-validated): email, password, optional name. Login: email + password. Sessions are opaque 32-byte tokens, SHA-256-hashed at rest, with expiry.

## 2. API keys (`routes/keys.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/keys` | Session | List caller's keys (DTO: id, name, prefix, timestamps, request count, spend, limits) |
| POST | `/keys` | Session | Create key; responses include the one-time `secret` |
| POST | `/keys/:id/rotate` | Session | Replace key material, returns new secret |
| DELETE | `/keys/:id` | Session | Revoke key (sets `revokedAt`) |

Create body: `{ name (1–64), expiresInDays? 1–3650, spendingLimitPaise? ≥0, allowedModels? string[] ≤50 }`. The number of keys per user is capped by setting `MAX_API_KEYS` (default 20). Secrets use the `pro_sk_live_` prefix; only the prefix and hash are stored.

## 3. Catalog (`routes/catalog.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/catalog/profiles` and `/api/catalog/profiles` | Public | Generated frontend profiles list |
| GET | `/models` and `/api/models` | Public | Model list (filters/pagination accepted) |
| GET | `/api/models/providers`, `/providers`, `/api/providers` | Public | Provider list |
| GET | `/api/models/categories`, `/categories` | Public | Category list |
| GET | `/api/models/pricing`, `/pricing/models` | Public | Pricing table |
| GET | `/api/models/:modelId/pricing`, `/models/:modelId/pricing` | Public | Per-model pricing detail |
| GET | `/models/:slug`, `/api/models/:slug` | Public | Model detail |
| GET | `/providers/:slug`, `/api/providers/:slug` | Public | Provider detail |

Catalog endpoints merge database rows with generated profiles. Public access makes model discovery possible without an account.

## 4. Chat completions (`routes/chat.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/models` | API key or session | OpenAI-style model list |
| GET | `/v1/models/:id` | API key or session | Model detail |
| POST | `/v1/chat/completions` | API key or session | Streaming/non-streaming chat completion |

Request fields (verified usage): `model`, `messages`, `stream`, `temperature`, `max_tokens`, `tools`, `tool_choice`, `response_format`, plus pass-through options. The handler resolves aliases, runs the routing pipeline, charges the wallet, persists a request/usage record, and emits dashboard events. OpenAI-compatible response shape is preserved, including `choices`, `usage`, and SSE `data:` chunks terminated by `[DONE]`.

## 5. Usage and balance (`routes/usage.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/account/balance` | API key or session | Wallet balance and currency metadata |
| GET | `/v1/usage` | API key or session | Usage list with pagination/filters |
| GET | `/v1/usage/:request_id` | API key or session | Single request detail |

`UsageSource` values: `upstream` (provider-reported usage), `estimated` (local tokenizer/estimate), `none` (no usage available).

## 6. Wallet and payments (`routes/wallet.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/wallet` | Session | Balance, reserved amount, totals |
| GET | `/wallet/packages` | Public | Purchasable credit packages |
| POST | `/wallet/checkout` | Session | Create Razorpay order for a package |
| POST | `/wallet/verify` | Session | Verify payment signature and credit wallet |
| GET | `/wallet/payments/:id` | Session | Payment status |
| GET | `/payments` | Session | Payment history |
| POST | `/payments/razorpay/webhook` | Signature | Razorpay webhook (idempotent) |
| POST | `/wallet/webhook` | Signature | Legacy/generic webhook alias |

Checkout returns an order id/amount/currency (INR). Verification checks Razorpay signature, then performs an atomic wallet credit plus ledger entry guarded by an idempotency key.

## 7. Promotions (`routes/promotions.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/promotions/astra` | Session | Astra campaign status |
| POST | `/promotions/astra/redeem` | Session | Redeem Astra code |
| GET | `/promotions/astra/referral` | Session | Referral code/status |
| GET | `/promotions/launch-48h`, `/promotions/status`, `/api/promotions/status` | Public | 48-hour launch promo status |
| POST | `/promotions/launch-48h/activate`, `/promotions/activate`, `/api/promotions/activate` | Session | Activate promo entitlement |

## 8. Dashboard and events (`routes/dashboard.ts`, `routes/events.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/dashboard/overview` | Session | Aggregate usage/spend stats |
| GET | `/dashboard/series` | Session | Time-series data |
| GET | `/dashboard/activity` | Session | Recent requests |
| GET | `/dashboard/activity/:id` | Session | Request detail |
| GET | `/dashboard/usage` | Session | Usage summary |
| GET | `/notifications` | Session | Notifications |
| POST | `/notifications/read` | Session | Mark notifications read |
| GET | `/status` | Public | Service/status summary |
| GET | `/dashboard/events` and `/v1/dashboard/events` | Session | SSE stream |

SSE behavior: 15-second heartbeats, 100-event in-memory replay buffer, `Last-Event-ID` support, event ids `evt_<timestamp>_<seq>`.

## 9. Plans (`routes/plans.ts`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/plans` | Public | Available plans, limits, queue priorities |

## 10. Admin (`routes/admin.ts`)

Admin routes are grouped below; `/api/admin/...` aliases exist for the pricing endpoints.

**Overview / observability**
- `GET /admin/overview`, `/admin/requests`, `/admin/model-health`, `/admin/routing-metrics`, `/admin/models-catalog`, `/admin/audit`

**Providers / credentials**
- `GET /admin/providers`, `POST /admin/providers`, `PATCH /admin/providers/:id`
- `PUT /admin/providers/:id/credential`
- `POST /admin/providers/:id/check`

**Models / pricing**
- `GET/POST /admin/models`, `PATCH /admin/models/:id`
- `GET/POST /admin/pricing-tiers`, `PATCH /admin/pricing-tiers/:id`
- `GET /admin/pricing` (+ `/api/admin/pricing`)
- `PATCH /admin/pricing/:modelId` (+ `/api/admin/pricing/:modelId`)
- `POST /admin/pricing/bulk-update` (+ `/api/admin/...`)
- `POST /admin/pricing/sync` (+ `/api/admin/...`)
- `GET /admin/pricing/audit-logs` (+ `/api/admin/...`)

**Users / billing**
- `GET /admin/users`, `PATCH /admin/users/:id`, `POST /admin/users/:id/wallet`
- `GET /admin/plans`, `PATCH /admin/plans/:id`
- `GET /admin/packages`, `PATCH /admin/packages/:id`
- `GET /api/billing/usage`, `GET /api/billing/transactions`

**Promotions / settings**
- `GET/PATCH /admin/promotions/astra`, `POST /admin/promotions/astra/codes`, `PATCH /admin/promotions/astra/codes/:id`
- `GET /admin/settings`, `PATCH /admin/settings/:key`, `PATCH /admin/flags/:key`

Admin route registration is split across two blocks in `admin.ts`, which is why some endpoints exist only with an `/api` prefix.

## 11. Next.js routes

| Route | Location | Behavior |
|---|---|---|
| `/api/[...path]` | `apps/web/app/api/[...path]/route.ts` | Proxy to `API_BASE_URL` with 2.5 s timeout; on failure serves `handleFallback`; 45 s cooldown after backend failure |
| `/v1/[...path]` | `apps/web/app/v1/[...path]/route.ts` | OpenAI-compatible gateway; proxies when an API key/session exists, otherwise runs local/demo mode with server-side provider credentials |

The exact sub-path coverage of the 3,350-line `/v1` gateway (beyond model listing and chat completions) is **NEEDS VERIFICATION**; the file was inspected via a subagent report and line-level anchors, not read end to end in this session.

## 12. Endpoint count

Approximately **95–100 route registrations** across 11 Fastify route modules plus the two Next.js catch-all routes. This count includes duplicated alias paths (`/api/...` variants) and is therefore a surface-area metric, not a unique-operation count.
