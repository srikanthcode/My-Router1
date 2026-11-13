# 13 — Performance and Scalability

## 1. Request-path cost profile

| Stage | Cost | Notes |
|---|---|---|
| Rate limiting | O(windows) in memory | Constant-ish; no I/O |
| Auth | 1 session/key lookup | Indexed by token/key hash |
| Model resolution | DB reads (model, pricing, capabilities, provider links) | Several queries per request; no request-level cache observed |
| Capability analysis | CPU over message text | Regex/heuristic; proportional to prompt size |
| Wallet reservation | 1 transaction | Atomic; may contend on the user wallet row |
| Routing | CPU over registry (small) | In-memory |
| Upstream call | Dominant latency | Provider TTFT/throughput |
| Finalize | Wallet debit + request insert + event publish | Writes on the hot path |

The dominant latency is upstream generation. Local overhead is dominated by database reads/writes around the call.

## 2. Database performance

- **PGlite (default):** single-process embedded Postgres. It serializes writers and cannot be shared across instances. Adequate for development/small deployments only.
- **External PostgreSQL:** supports pooling via the node-postgres driver; pool settings were not explicitly tuned in the reviewed code.
- **Indexes:** token hashes, key hashes, email, wallet idempotency keys, and user/time query paths are indexed, supporting the common lookups.
- **Denormalized usage on `requests`:** avoids joins for dashboards but makes `requests` a wide, hot table; retention/partitioning is not implemented.
- **Settings cache:** `getSetting`/`getNumber`/`getFlag` cache values for 15 seconds, reducing system_settings reads.
- **Mongo option:** `maxPoolSize: 10`, `minPoolSize: 0`, 15 s server selection timeout; lazy connect. Any request that arrives before the handshake completes fails fast after the timeout, and a `disabled` flag can latch until restart.

## 3. Streaming and connection scaling

- Each streaming completion holds an HTTP connection for the full generation duration. With Node's default socket limits this is usually fine, but serverless platforms cap concurrency and duration.
- The web gateway sets `maxDuration = 60`; longer generations may be cut off in serverless environments.
- Dashboard SSE keeps a connection per client and relies on an in-process `EventHub`. Scaling horizontally breaks fan-out: an event published on instance A is not visible to a client connected to instance B.
- No HTTP/2 or connection multiplexing configuration was found.

## 4. Concurrency and consistency hotspots

1. **Wallet row contention.** Every paid request updates the same user wallet row twice (reserve/settle). High per-user concurrency serializes on that row. Correctness is prioritized over throughput.
2. **Free quota counters.** Atomic upserts per user/model/bucket are correct but become a write hotspot under launch traffic.
3. **Rate limiter state.** In-memory sliding windows are fast but per-instance; restarts reset limits.
4. **Key pools in the web gateway.** Module-level rotation state is not safe across serverless invocations or multiple instances.
5. **In-process queue for free models.** Priority queue state is not durable; a restart loses queued requests.

## 5. Caching

| Cache | TTL | Scope |
|---|---|---|
| Settings (`getSetting`) | 15 s | Per process |
| Catalog/model data | None observed | Every request hits the DB |
| Provider health | In-memory + DB | Per process |
| Web proxy failure cooldown | 45 s | Per process |
| HTTP responses | No cache headers observed for API | n/a |

Model/catalog caching is an obvious optimization opportunity; public catalog endpoints currently recompute/query per request.

## 6. Timeouts and limits

| Setting | Value | Location |
|---|---|---|
| Web→API proxy timeout | 2.5 s | web proxy |
| Backend failure cooldown | 45 s | web proxy |
| Mongo server selection | 15 s | mongo client |
| SSE heartbeat | 15 s | EventHub route |
| Web gateway max duration | 60 s | `/v1` route |
| API key limit per user | 20 (configurable) | `MAX_API_KEYS` setting |
| Rate limits | 120/min IP, 60/min user/key | ratelimit.ts |

The 2.5 s proxy timeout is shorter than many LLM responses; streaming and slow catalog queries can hit it unless the proxy streams or the route bypasses it. This deserves verification per endpoint.

## 7. Scalability posture

| Dimension | Current posture |
|---|---|
| Vertical API scaling | Good; Node single process handles concurrent streams |
| Horizontal API scaling | Blocked by PGlite, in-memory rate limits/quotas/EventHub/queue |
| Horizontal web scaling | Static/SSR pages scale; demo gateway key pools do not |
| Database scaling | External Postgres possible; no read replicas/sharding |
| Upstream fan-out | Static registry, no adaptive concurrency control |
| Observability | Audit logs + request rows; no metrics/tracing exporter found |
| Load testing | No k6/artillery or benchmark suite found |

## 8. Recommended measurements (not performed)

Because this was a read-only analysis, no benchmarks were run. Before production scaling, measure:

- p50/p95/p99 time-to-first-token and total latency per provider/model.
- Requests/sec per instance at fixed error rate.
- Wallet update contention under N concurrent requests for one user.
- Catalog endpoint p95 with/without caching.
- SSE fan-out limits and memory growth of `EventHub` history.
- Mongo handshake failure rate and pool saturation.

## 9. Status

| Capability | Status |
|---|---|
| Efficient single-instance request path | FULLY IMPLEMENTED |
| Database indexing for hot lookups | FULLY IMPLEMENTED |
| Settings caching | FULLY IMPLEMENTED |
| Catalog caching | NOT IMPLEMENTED |
| Horizontal scalability | PARTIALLY IMPLEMENTED (needs Redis/queue/shared state) |
| Durable free queue | NOT IMPLEMENTED |
| Metrics/tracing | NOT IMPLEMENTED |
| Load/performance test suite | NOT IMPLEMENTED |
