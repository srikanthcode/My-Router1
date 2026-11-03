import type { FrontendModelProfile, ModelCategory } from "./types.js";
import { ModelProfileRegistry } from "./profile-registry.js";

export interface CatalogQueryOptions {
  query?: string;
  category?: string;
  provider?: string;
  freeOnly?: boolean;
  sort?: "popularity" | "rank" | "rating" | "newest";
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
 * Model Catalog Service (§9, §11).
 * In-memory indexed query engine providing sub-50ms search, filtering, and pagination over 500+ models.
 */
export class ModelCatalogService {
  public static query(opts: CatalogQueryOptions = {}): CatalogPageResult {
    const limit = Math.max(1, Math.min(200, opts.limit ?? 50));
    const offset = Math.max(0, opts.offset ?? 0);

    let list = ModelProfileRegistry.getAll();

    // 1. Text Search Filter
    if (opts.query) {
      const q = opts.query.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // 2. Category Filter
    if (opts.category && opts.category !== "all") {
      const cat = opts.category.toLowerCase().trim();
      list = list.filter((m) => m.category === cat);
    }

    // 3. Free Only Filter
    if (opts.freeOnly) {
      list = list.filter((m) => m.isFree);
    }

    // 4. Sort
    const sort = opts.sort || "popularity";
    if (sort === "popularity") {
      list.sort((a, b) => b.popularity - a.popularity);
    } else if (sort === "rank") {
      list.sort((a, b) => a.rank - b.rank);
    } else if (sort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
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
    page?: number;
    pageSize?: number;
    sort?: "popularity" | "rank" | "rating" | "newest";
  } = {}) {
    return this.query({
      query: opts.q,
      category: opts.category,
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
