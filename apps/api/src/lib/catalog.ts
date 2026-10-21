import { desc, eq, gte, or, sql } from "drizzle-orm";
import { getDb, modelCapabilities, modelLimits, modelPricing, modelProviders, models, providers, providerHealth } from "@uno/database";
import type { ModelCapabilities, ModelDto, ModelPricing, ProviderDto } from "@uno/shared";

export interface ModelFilters {
  q?: string;
  provider?: string;
  free?: boolean;
  paid?: boolean;
  category?: "coding" | "reasoning" | "vision" | "image" | "audio" | "tools";
  minContext?: number;
  sort?: "rank" | "popularity" | "rating" | "newest" | "price_asc" | "price_desc" | "latency";
  limit?: number;
  offset?: number;
}

export async function listModels(filters: ModelFilters = {}): Promise<{ items: ModelDto[]; total: number }> {
  const db = await getDb();
  const conditions = [];
  conditions.push(sql`${models.status} IN ('active','coming_soon')`);
  if (filters.q) {
    const q = `%${filters.q.toLowerCase()}%`;
    conditions.push(or(sql`lower(${models.name}) LIKE ${q}`, sql`lower(${models.slug}) LIKE ${q}`, sql`lower(${models.description}) LIKE ${q}`)!);
  }
  if (filters.provider) {
    const p = (await db.select().from(providers).where(eq(providers.slug, filters.provider)))[0];
    if (!p) return { items: [], total: 0 };
    conditions.push(eq(models.providerId, p.id));
  }
  if (filters.free) conditions.push(eq(models.isFree, true));
  if (filters.paid) conditions.push(eq(models.isFree, false));
  if (filters.minContext) conditions.push(gte(models.contextWindow, filters.minContext));

  const where = conditions.length ? sql.join(conditions, sql` AND `) : undefined;
  const totalRows = await db.select({ n: sql<number>`count(*)::int` }).from(models).where(where);
  const total = totalRows[0]?.n ?? 0;

  let orderBy: any = desc(models.popularity);
  switch (filters.sort) {
    case "rank": orderBy = models.rank; break;
    case "rating": orderBy = desc(models.rating); break;
    case "newest": orderBy = desc(models.createdAt); break;
    case "price_asc": orderBy = models.rank; break;
    case "price_desc": orderBy = desc(models.rank); break;
    case "latency": orderBy = models.rank; break;
    default: orderBy = desc(models.popularity);
  }

  const rows = await db
    .select({ model: models, pricing: modelPricing, caps: modelCapabilities, providerSlug: providers.slug, providerName: providers.name })
    .from(models)
    .leftJoin(modelPricing, eq(modelPricing.modelId, models.id))
    .leftJoin(modelCapabilities, eq(modelCapabilities.modelId, models.id))
    .leftJoin(providers, eq(providers.id, models.providerId))
    .where(where)
    .orderBy(orderBy)
    .limit(Math.min(filters.limit ?? 60, 200))
    .offset(filters.offset ?? 0);

  const linkRows = await db.select().from(modelProviders);
  const providerRows = await db.select().from(providers);
  const linksByModel = new Map<string, typeof linkRows>();
  for (const l of linkRows) {
    const arr = linksByModel.get(l.modelId) ?? [];
    arr.push(l);
    linksByModel.set(l.modelId, arr);
  }
  const providerById = new Map(providerRows.map((p) => [p.id, p]));

  let items = rows.map((r) => toModelDto(r.model, r.pricing, r.caps, r.providerSlug ?? "", r.providerName ?? "", linksByModel.get(r.model.id) ?? [], providerById));

  if (filters.category) {
    items = items.filter((m) => matchCategory(m, filters.category!));
  }
  if (filters.sort === "price_asc") items.sort((a, b) => a.pricing.inputPerMillion - b.pricing.inputPerMillion);
  if (filters.sort === "price_desc") items.sort((a, b) => b.pricing.inputPerMillion - a.pricing.inputPerMillion);
  if (filters.sort === "latency") items.sort((a, b) => (a.latencyMs ?? 9e9) - (b.latencyMs ?? 9e9));

  return { items, total };
}

function matchCategory(m: ModelDto, category: string): boolean {
  const text = `${m.name} ${m.slug} ${m.description}`.toLowerCase();
  switch (category) {
    case "coding": return /code|codestral|kimi/.test(text) || m.capabilities.toolCalls;
    case "reasoning": return m.capabilities.reasoning;
    case "vision": return m.capabilities.vision;
    case "image": return m.capabilities.imageGeneration;
    case "audio": return m.capabilities.audio;
    case "tools": return m.capabilities.toolCalls;
    default: return true;
  }
}

export async function getModelDetail(slug: string): Promise<{
  model: ModelDto;
  limits: { perMinute: number; perHour: number; perDay: number; concurrency: number; queuePriority: number } | null;
  routes: Array<{ providerSlug: string; providerName: string; priority: number; status: string; healthy: boolean }>;
} | null> {
  const db = await getDb();
  const rows = await db
    .select({ model: models, pricing: modelPricing, caps: modelCapabilities, providerSlug: providers.slug, providerName: providers.name })
    .from(models)
    .leftJoin(modelPricing, eq(modelPricing.modelId, models.id))
    .leftJoin(modelCapabilities, eq(modelCapabilities.modelId, models.id))
    .leftJoin(providers, eq(providers.id, models.providerId))
    .where(eq(models.slug, slug));
  const row = rows[0];
  if (!row) return null;

  const links = await db
    .select({ link: modelProviders, provider: providers })
    .from(modelProviders)
    .innerJoin(providers, eq(providers.id, modelProviders.providerId))
    .where(eq(modelProviders.modelId, row.model.id));
  const linkRows = links.map((l) => l.link);
  const providerById = new Map(links.map((l) => [l.provider.id, l.provider]));

  const dto = toModelDto(row.model, row.pricing, row.caps, row.providerSlug ?? "", row.providerName ?? "", linkRows, providerById);
  const limitsRow = (await db.select().from(modelLimits).where(eq(modelLimits.modelId, row.model.id)))[0] ?? null;

  return {
    model: dto,
    limits: limitsRow ? { perMinute: limitsRow.perMinute, perHour: limitsRow.perHour, perDay: limitsRow.perDay, concurrency: limitsRow.concurrency, queuePriority: limitsRow.queuePriority } : null,
    // The upstream model id is internal routing detail — never exposed publicly.
    routes: links.map((l) => ({
      providerSlug: l.provider.slug,
      providerName: l.provider.name,
      priority: l.link.priority,
      status: l.link.status,
      healthy: l.provider.status === "active",
    })).sort((a, b) => a.priority - b.priority),
  };
}

export function toModelDto(
  m: typeof models.$inferSelect,
  pricing: typeof modelPricing.$inferSelect | null,
  caps: typeof modelCapabilities.$inferSelect | null,
  providerSlug: string,
  providerName: string,
  links: Array<typeof modelProviders.$inferSelect>,
  providerById: Map<string, typeof providers.$inferSelect>,
): ModelDto {
  const servingLinks = links.filter((l) => l.status !== "disabled");
  const available = servingLinks.some((l) => {
    const p = providerById.get(l.providerId);
    return p && p.status === "active" && l.status === "active";
  });
  const price: ModelPricing = {
    inputPerMillion: pricing?.inputPerMillion ?? 0,
    outputPerMillion: pricing?.outputPerMillion ?? 0,
    cachedInputPerMillion: pricing?.cachedInputPerMillion ?? undefined,
    currency: "INR",
  };
  const capabilities: ModelCapabilities = {
    modalities: (caps?.modalities as ModelCapabilities["modalities"]) ?? ["text"],
    streaming: caps?.streaming ?? true,
    toolCalls: caps?.toolCalls ?? false,
    structuredOutputs: caps?.structuredOutputs ?? false,
    reasoning: caps?.reasoning ?? false,
    vision: caps?.vision ?? false,
    imageGeneration: caps?.imageGeneration ?? false,
    audio: caps?.audio ?? false,
    jsonMode: caps?.jsonMode ?? true,
  };
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    description: m.description,
    providerName: providerName || "ProRouter",
    providerSlug: providerSlug || "prorouter",
    type: m.type,
    status: m.status,
    isFree: m.isFree,
    pricing: price,
    capabilities,
    contextWindow: m.contextWindow,
    maxOutputTokens: m.maxOutputTokens,
    rank: m.rank,
    popularity: m.popularity,
    rating: m.rating,
    latencyMs: null,
    throughputTps: null,
    uptimePercent: null,
    available,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function listProviders(): Promise<ProviderDto[]> {
  const db = await getDb();
  const providerRows = await db.select().from(providers);
  const linkRows = await db.select().from(modelProviders);
  return providerRows
    .map((p) => {
      const links = linkRows.filter((l) => l.providerId === p.id);
      const modelCount = new Set(links.map((l) => l.modelId)).size;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        region: p.region,
        status: p.status,
        modelCount,
        uptimePercent: p.status === "active" ? 99.9 : null,
        avgLatencyMs: null,
        throughputTps: null,
        priority: p.priority,
        supportedCapabilities: p.capabilities,
        retentionPolicy: p.retentionPolicy,
        description: p.description,
      } satisfies ProviderDto;
    })
    .sort((a, b) => a.priority - b.priority);
}

export async function getProviderDetail(slug: string) {
  const db = await getDb();
  const p = (await db.select().from(providers).where(eq(providers.slug, slug)))[0];
  if (!p) return null;
  const links = await db
    .select({ link: modelProviders, model: models })
    .from(modelProviders)
    .innerJoin(models, eq(models.id, modelProviders.modelId))
    .where(eq(modelProviders.providerId, p.id));
  const healthRows = await db.select().from(providerHealth).where(eq(providerHealth.providerId, p.id)).orderBy(desc(providerHealth.checkedAt)).limit(1);
  return {
    provider: {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      region: p.region,
      status: p.status,
      priority: p.priority,
      retentionPolicy: p.retentionPolicy,
      capabilities: p.capabilities,
      lastHealthAt: p.lastHealthAt?.toISOString() ?? null,
      healthMessage: p.healthMessage,
    },
    // Upstream model ids are internal routing detail — never exposed publicly.
    models: links.map((l) => ({ slug: l.model.slug, name: l.model.name, isFree: l.model.isFree, status: l.link.status, priority: l.link.priority })),
    lastHealth: healthRows[0] ? { available: healthRows[0].available, latencyMs: healthRows[0].latencyMs, message: healthRows[0].message, checkedAt: healthRows[0].checkedAt.toISOString() } : null,
  };
}