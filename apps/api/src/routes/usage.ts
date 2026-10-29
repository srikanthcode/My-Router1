import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb, models, providers, requests, wallets } from "@pro/database";
import { ApiError } from "@pro/shared";
import { authenticateRequest } from "../lib/request-auth.js";

const usageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  model: z.string().min(1).optional(),
  status: z.enum(["success", "error", "rate_limited", "blocked", "queued"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function usageRoutes(app: FastifyInstance) {
  app.get("/v1/account/balance", async (request) => {
    const auth = await authenticateRequest(request);
    const db = await getDb();
    const rows = await db.select().from(wallets).where(eq(wallets.userId, auth.user.id));
    const wallet = rows[0];
    const balancePaise = wallet?.balancePaise ?? 0;
    return {
      object: "balance",
      currency: "INR",
      balance_paise: balancePaise,
      balance: balancePaise / 100,
      updated_at: wallet?.updatedAt.toISOString() ?? null,
    };
  });

  app.get("/v1/usage", async (request) => {
    const auth = await authenticateRequest(request);
    const q = usageQuery.parse(request.query);
    const db = await getDb();

    const conditions = [eq(requests.userId, auth.user.id)];
    if (q.model) conditions.push(eq(models.slug, q.model));
    if (q.status) conditions.push(eq(requests.status, q.status));
    if (q.from) conditions.push(gte(requests.createdAt, new Date(q.from)));
    if (q.to) conditions.push(lte(requests.createdAt, new Date(q.to)));
    const where = and(...conditions);

    const totalRows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(requests)
      .leftJoin(models, eq(models.id, requests.modelId))
      .where(where);

    const rows = await db
      .select({
        request: requests,
        modelSlug: models.slug,
        providerSlug: providers.slug,
      })
      .from(requests)
      .leftJoin(models, eq(models.id, requests.modelId))
      .leftJoin(providers, eq(providers.id, requests.providerId))
      .where(where)
      .orderBy(desc(requests.createdAt))
      .limit(q.limit)
      .offset(q.offset);

    return {
      object: "list",
      data: rows.map(toUsageRecord),
      total: totalRows[0]?.n ?? 0,
      limit: q.limit,
      offset: q.offset,
    };
  });

  app.get("/v1/usage/:request_id", async (request) => {
    const auth = await authenticateRequest(request);
    const params = z.object({ request_id: z.string().min(1) }).parse(request.params);
    const db = await getDb();
    const rows = await db
      .select({ request: requests, modelSlug: models.slug, providerSlug: providers.slug })
      .from(requests)
      .leftJoin(models, eq(models.id, requests.modelId))
      .leftJoin(providers, eq(providers.id, requests.providerId))
      .where(and(eq(requests.id, params.request_id), eq(requests.userId, auth.user.id)));
    const row = rows[0];
    if (!row) throw new ApiError("not_found", "Usage record not found.");
    return { ...toUsageRecord(row), route: row.request.route, queue_wait_ms: row.request.queueWaitMs };
  });
}

function toUsageRecord(row: {
  request: typeof requests.$inferSelect;
  modelSlug: string | null;
  providerSlug: string | null;
}) {
  const r = row.request;
  return {
    id: r.id,
    object: "usage.record",
    created: r.createdAt.toISOString(),
    model: row.modelSlug,
    provider: row.providerSlug,
    status: r.status,
    http_status: r.httpStatus,
    usage: {
      prompt_tokens: r.inputTokens,
      completion_tokens: r.outputTokens,
      total_tokens: r.totalTokens,
    },
    cost_paise: r.costPaise,
    is_free: r.isFree,
    streaming: r.streaming,
    usage_source: r.usageSource,
    latency_ms: r.latencyMs,
    ttft_ms: r.ttftMs,
    error: r.errorCode ? { code: r.errorCode, message: r.errorMessage } : null,
  };
}
