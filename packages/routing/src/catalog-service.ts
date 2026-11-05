import type { FrontendModelProfile, ModelCategory } from "./types.js";
import { ModelProfileRegistry } from "./profile-registry.js";
import { resolvePromotionalCanonicalId } from "@pro/shared";

export interface CatalogQueryOptions {
  query?: string;
  category?: string;
  provider?: string;
  freeOnly?: boolean;
  promotionalOnly?: boolean;
  paidOnly?: boolean;
  pricingPendingOnly?: boolean;
  sort?:
    | "popularity"
    | "rank"
    | "rating"
    | "score"
    | "newest"
    | "lowest_input"
    | "lowest_output"
    | "highest_context"
    | "alphabetical"
    | "price_asc"
    | "price_desc";
  limit?: number;
  offset?: number;
}

export interface CatalogPageResult {
  items: FrontendModelProfile[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Model Catalog Service (§6, §9, §11).
 * In-memory indexed query engine providing sub-50ms search, filtering, and pagination over 500+ models.
 */
export class ModelCatalogService {
  public static query(opts: CatalogQueryOptions = {}): CatalogPageResult {
    const limit = Math.max(1, Math.min(600, opts.limit ?? 50));
    const offset = Math.max(0, opts.offset ?? 0);

    let list = [...ModelProfileRegistry.getAll()];

    // 1. Text Search Filter (name, ID, provider, capability)
    if (opts.query) {
      const q = opts.query.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.categoryLabel.toLowerCase().includes(q) ||
          (m.canonicalModelId && m.canonicalModelId.toLowerCase().includes(q)) ||
          m.routingPolicy.primaryBackend.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // 2. Category / Capability Filter
    if (opts.category && opts.category !== "all") {
      const cat = opts.category.toLowerCase().trim();
      if (cat === "budget") {
        list = list.filter((m) => (m.customerPricingUsd?.inputPerMillion ?? 0) <= 0.30);
      } else if (cat === "premium") {
        list = list.filter((m) => (m.customerPricingUsd?.inputPerMillion ?? 0) >= 1.00);
      } else if (cat === "multimodal") {
        list = list.filter((m) => m.capabilities.vision === "supported" || m.category === "vision");
      } else {
        list = list.filter((m) => m.category === cat);
      }
    }

    // 3. Provider Filter
    if (opts.provider && opts.provider !== "all") {
      const prov = opts.provider.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.routingPolicy.primaryBackend.toLowerCase().startsWith(prov) ||
          m.tags.some((t) => t.toLowerCase() === prov)
      );
    }

    // 4. Access Filters
    if (opts.promotionalOnly || opts.freeOnly) {
      list = list.filter((m) => resolvePromotionalCanonicalId(m.id) !== null);
    } else if (opts.paidOnly) {
      list = list.filter((m) => resolvePromotionalCanonicalId(m.id) === null);
    }

    if (opts.pricingPendingOnly) {
      list = list.filter((m) => m.pricingStatus === "pricing_pending");
    }

    // 5. Sorting
    const sort = opts.sort || "popularity";
    if (sort === "popularity") {
      list.sort((a, b) => b.popularity - a.popularity);
    } else if (sort === "rank") {
      list.sort((a, b) => a.rank - b.rank);
    } else if (sort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sort === "score") {
      list.sort((a, b) => {
        const scoreA = a.benchmarks?.[0]?.score ?? 0;
        const scoreB = b.benchmarks?.[0]?.score ?? 0;
        return scoreB - scoreA;
      });
    } else if (sort === "lowest_input" || sort === "price_asc") {
      list.sort(
        (a, b) =>
          (a.customerPricingUsd?.inputPerMillion ?? 0) -
          (b.customerPricingUsd?.inputPerMillion ?? 0)
      );
    } else if (sort === "lowest_output" || sort === "price_desc") {
      list.sort(
        (a, b) =>
          (b.customerPricingUsd?.outputPerMillion ?? 0) -
          (a.customerPricingUsd?.outputPerMillion ?? 0)
      );
    } else if (sort === "highest_context") {
      list.sort((a, b) => b.contextWindow - a.contextWindow);
    } else if (sort === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = list.length;
    const items = list.slice(offset, offset + limit);
    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    return {
      items,
      total,
      page,
      pageSize: limit,
      hasMore,
    };
  }

  public static list(opts: {
    q?: string;
    category?: string;
    tier?: string;
    provider?: string;
    freeOnly?: boolean;
    paidOnly?: boolean;
    promotionalOnly?: boolean;
    pricingPendingOnly?: boolean;
    page?: number;
    pageSize?: number;
    sort?: CatalogQueryOptions["sort"];
  } = {}) {
    return this.query({
      query: opts.q,
      category: opts.category,
      provider: opts.provider,
      freeOnly: opts.freeOnly,
      paidOnly: opts.paidOnly,
      promotionalOnly: opts.promotionalOnly,
      pricingPendingOnly: opts.pricingPendingOnly,
      sort: opts.sort,
      limit: opts.pageSize,
      offset: opts.page && opts.pageSize ? (opts.page - 1) * opts.pageSize : 0,
    });
  }

  public static getCategoryDistribution(): Record<string, number> {
    const dist: Record<string, number> = {};
    for (const p of ModelProfileRegistry.getAll()) {
      dist[p.category] = (dist[p.category] || 0) + 1;
    }
    return dist;
  }

  public static get(id: string): FrontendModelProfile | undefined {
    return ModelProfileRegistry.get(id);
  }

  public static getById(id: string): FrontendModelProfile | undefined {
    return ModelProfileRegistry.get(id);
  }

  public static getCategories(): Array<{ key: ModelCategory; label: string; count: number }> {
    const categories: ModelCategory[] = [
      "general",
      "reasoning",
      "coding",
      "agentic",
      "research",
      "math_science",
      "multilingual",
      "vision",
      "fast",
      "long_context",
      "creative",
      "business",
    ];

    return categories.map((cat) => ({
      key: cat,
      label: formatCategoryLabel(cat),
      count: ModelProfileRegistry.getByCategory(cat).length,
    }));
  }
}

function formatCategoryLabel(cat: ModelCategory): string {
  switch (cat) {
    case "general": return "General-Purpose AI";
    case "reasoning": return "Advanced Reasoning";
    case "coding": return "Coding & Software Engineering";
    case "agentic": return "Agentic Coding & Tools";
    case "research": return "Research & Analysis";
    case "math_science": return "Mathematics & Science";
    case "multilingual": return "Multilingual & Indic AI";
    case "vision": return "Vision & Document Intelligence";
    case "fast": return "Fast-Response AI";
    case "long_context": return "Long-Context AI";
    case "creative": return "Creative Writing";
    case "business": return "Business & Productivity";
  }
}
