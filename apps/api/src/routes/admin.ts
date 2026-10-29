import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { astraCampaigns, astraEntitlements, auditLogs, creditPackages, featureFlags, giftCodeRedemptions, giftCodes, getDb, modelCapabilities, modelLimits, modelPricing, modelProviders, models, notifications, paymentWebhooks, payments, plans, pricingTiers, providerCredentials, providers, providerHealth, requests, systemSettings, users, wallets, walletTransactions, requestAttempts } from "@pro/database";
import { ApiError, encryptSecret, formatMoney, randomCode } from "@pro/shared";
import { requireRole } from "../lib/auth.js";
import { creditWallet } from "../lib/wallet.js";
import { getAdapter } from "../lib/pipeline.js";
import { getNumber, loadSettings } from "../lib/settings.js";

/** Run a live health check against a provider and persist the result (§43). */
export async function runHealthCheck(providerId: string) {
  const db = await getDb();
  const rows = await db.select().from(providers).where(eq(providers.id, providerId));
  const provider = rows[0];
  if (!provider) throw new ApiError("not_found", "Provider not found.");
  const creds = await db.select().from(providerCredentials).where(eq(providerCredentials.providerId, providerId));
  const candidate = {
    linkId: "", providerId: provider.id, providerSlug: provider.slug, providerName: provider.name,
    upstreamModelId: "", linkPriority: 0, providerPriority: provider.priority,
    providerStatus: provider.status, linkStatus: "active" as const, timeoutMs: provider.timeoutMs,
    retryCount: provider.retryCount, health: null, inputPerMillion: 0, outputPerMillion: 0, isFree: false,
  };
  const adapter = await getAdapter(candidate);
  const result = await adapter.healthCheck();
  const status = result.available ? "active" : creds.length > 0 ? "degraded" : "unknown";
  await db.insert(providerHealth).values({ providerId, available: result.available, latencyMs: result.latencyMs, successRateBp: result.available ? 10000 : 0, errorRateBp: result.available ? 0 : 10000, message: result.message ?? null });
  await db.update(providers).set({ status, healthMessage: result.message ?? null, lastHealthAt: new Date(), updatedAt: new Date() }).where(eq(providers.id, providerId));
  return { available: result.available, latencyMs: result.latencyMs, message: result.message ?? null, status };
}

const providerSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  endpointUrl: z.string().url(),
  adapterType: z.enum(["openai", "anthropic", "openrouter", "groq", "mistral", "ollama", "custom_openai", "freemodels"]).default("openai"),
  region: z.string().max(32).default("global"),
  priority: z.number().int().min(1).max(1000).default(100),
  timeoutMs: z.number().int().min(1000).max(300000).default(60000),
  retryCount: z.number().int().min(0).max(10).default(2),
  description: z.string().max(500).default(""),
  capabilities: z.array(z.string()).default([]),
  retentionPolicy: z.string().max(64).default("zero_retention"),
});

const modelSchema = z.object({
  slug: z.string().min(1).max(96).regex(/^[a-z0-9.\-]+$/),
  name: z.string().min(1).max(96),
  description: z.string().max(1000).default(""),
  status: z.enum(["active", "coming_soon", "disabled", "archived"]).default("active"),
  isFree: z.boolean().default(false),
  contextWindow: z.number().int().min(1000).max(10_000_000).default(128000),
  maxOutputTokens: z.number().int().min(100).max(2_000_000).default(8192),
  rank: z.number().int().min(0).max(10000).default(100),
  pricingTier: z.string().min(1).max(48).regex(/^[a-z0-9-]+$/).nullable().optional(),
  inputPerMillion: z.number().int().min(0).default(0),
  outputPerMillion: z.number().int().min(0).default(0),
  reasoning: z.boolean().default(false),
  toolCalls: z.boolean().default(false),
  vision: z.boolean().default(false),
  structuredOutputs: z.boolean().default(false),
  links: z.array(z.object({ providerSlug: z.string(), providerModelId: z.string().min(1), priority: z.number().int().default(100) })).default([]),
});

const pricingTierSchema = z.object({
  slug: z.string().min(1).max(48).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(64),
  description: z.string().max(500).default(""),
  inputUsdCentsPerMillion: z.number().int().min(0).max(10_000_000),
  outputUsdCentsPerMillion: z.number().int().min(0).max(10_000_000),
  cachedInputUsdCentsPerMillion: z.number().int().min(0).max(10_000_000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).default(100),
  active: z.boolean().default(true),
});

const pricingTierPatchSchema = z.object({
  slug: z.string().min(1).max(48).regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(500).optional(),
  inputUsdCentsPerMillion: z.number().int().min(0).max(10_000_000).optional(),
  outputUsdCentsPerMillion: z.number().int().min(0).max(10_000_000).optional(),
  cachedInputUsdCentsPerMillion: z.number().int().min(0).max(10_000_000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  active: z.boolean().optional(),
});

async function assertPricingTier(slug: string) {
  const db = await getDb();
  const rows = await db.select({ id: pricingTiers.id }).from(pricingTiers).where(eq(pricingTiers.slug, slug));
  if (!rows[0]) throw new ApiError("invalid_request", `Unknown pricing tier '${slug}'.`);
}

export async function adminRoutes(app: FastifyInstance) {
  // ── Overview / analytics (§56) ─────────────────────────────────────
  app.get("/admin/overview", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    const since = new Date(Date.now() - 30 * 86400_000);
    const [userCount] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
    const [reqCount] = await db.select({ n: sql<number>`count(*)::int` }).from(requests).where(gte(requests.createdAt, since));
    const revenue = await db.select({ total: sql<number>`coalesce(sum(${payments.amountPaise}),0)::bigint` }).from(payments).where(eq(payments.status, "captured"));
    const spend = await db.select({ total: sql<number>`coalesce(sum(-${walletTransactions.amountPaise}),0)::bigint` }).from(walletTransactions).where(eq(walletTransactions.type, "usage"));
    const balance = await db.select({ total: sql<number>`coalesce(sum(${wallets.balancePaise}),0)::bigint` }).from(wallets);
    const [redemptions] = await db.select({ n: sql<number>`count(*)::int` }).from(giftCodeRedemptions);
    const [ents] = await db.select({ n: sql<number>`count(*)::int` }).from(astraEntitlements).where(gte(astraEntitlements.expiresAt, new Date()));
    const [freeReqs] = await db.select({ n: sql<number>`count(*)::int` }).from(requests).where(and(gte(requests.createdAt, since), eq(requests.isFree, true)));
    return {
      users: userCount?.n ?? 0,
      requests30d: reqCount?.n ?? 0,
      freeRequests30d: freeReqs?.n ?? 0,
      revenuePaise: Number(revenue[0]?.total ?? 0),
      revenueFormatted: formatMoney(Number(revenue[0]?.total ?? 0)),
      creditsConsumedPaise: Number(spend[0]?.total ?? 0),
      walletBalancePaise: Number(balance[0]?.total ?? 0),
      astraRedemptions: redemptions?.n ?? 0,
      activeAstraUsers: ents?.n ?? 0,
    };
  });

  app.get("/admin/requests", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const q = request.query as { limit?: string };
    const db = await getDb();
    const rows = await db.select({ r: requests, u: email(users), m: slug(models), p: slug(providers) }).from(requests)
      .leftJoin(users, eq(users.id, requests.userId))
      .leftJoin(models, eq(models.id, requests.modelId))
      .leftJoin(providers, eq(providers.id, requests.providerId))
      .orderBy(desc(requests.createdAt)).limit(Math.min(Number(q.limit ?? 50), 200));
    return { items: rows.map((x) => ({ id: x.r.id, createdAt: x.r.createdAt.toISOString(), user: x.u, model: x.m, provider: x.p, status: x.r.status, httpStatus: x.r.httpStatus, latencyMs: x.r.latencyMs, costPaise: x.r.costPaise, tokens: x.r.totalTokens, errorCode: x.r.errorCode })) };
  });

  // ── Providers (§42) ────────────────────────────────────────────────
  app.get("/admin/providers", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    const rows = await db.select().from(providers).orderBy(providers.priority);
    const creds = await db.select().from(providerCredentials);
    return { items: rows.map((p) => ({ ...p, hasCredential: creds.some((c) => c.providerId === p.id), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() })) };
  });

  app.post("/admin/providers", async (request, reply) => {
    const admin = await requireRole(request, ["admin"]);
    const body = providerSchema.parse(request.body);
    const db = await getDb();
    const rows = await db.insert(providers).values(body).returning();
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "provider.create", targetType: "provider", targetId: rows[0].id, metadata: { slug: body.slug } });
    return reply.status(201).send({ provider: rows[0] });
  });

  app.patch("/admin/providers/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = providerSchema.partial().partial().parse(request.body);
    const db = await getDb();
    const rows = await db.update(providers).set({ ...body, updatedAt: new Date() }).where(eq(providers.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Provider not found.");
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "provider.update", targetType: "provider", targetId: id, metadata: body as Record<string, unknown> });
    return { provider: rows[0] };
  });

  // Store an encrypted credential — value never returned again (§42)
  app.put("/admin/providers/:id/credential", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = z.object({ apiKey: z.string().min(1).max(512) }).parse(request.body);
    const db = await getDb();
    const prov = await db.select().from(providers).where(eq(providers.id, id));
    if (!prov[0]) throw new ApiError("not_found", "Provider not found.");
    const enc = encryptSecret(body.apiKey);
    await db.insert(providerCredentials).values({ providerId: id, keyName: "default", ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true })
      .onConflictDoUpdate({ target: [providerCredentials.providerId, providerCredentials.keyName], set: { ciphertext: enc.ciphertext, iv: enc.iv, authTag: enc.authTag, active: true } });
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "provider.credential_set", targetType: "provider", targetId: id });
    return { ok: true, message: "Credential stored encrypted." };
  });

  app.post("/admin/providers/:id/check", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const { id } = request.params as { id: string };
    return runHealthCheck(id);
  });

  // ── Models (§41) ───────────────────────────────────────────────────
  app.get("/admin/models", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    const rows = await db
      .select({ m: models, p: modelPricing, t: pricingTiers })
      .from(models)
      .leftJoin(modelPricing, eq(modelPricing.modelId, models.id))
      .leftJoin(pricingTiers, eq(pricingTiers.slug, models.pricingTier))
      .orderBy(models.rank);
    return { items: rows.map((r) => ({ ...r.m, pricing: r.p, tier: r.t })) };
  });

  app.post("/admin/models", async (request, reply) => {
    const admin = await requireRole(request, ["admin"]);
    const body = modelSchema.parse(request.body);
    const db = await getDb();
    const exists = await db.select({ id: models.id }).from(models).where(eq(models.slug, body.slug));
    if (exists[0]) throw new ApiError("invalid_request", "A model with this slug already exists.");
    const pricingTier = body.pricingTier ?? null;
    if (pricingTier) await assertPricingTier(pricingTier);
    const [model] = await db.insert(models).values({ slug: body.slug, name: body.name, description: body.description, status: body.status, isFree: body.isFree, contextWindow: body.contextWindow, maxOutputTokens: body.maxOutputTokens, rank: body.rank, pricingTier, type: "chat" }).returning();
    if (!pricingTier) {
      await db.insert(modelPricing).values({ modelId: model!.id, inputPerMillion: body.inputPerMillion, outputPerMillion: body.outputPerMillion, currency: "INR" });
    }
    await db.insert(modelCapabilities).values({ modelId: model!.id, reasoning: body.reasoning, toolCalls: body.toolCalls, vision: body.vision, structuredOutputs: body.structuredOutputs, streaming: true, jsonMode: true });
    if (body.isFree) await db.insert(modelLimits).values({ modelId: model!.id, perMinute: 1, perHour: 30, perDay: 200, concurrency: 1, queuePriority: 5 });
    for (const link of body.links) {
      const prov = (await db.select().from(providers).where(eq(providers.slug, link.providerSlug)))[0];
      if (!prov) continue;
      await db.insert(modelProviders).values({ modelId: model!.id, providerId: prov.id, providerModelId: link.providerModelId, priority: link.priority, status: "active" }).onConflictDoNothing();
    }
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "model.create", targetType: "model", targetId: model!.id, metadata: { slug: body.slug } });
    return reply.status(201).send({ model });
  });

  app.patch("/admin/models/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = z.object({
      name: z.string().optional(), description: z.string().optional(), status: z.enum(["active", "coming_soon", "disabled", "archived"]).optional(),
      isFree: z.boolean().optional(), rank: z.number().int().optional(), contextWindow: z.number().int().optional(),
      pricingTier: z.string().min(1).max(48).regex(/^[a-z0-9-]+$/).nullable().optional(),
      inputPerMillion: z.number().int().min(0).optional(), outputPerMillion: z.number().int().min(0).optional(),
    }).parse(request.body);
    const db = await getDb();
    const { inputPerMillion, outputPerMillion, pricingTier, ...modelFields } = body;
    if (pricingTier) await assertPricingTier(pricingTier);
    const updated = await db.update(models).set({ ...modelFields, ...(pricingTier !== undefined && { pricingTier }), updatedAt: new Date() }).where(eq(models.id, id)).returning();
    if (!updated[0]) throw new ApiError("not_found", "Model not found.");
    if (inputPerMillion !== undefined || outputPerMillion !== undefined) {
      await db.update(modelPricing).set({ ...(inputPerMillion !== undefined && { inputPerMillion }), ...(outputPerMillion !== undefined && { outputPerMillion }) }).where(eq(modelPricing.modelId, id));
    }
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "model.update", targetType: "model", targetId: id, metadata: body as Record<string, unknown> });
    return { model: updated[0] };
  });

  // ── Pricing tiers ──────────────────────────────────────────────────
  app.get("/admin/pricing-tiers", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    const items = await db.select().from(pricingTiers).orderBy(pricingTiers.sortOrder);
    const usdToInrRate = await getNumber("USD_TO_INR_RATE", 97);
    return { items, usdToInrRate };
  });

  app.post("/admin/pricing-tiers", async (request, reply) => {
    const admin = await requireRole(request, ["admin"]);
    const body = pricingTierSchema.parse(request.body);
    const db = await getDb();
    const exists = await db.select({ id: pricingTiers.id }).from(pricingTiers).where(eq(pricingTiers.slug, body.slug));
    if (exists[0]) throw new ApiError("invalid_request", "A pricing tier with this slug already exists.");
    const [tier] = await db.insert(pricingTiers).values(body).returning();
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "pricing_tier.create", targetType: "pricing_tier", targetId: tier!.id, metadata: { slug: body.slug } });
    return reply.status(201).send({ tier });
  });

  app.patch("/admin/pricing-tiers/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = pricingTierPatchSchema.parse(request.body);
    const db = await getDb();
    const rows = await db.update(pricingTiers).set({ ...body, updatedAt: new Date() }).where(eq(pricingTiers.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Pricing tier not found.");
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "pricing_tier.update", targetType: "pricing_tier", targetId: id, metadata: body as Record<string, unknown> });
    return { tier: rows[0] };
  });

  // ── Users (§3) ─────────────────────────────────────────────────────
  app.get("/admin/users", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const q = request.query as { q?: string; limit?: string };
    const db = await getDb();
    let rows;
    if (q.q) {
      const pattern = `%${q.q.toLowerCase()}%`;
      rows = await db.select().from(users).where(sql`lower(${users.email}) LIKE ${pattern}`).orderBy(desc(users.createdAt)).limit(Math.min(Number(q.limit ?? 50), 200));
    } else {
      rows = await db.select().from(users).orderBy(desc(users.createdAt)).limit(Math.min(Number(q.limit ?? 50), 200));
    }
    return { items: rows.map((u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt.toISOString() })) };
  });

  app.patch("/admin/users/:id", async (request) => {
    const admin = await requireRole(request, ["admin", "support"]);
    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(["active", "suspended", "pending"]).optional(), role: z.enum(["user", "admin", "support"]).optional() }).parse(request.body);
    if (body.role && admin.role !== "admin") throw new ApiError("forbidden", "Only admins can change roles.");
    if (body.role && id === admin.id) throw new ApiError("invalid_request", "You cannot change your own role.");
    const db = await getDb();
    const rows = await db.update(users).set({ ...body, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "User not found.");
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "user.update", targetType: "user", targetId: id, metadata: body as Record<string, unknown> });
    return { user: { id: rows[0].id, email: rows[0].email, status: rows[0].status, role: rows[0].role } };
  });

  // Manual wallet adjustment (§18) — idempotent via creditWallet
  app.post("/admin/users/:id/wallet", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = z.object({ amountPaise: z.number().int().min(-1_000_000_000).max(1_000_000_000).refine((n) => n !== 0, "Amount cannot be zero"), reason: z.string().min(3).max(200) }).parse(request.body);
    const db = await getDb();
    const target = await db.select().from(users).where(eq(users.id, id));
    if (!target[0]) throw new ApiError("not_found", "User not found.");
    if (body.amountPaise > 0) {
      await creditWallet({ userId: id, amountPaise: body.amountPaise, type: "adjustment", reference: `admin:${admin.id}`, idempotencyKey: `adj:${admin.id}:${Date.now()}`, metadata: { reason: body.reason } });
    } else if (body.amountPaise < 0) {
      await db.insert(walletTransactions).values({ userId: id, type: "adjustment", amountPaise: body.amountPaise, balanceAfterPaise: -1, reference: `admin:${admin.id}`, metadata: { reason: body.reason } });
      await db.update(wallets).set({ balancePaise: sql`GREATEST(${wallets.balancePaise} + ${body.amountPaise}, 0)`, updatedAt: new Date() }).where(eq(wallets.userId, id));
    }
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "wallet.adjust", targetType: "user", targetId: id, metadata: { amountPaise: body.amountPaise, reason: body.reason } });
    const w = await db.select().from(wallets).where(eq(wallets.userId, id));
    return { balancePaise: w[0]?.balancePaise ?? 0 };
  });

  // ── Astra campaign & codes (§27) ───────────────────────────────────
  app.get("/admin/promotions/astra", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    const campaign = (await db.select().from(astraCampaigns).orderBy(desc(astraCampaigns.createdAt)))[0];
    if (!campaign) return { campaign: null, stats: null, codes: [] };
    const [codeCount] = await db.select({ n: sql<number>`count(*)::int` }).from(giftCodes).where(eq(giftCodes.campaignId, campaign.id));
    const [redCount] = await db.select({ n: sql<number>`count(*)::int` }).from(giftCodeRedemptions).where(eq(giftCodeRedemptions.campaignId, campaign.id));
    const [activeUsers] = await db.select({ n: sql<number>`count(*)::int` }).from(astraEntitlements).where(and(eq(astraEntitlements.campaignId, campaign.id), eq(astraEntitlements.status, "active"), gte(astraEntitlements.expiresAt, new Date())));
    const codes = await db.select().from(giftCodes).where(eq(giftCodes.campaignId, campaign.id)).orderBy(desc(giftCodes.createdAt)).limit(200);
    return {
      campaign,
      stats: { totalCodes: codeCount?.n ?? 0, totalRedemptions: redCount?.n ?? 0, activeAstraUsers: activeUsers?.n ?? 0, conversions: codeCount?.n ? Math.round(((redCount?.n ?? 0) / codeCount.n) * 100) : 0 },
      codes: codes.map((c) => ({ id: c.id, code: c.code, status: c.status, redemptions: c.redemptionCount, maxRedemptions: c.maxRedemptions, ownerUserId: c.ownerUserId, createdAt: c.createdAt.toISOString() })),
    };
  });

  app.patch("/admin/promotions/astra", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const body = z.object({
      active: z.boolean().optional(), originalPricePaise: z.number().int().min(0).optional(), discountPercent: z.number().int().min(0).max(100).optional(),
      promoPricePaise: z.number().int().min(0).optional(), trialDays: z.number().int().min(1).max(365).optional(),
      endsAt: z.string().datetime().nullable().optional(), allowMultiRedeem: z.boolean().optional(), maxRedemptionsPerCode: z.number().int().min(1).nullable().optional(),
    }).parse(request.body);
    const db = await getDb();
    const campaign = (await db.select().from(astraCampaigns).orderBy(desc(astraCampaigns.createdAt)))[0];
    if (!campaign) throw new ApiError("not_found", "No campaign configured.");
    const rows = await db.update(astraCampaigns).set({ ...body, endsAt: body.endsAt === null ? null : body.endsAt ? new Date(body.endsAt) : undefined, updatedAt: new Date() }).where(eq(astraCampaigns.id, campaign.id)).returning();
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "campaign.update", targetType: "astra_campaign", targetId: campaign.id, metadata: body as Record<string, unknown> });
    await loadSettings(true);
    return { campaign: rows[0] };
  });

  app.post("/admin/promotions/astra/codes", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const body = z.object({ count: z.number().int().min(1).max(500), ownerUserId: z.string().uuid().nullable().optional(), maxRedemptions: z.number().int().min(1).nullable().optional() }).parse(request.body);
    const db = await getDb();
    const campaign = (await db.select().from(astraCampaigns).orderBy(desc(astraCampaigns.createdAt)))[0];
    if (!campaign) throw new ApiError("not_found", "No campaign configured.");
    const created: string[] = [];
    for (let i = 0; i < body.count; i++) {
      let code = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        code = `PRO-${randomCode(6)}`;
        const clash = await db.select({ id: giftCodes.id }).from(giftCodes).where(eq(giftCodes.code, code));
        if (!clash[0]) break;
      }
      await db.insert(giftCodes).values({ campaignId: campaign.id, code, ownerUserId: body.ownerUserId ?? null, maxRedemptions: body.maxRedemptions ?? null, status: "active" });
      created.push(code);
    }
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "codes.generate", targetType: "astra_campaign", targetId: campaign.id, metadata: { count: body.count } });
    return { created, count: created.length };
  });

  app.patch("/admin/promotions/astra/codes/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(["active", "suspended", "revoked"]) }).parse(request.body);
    const db = await getDb();
    const rows = await db.update(giftCodes).set({ status: body.status }).where(eq(giftCodes.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Code not found.");
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "code.status", targetType: "gift_code", targetId: id, metadata: { status: body.status } });
    return { code: rows[0] };
  });

  // ── Plans, packages, settings, flags ───────────────────────────────
  app.get("/admin/plans", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    return { items: await db.select().from(plans).orderBy(plans.sortOrder) };
  });

  app.patch("/admin/plans/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = z.object({ pricePaise: z.number().int().min(0).optional(), freeRpm: z.number().int().min(1).optional(), freeRph: z.number().int().min(1).optional(), freeRpd: z.number().int().min(1).optional(), concurrency: z.number().int().min(1).optional(), queuePriority: z.number().int().min(1).max(10).optional(), active: z.boolean().optional(), features: z.array(z.string()).optional() }).parse(request.body);
    const db = await getDb();
    const rows = await db.update(plans).set(body).where(eq(plans.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Plan not found.");
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "plan.update", targetType: "plan", targetId: id, metadata: body as Record<string, unknown> });
    return { plan: rows[0] };
  });

  app.get("/admin/packages", async (request) => {
    await requireRole(request, ["admin", "support"]);
    const db = await getDb();
    return { items: await db.select().from(creditPackages).orderBy(creditPackages.sortOrder) };
  });

  app.patch("/admin/packages/:id", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { id } = request.params as { id: string };
    const body = z.object({ name: z.string().optional(), pricePaise: z.number().int().min(0).optional(), bonusPaise: z.number().int().min(0).optional(), active: z.boolean().optional() }).parse(request.body);
    const db = await getDb();
    const rows = await db.update(creditPackages).set(body).where(eq(creditPackages.id, id)).returning();
    if (!rows[0]) throw new ApiError("not_found", "Package not found.");
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "package.update", targetType: "credit_package", targetId: id, metadata: body as Record<string, unknown> });
    return { package: rows[0] };
  });

  app.get("/admin/settings", async (request) => {
    await requireRole(request, ["admin"]);
    const db = await getDb();
    const [settings, flags] = [await db.select().from(systemSettings), await db.select().from(featureFlags)];
    return { settings, flags };
  });

  app.patch("/admin/settings/:key", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { key } = request.params as { key: string };
    const body = z.object({ value: z.unknown() }).parse(request.body);
    const db = await getDb();
    await db.update(systemSettings).set({ value: body.value as never, updatedAt: new Date() }).where(eq(systemSettings.key, key));
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "setting.update", targetType: "system_setting", targetId: key });
    await loadSettings(true);
    return { ok: true };
  });

  app.patch("/admin/flags/:key", async (request) => {
    const admin = await requireRole(request, ["admin"]);
    const { key } = request.params as { key: string };
    const body = z.object({ enabled: z.boolean() }).parse(request.body);
    const db = await getDb();
    await db.update(featureFlags).set({ enabled: body.enabled, updatedAt: new Date() }).where(eq(featureFlags.key, key));
    await db.insert(auditLogs).values({ actorUserId: admin.id, action: "flag.update", targetType: "feature_flag", targetId: key, metadata: { enabled: body.enabled } });
    await loadSettings(true);
    return { ok: true };
  });

  app.get("/admin/audit", async (request) => {
    await requireRole(request, ["admin"]);
    const db = await getDb();
    const rows = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(200);
    return { items: rows.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })) };
  });
}

// small helpers for typed column refs in select
function email(u: typeof users) { return u.email; }
function slug(m: typeof models | typeof providers) { return m.slug; }