import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError, DEFAULT_USD_TO_INR_DISPLAY_RATE, calculateModelPricing, isStrictlyPromotionalEligible } from "@pro/shared";
import { getProviderDetail, getModelDetail, listModels, listProviders } from "../lib/catalog.js";
import { ModelCatalogService, ModelProfileRegistry } from "@pro/routing";

function truthy(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === 1;
}

export async function catalogRoutes(app: FastifyInstance) {
  // ── Unified 500+ Model Catalogue Listing ──
  const listModelsHandler = async (request: any) => {
    const q = (request.query || {}) as Record<string, any>;
    const page = q.page ? parseInt(String(q.page), 10) : 1;
    const pageSize = q.pageSize ? parseInt(String(q.pageSize), 10) : q.limit ? parseInt(String(q.limit), 10) : 50;

    return ModelCatalogService.list({
      q: q.q,
      category: q.category,
      provider: q.provider,
      tier: q.tier,
      promotionalOnly: truthy(q.promotionalOnly || q.free),
      paidOnly: truthy(q.paidOnly || q.paid),
      pricingPendingOnly: truthy(q.pricingPendingOnly || q.pending),
      page,
      pageSize,
      sort: q.sort || "popularity",
    });
  };

  app.get("/catalog/profiles", listModelsHandler);
  app.get("/api/catalog/profiles", listModelsHandler);

  // Standard /models endpoint: uses database-backed listModels which merges DB models and profiles
  app.get("/models", async (request: any) => {
    const q = (request.query || {}) as Record<string, any>;
    return listModels({
      q: q.q,
      provider: q.provider,
      free: q.free !== undefined ? truthy(q.free) : undefined,
      paid: q.paid !== undefined ? truthy(q.paid) : undefined,
      category: q.category,
      minContext: q.min_context ? Number(q.min_context) : undefined,
      sort: q.sort,
      limit: q.limit ? Number(q.limit) : q.pageSize ? Number(q.pageSize) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    });
  });
  app.get("/api/models", async (request: any) => {
    const q = (request.query || {}) as Record<string, any>;
    return listModels({
      q: q.q,
      provider: q.provider,
      free: q.free !== undefined ? truthy(q.free) : undefined,
      paid: q.paid !== undefined ? truthy(q.paid) : undefined,
      category: q.category,
      minContext: q.min_context ? Number(q.min_context) : undefined,
      sort: q.sort,
      limit: q.limit ? Number(q.limit) : q.pageSize ? Number(q.pageSize) : undefined,
      offset: q.offset ? Number(q.offset) : undefined,
    });
  });

  // ── Provider Metadata & Directory ──
  const listProvidersHandler = async () => {
    const all = ModelProfileRegistry.getAll();
    const providerMap = new Map<string, { provider: string; modelCount: number; verifiedCostCount: number }>();
    for (const m of all) {
      const p = m.provider || (m.routingPolicy?.preferredProvider ?? m.routingPolicy?.primaryBackend?.split("/")[0]) || "other";
      const entry = providerMap.get(p) ?? { provider: p, modelCount: 0, verifiedCostCount: 0 };
      entry.modelCount++;
      if (m.upstreamCostUsd) entry.verifiedCostCount++;
      providerMap.set(p, entry);
    }
    const dbProviders = await listProviders().catch(() => []);
    return {
      providers: Array.from(providerMap.values()).map((p) => {
        const found = dbProviders.find((dp: any) => dp.slug === p.provider);
        return {
          slug: p.provider,
          name: found?.name ?? p.provider.toUpperCase(),
          modelCount: p.modelCount,
          verifiedCostCount: p.verifiedCostCount,
          status: found?.status ?? "active",
        };
      }),
    };
  };

  app.get("/api/models/providers", listProvidersHandler);
  app.get("/providers", listProvidersHandler);
  app.get("/api/providers", listProvidersHandler);

  // ── Categories Directory ──
  const listCategoriesHandler = async () => {
    const all = ModelProfileRegistry.getAll();
    const catMap = new Map<string, { category: string; count: number; minInputUsd: number }>();
    for (const m of all) {
      const cat = m.category || "general";
      const entry = catMap.get(cat) ?? { category: cat, count: 0, minInputUsd: 999 };
      entry.count++;
      if (m.customerPricingUsd?.inputPerMillion && m.customerPricingUsd.inputPerMillion < entry.minInputUsd) {
        entry.minInputUsd = m.customerPricingUsd.inputPerMillion;
      }
      catMap.set(cat, entry);
    }
    return {
      categories: Array.from(catMap.values()).map((c) => ({
        slug: c.category,
        count: c.count,
        startingPriceUsd: c.minInputUsd < 999 ? c.minInputUsd : 0.05,
      })),
    };
  };

  app.get("/api/models/categories", listCategoriesHandler);
  app.get("/categories", listCategoriesHandler);

  // ── Pricing Overview Table ──
  const listPricingTableHandler = async (request: any) => {
    const q = (request.query || {}) as Record<string, any>;
    const res = ModelCatalogService.list({
      q: q.q,
      category: q.category,
      provider: q.provider,
      promotionalOnly: truthy(q.promotionalOnly),
      paidOnly: truthy(q.paidOnly),
      pricingPendingOnly: truthy(q.pricingPendingOnly),
      page: 1,
      pageSize: 600,
      sort: q.sort || "rank",
    });

    const displayRate = DEFAULT_USD_TO_INR_DISPLAY_RATE;

    const pricingItems = res.items.map((m) => {
      const inputUsd = m.customerPricingUsd?.inputPerMillion ?? 0;
      const outputUsd = m.customerPricingUsd?.outputPerMillion ?? 0;
      const isPromo = isStrictlyPromotionalEligible(m.id);
      const prov = m.provider || (m.routingPolicy?.preferredProvider ?? m.routingPolicy?.primaryBackend?.split("/")[0]) || "other";

      return {
        modelId: m.id,
        name: m.name,
        canonicalModelId: m.canonicalModelId ?? m.id,
        provider: prov,
        category: m.category,
        pricingStatus: m.pricingStatus ?? "approved",
        isPromotional: isPromo,
        promoDurationHours: isPromo ? 48 : 0,
        upstreamCostUsd: m.upstreamCostUsd ?? null,
        customerPricingUsd: {
          inputPerMillion: inputUsd,
          outputPerMillion: outputUsd,
          cachedInputPerMillion: m.customerPricingUsd?.cachedInputPerMillion ?? null,
        },
        customerPricingInrPaise: {
          inputPaisePer1M: Math.ceil(inputUsd * displayRate * 100),
          outputPaisePer1M: Math.ceil(outputUsd * displayRate * 100),
          cachedInputPaisePer1M: m.customerPricingUsd?.cachedInputPerMillion ? Math.ceil(m.customerPricingUsd.cachedInputPerMillion * displayRate * 100) : null,
        },
        displayRate,
      };
    });

    return {
      total: pricingItems.length,
      pricingStatusSummary: {
        approved: pricingItems.filter((p) => p.pricingStatus === "approved").length,
        pricingPending: pricingItems.filter((p) => p.pricingStatus === "pricing_pending").length,
        promotionalEligible: pricingItems.filter((p) => p.isPromotional).length,
      },
      items: pricingItems,
    };
  };

  app.get("/api/models/pricing", listPricingTableHandler);
  app.get("/pricing/models", listPricingTableHandler);

  // ── Single Model Detailed Pricing Breakdown ──
  const getModelPricingDetailHandler = async (request: any, reply: any) => {
    const { modelId, slug } = request.params as { modelId?: string; slug?: string };
    const id = (modelId || slug || "").trim();
    const model = ModelCatalogService.get(id);
    if (!model) throw new ApiError("model_not_found", `Model '${id}' not found.`);

    const isPromo = isStrictlyPromotionalEligible(model.id);
    const displayRate = DEFAULT_USD_TO_INR_DISPLAY_RATE;

    const calc = calculateModelPricing(
      {
        inputUsdPer1M: model.upstreamCostUsd?.inputPerMillion ?? 0.20,
        outputUsdPer1M: model.upstreamCostUsd?.outputPerMillion ?? 0.80,
        cachedInputUsdPer1M: model.upstreamCostUsd?.cachedInputPerMillion,
      },
      {
        operationalReserve: 0.10,
        targetGrossMargin: 0.30,
      },
      displayRate
    );

    const prov = model.provider || (model.routingPolicy?.preferredProvider ?? model.routingPolicy?.primaryBackend?.split("/")[0]) || "other";

    return reply.send({
      modelId: model.id,
      canonicalModelId: model.canonicalModelId ?? model.id,
      name: model.name,
      provider: prov,
      category: model.category,
      contextWindow: model.contextWindow,
      pricingStatus: model.pricingStatus ?? calc.pricingStatus,
      isPromotionalEligible: isPromo,
      promotionalNotes: isPromo
        ? "Eligible for 48-Hour Free Launch Promotion. Free access applies for 48 hours following user activation up to daily promotional quota."
        : "Standard Paid Model. No free promotion.",
      formula: "Customer Selling Price = (Upstream Cost * (1 + Operational Reserve)) / (1 - Target Gross Margin)",
      parameters: {
        operationalReserve: 0.10,
        operationalReservePercent: "10%",
        targetGrossMargin: 0.30,
        targetGrossMarginPercent: "30%",
        displayUsdToInrRate: displayRate,
      },
      breakdown: {
        input: calc.input,
        output: calc.output,
        cachedInput: calc.cachedInput ?? null,
      },
      customerPricingUsd: model.customerPricingUsd,
    });
  };

  app.get("/api/models/:modelId/pricing", getModelPricingDetailHandler);
  app.get("/models/:modelId/pricing", getModelPricingDetailHandler);

  // ── Single Model Profile Detail ──
  const getModelDetailHandler = async (request: any, reply: any) => {
    const { slug, modelId } = request.params as { slug?: string; modelId?: string };
    const id = (slug || modelId || "").trim();
    const profile = ModelCatalogService.get(id);
    if (profile) return reply.send(profile);

    const detail = await getModelDetail(id);
    if (!detail) throw new ApiError("model_not_found", `Model '${id}' not found.`);
    return reply.send(detail);
  };

  app.get("/models/:slug", getModelDetailHandler);
  app.get("/api/models/:slug", getModelDetailHandler);

  // ── Single Provider Detail ──
  app.get("/providers/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const detail = await getProviderDetail(slug);
    if (!detail) throw new ApiError("not_found", `Provider '${slug}' not found.`);
    return reply.send(detail);
  });
  app.get("/api/providers/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const detail = await getProviderDetail(slug);
    if (!detail) throw new ApiError("not_found", `Provider '${slug}' not found.`);
    return reply.send(detail);
  });
}