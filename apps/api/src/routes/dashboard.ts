import type { FastifyInstance } from "fastify";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { apiKeys, freeUsage, getDb, models, notifications, providers, requestAttempts, requests } from "@pro/database";
import { ApiError, formatMoney } from "@pro/shared";
import { requireUser } from "../lib/auth.js";
import { peekFreeQuota } from "../lib/freequota.js";
import { getBalance } from "../lib/wallet.js";
import { queueSnapshot } from "../lib/queue.js";
import { plans, subscriptions, astraEntitlements, incidents, providerHealth } from "@pro/database";
import { and as and2, eq as eq2, gte as gte2 } from "drizzle-orm";

export async function dashboardRoutes(app: FastifyInstance) {
  // Overview for the dashboard home (§84)
  app.get("/dashboard/overview", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const balance = await getBalance(user.id);
    const [today] = await db.select({ n: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${requests.totalTokens}),0)::int`, cost: sql<number>`coalesce(sum(${requests.costPaise}),0)::bigint` }).from(requests).where(and(eq(requests.userId, user.id), gte(requests.createdAt, startOfDay)));
    const [monthStats] = await db.select({
      n: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${requests.totalTokens}),0)::int`,
      cost: sql<number>`coalesce(sum(${requests.costPaise}),0)::bigint`,
      avgLatencyMs: sql<number>`coalesce(avg(${requests.latencyMs}),0)::float`,
    }).from(requests).where(and(eq(requests.userId, user.id), gte(requests.createdAt, startOfMonth)));

    const [keys] = await db.select({ n: sql<number>`count(*)::int` }).from(apiKeys).where(and(eq(apiKeys.userId, user.id), sql`${apiKeys.revokedAt} IS NULL`));
    const subRows = await db.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq2(subscriptions.planId, plans.id)).where(eq2(subscriptions.userId, user.id));
    const plan = subRows.find((s) => s.plan)?.plan ?? null;
    const [freeToday] = await db.select({ n: sql<number>`coalesce(sum(count),0)::int` }).from(freeUsage).where(eq2(freeUsage.userId, user.id));
    const astraRows = await db.select().from(astraEntitlements).where(and2(eq2(astraEntitlements.userId, user.id), eq2(astraEntitlements.status, "active"), gte2(astraEntitlements.expiresAt, now)));
    const astra = astraRows[0] ?? null;

    const totalMonthRequests = monthStats?.n ?? 0;
    const modelUsageRows = await db.select({
      id: models.slug,
      requests: sql<number>`count(*)::int`,
      tokens: sql<number>`coalesce(sum(${requests.totalTokens}),0)::int`,
      costPaise: sql<number>`coalesce(sum(${requests.costPaise}),0)::bigint`,
    }).from(requests)
      .leftJoin(models, eq2(models.id, requests.modelId))
      .where(and(eq2(requests.userId, user.id), gte2(requests.createdAt, startOfMonth)))
      .groupBy(models.slug)
      .orderBy(desc(sql`count(*)`));

    const PALETTE = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16"];
    const modelsList = modelUsageRows
      .filter((r) => r.id)
      .map((r, idx) => ({
        id: r.id!,
        spend: Number(((Number(r.costPaise) / 8000)).toFixed(2)),
        requests: r.requests,
        tokens: r.tokens,
        sharePercent: totalMonthRequests > 0 ? Number(((r.requests / totalMonthRequests) * 100).toFixed(1)) : 0,
        color: PALETTE[idx % PALETTE.length],
      }));

    // Last 4 days series
    const daysToShow = 4;
    const since4Days = new Date(Date.now() - (daysToShow - 1) * 86400_000);
    const recentRows = await db.select({
      createdAt: requests.createdAt,
      model: models.slug,
      totalTokens: requests.totalTokens,
      costPaise: requests.costPaise,
    }).from(requests)
      .leftJoin(models, eq2(models.id, requests.modelId))
      .where(and(eq2(requests.userId, user.id), gte2(requests.createdAt, since4Days)));

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dailySeries: Array<{
      dateLabel: string;
      dateKey: string;
      totalRequests: number;
      totalTokens: number;
      totalSpend: number;
      breakdown: Record<string, { requests: number; tokens: number; spend: number }>;
    }> = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 86400_000);
      const yyyy = targetDate.getUTCFullYear();
      const mm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(targetDate.getUTCDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const dateLabel = `${monthNames[targetDate.getUTCMonth()]} ${targetDate.getUTCDate()}`;

      const dayRecords = recentRows.filter((r) => r.createdAt.toISOString().startsWith(dateKey));
      const breakdown: Record<string, { requests: number; tokens: number; spend: number }> = {};
      let dayReqs = 0;
      let dayTokens = 0;
      let daySpend = 0;

      for (const r of dayRecords) {
        dayReqs += 1;
        dayTokens += r.totalTokens || 0;
        const spend = (r.costPaise || 0) / 8000;
        daySpend += spend;
        const mKey = r.model || "unknown";
        if (!breakdown[mKey]) {
          breakdown[mKey] = { requests: 0, tokens: 0, spend: 0 };
        }
        breakdown[mKey].requests += 1;
        breakdown[mKey].tokens += r.totalTokens || 0;
        breakdown[mKey].spend += spend;
      }

      dailySeries.push({
        dateLabel,
        dateKey,
        totalRequests: dayReqs,
        totalTokens: dayTokens,
        totalSpend: Number(daySpend.toFixed(2)),
        breakdown,
      });
    }

    // Heatmap: past 365 days
    const sinceYear = new Date(Date.now() - 365 * 86400_000);
    const yearRows = await db.select({
      createdAt: requests.createdAt,
    }).from(requests).where(and(eq2(requests.userId, user.id), gte2(requests.createdAt, sinceYear)));

    const activeDaysMap: Record<string, number> = {};
    for (const r of yearRows) {
      const dateKey = r.createdAt.toISOString().slice(0, 10);
      activeDaysMap[dateKey] = (activeDaysMap[dateKey] || 0) + 1;
    }
    const activeDaysCount = Object.keys(activeDaysMap).length;
    const avgLatencySec = totalMonthRequests > 0 ? Number(((monthStats?.avgLatencyMs ?? 0) / 1000).toFixed(2)) : 0;

    return {
      balancePaise: balance,
      balanceFormatted: formatMoney(balance),
      today: { requests: today?.n ?? 0, tokens: today?.tokens ?? 0, costPaise: Number(today?.cost ?? 0) },
      month: { requests: totalMonthRequests, tokens: monthStats?.tokens ?? 0, costPaise: Number(monthStats?.cost ?? 0) },
      avgLatencySec,
      models: modelsList,
      dailySeries,
      activeDaysCount,
      activeDaysMap,
      activeKeys: keys?.n ?? 0,
      freeUsed: freeToday?.n ?? 0,
      plan: plan ? { slug: plan.slug, name: plan.name, freeRpm: plan.freeRpm, queuePriority: plan.queuePriority } : null,
      astra: astra ? { active: true, expiresAt: astra.expiresAt.toISOString(), daysLeft: Math.max(0, Math.ceil((astra.expiresAt.getTime() - now.getTime()) / 86400_000)) } : { active: false, expiresAt: null },
      queue: queueSnapshot(),
    };
  });

  // Time series for dashboard charts — real data only (§80)
  app.get("/dashboard/series", async (request) => {
    const user = await requireUser(request);
    const q = request.query as { days?: string };
    const days = Math.min(Math.max(Number(q.days ?? 7), 1), 90);
    const db = await getDb();
    const since = new Date(Date.now() - days * 86400_000);
    const rows = await db.select().from(requests).where(and(eq(requests.userId, user.id), gte(requests.createdAt, since)));
    const buckets = new Map<string, { date: string; requests: number; tokens: number; costPaise: number; errors: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 86400_000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, requests: 0, tokens: 0, costPaise: 0, errors: 0 });
    }
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10);
      const b = buckets.get(key);
      if (!b) continue;
      b.requests++;
      b.tokens += r.totalTokens;
      b.costPaise += r.costPaise;
      if (r.status === "error") b.errors++;
    }
    return { items: [...buckets.values()] };
  });

  // Activity / request log (§17)
  app.get("/dashboard/activity", async (request) => {
    const user = await requireUser(request);
    const q = request.query as { limit?: string; offset?: string; status?: string };
    const db = await getDb();
    const conditions = [eq(requests.userId, user.id)];
    if (q.status === "errors") conditions.push(eq(requests.status, "error"));
    if (q.status === "success") conditions.push(eq(requests.status, "success"));
    const rows = await db.select({ r: requests, m: models, p: providers }).from(requests)
      .leftJoin(models, eq2(models.id, requests.modelId))
      .leftJoin(providers, eq2(providers.id, requests.providerId))
      .where(and(...conditions))
      .orderBy(desc(requests.createdAt))
      .limit(Math.min(Number(q.limit ?? 25), 100))
      .offset(Number(q.offset ?? 0));
    const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(requests).where(and(...conditions));
    return {
      total: total?.n ?? 0,
      items: rows.map((x) => ({
        id: x.r.id, createdAt: x.r.createdAt.toISOString(), model: x.m?.slug ?? null, modelName: x.m?.name ?? null,
        provider: x.p?.slug ?? null, status: x.r.status, httpStatus: x.r.httpStatus, inputTokens: x.r.inputTokens,
        outputTokens: x.r.outputTokens, totalTokens: x.r.totalTokens, latencyMs: x.r.latencyMs, ttftMs: x.r.ttftMs,
        costPaise: x.r.costPaise, isFree: x.r.isFree, streaming: x.r.streaming, errorCode: x.r.errorCode,
        route: x.r.route, queueWaitMs: x.r.queueWaitMs,
      })),
    };
  });

  // Request inspector (§36)
  app.get("/dashboard/activity/:id", async (request) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const db = await getDb();
    const rows = await db.select({ r: requests, m: models, p: providers, k: apiKeys }).from(requests)
      .leftJoin(models, eq2(models.id, requests.modelId))
      .leftJoin(providers, eq2(providers.id, requests.providerId))
      .leftJoin(apiKeys, eq2(apiKeys.id, requests.apiKeyId))
      .where(eq2(requests.id, id));
    const row = rows[0];
    if (!row || row.r.userId !== user.id) throw new ApiError("not_found", "Request not found.");
    const attempts = await db.select().from(requestAttempts).where(eq2(requestAttempts.requestId, id)).orderBy(requestAttempts.attempt);
    return {
      request: {
        id: row.r.id, createdAt: row.r.createdAt.toISOString(), model: row.m?.slug ?? null, provider: row.p?.slug ?? null,
        status: row.r.status, httpStatus: row.r.httpStatus, route: row.r.route, latencyMs: row.r.latencyMs, ttftMs: row.r.ttftMs,
        queueWaitMs: row.r.queueWaitMs, inputTokens: row.r.inputTokens, outputTokens: row.r.outputTokens,
        totalTokens: row.r.totalTokens, costPaise: row.r.costPaise, streaming: row.r.streaming, isFree: row.r.isFree,
        errorCode: row.r.errorCode, errorMessage: row.r.errorMessage, apiKey: row.k ? { name: row.k.name, prefix: row.k.prefix } : null,
      },
      attempts: attempts.map((a, i) => ({ step: a.attempt, provider: null, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error, at: a.createdAt.toISOString() })),
      timeline: [
        { step: "Request received", at: row.r.createdAt.toISOString() },
        { step: "Authentication", ok: true },
        { step: "Model resolution", model: row.m?.slug ?? null },
        { step: "Provider selection", provider: row.p?.slug ?? null, route: row.r.route },
        ...(row.r.queueWaitMs ? [{ step: "Free queue wait", ms: row.r.queueWaitMs }] : []),
        ...(row.r.ttftMs ? [{ step: "First token", ms: row.r.ttftMs }] : []),
        { step: "Completion", status: row.r.status, ms: row.r.latencyMs },
        { step: "Billing", costPaise: row.r.costPaise },
      ],
    };
  });

  // Usage aggregates by model/provider
  app.get("/dashboard/usage", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const since = new Date(Date.now() - 30 * 86400_000);
    const byModel = await db.select({ model: models.slug, n: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${requests.totalTokens}),0)::int`, cost: sql<number>`coalesce(sum(${requests.costPaise}),0)::bigint` }).from(requests)
      .leftJoin(models, eq2(models.id, requests.modelId))
      .where(and(eq2(requests.userId, user.id), gte2(requests.createdAt, since)))
      .groupBy(models.slug).orderBy(desc(sql`count(*)`));
    const byProvider = await db.select({ provider: providers.slug, n: sql<number>`count(*)::int`, tokens: sql<number>`coalesce(sum(${requests.totalTokens}),0)::int` }).from(requests)
      .leftJoin(providers, eq2(providers.id, requests.providerId))
      .where(and(eq2(requests.userId, user.id), gte2(requests.createdAt, since)))
      .groupBy(providers.slug).orderBy(desc(sql`count(*)`));
    return { byModel: byModel.map((r) => ({ ...r, cost: Number(r.cost) })), byProvider };
  });

  // Notifications (§38)
  app.get("/notifications", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(30);
    return { items: rows.map((n) => ({ ...n, createdAt: n.createdAt.toISOString(), readAt: n.readAt?.toISOString() ?? null })) };
  });

  app.post("/notifications/read", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, user.id), sql`${notifications.readAt} IS NULL`));
    return { ok: true };
  });

  // Status page (§37)
  app.get("/status", async () => {
    const db = await getDb();
    const providerRows = await db.select().from(providers);
    const healthRows = await db.select().from(providerHealth).orderBy(desc(providerHealth.checkedAt)).limit(50);
    const incidentRows = await db.select().from(incidents).orderBy(desc(incidents.startedAt)).limit(20);
    const snapshot = queueSnapshot();
    const services = [
      { name: "API", operational: true },
      { name: "Chat completions", operational: true },
      { name: "Dashboard", operational: true },
      { name: "Billing", operational: true },
      { name: "Free model queue", operational: true },
    ];
    return {
      services: services.map((s) => ({ ...s, status: s.operational ? "operational" : "degraded" })),
      providers: providerRows.map((p) => {
        const h = healthRows.find((x) => x.providerId === p.id);
        const status = p.status === "active" ? "operational" : p.status === "degraded" ? "degraded" : p.status === "disabled" ? "major_outage" : "unknown";
        return { slug: p.slug, name: p.name, status, lastChecked: p.lastHealthAt?.toISOString() ?? null, latencyMs: h?.latencyMs ?? null, message: p.healthMessage };
      }),
      queue: snapshot,
      incidents: incidentRows.map((i) => ({ id: i.id, service: i.service, severity: i.severity, status: i.status, title: i.title, body: i.body, startedAt: i.startedAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null })),
    };
  });
}