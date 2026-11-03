import type { FrontendModelProfile, ModelCategory, ProfileStatus } from "./types.js";
import { generateProfiles } from "./catalog-generator.js";

/**
 * Model Profile Registry (§4, §9).
 * Maintains all 500+ frontend model profiles with indexed lookup.
 */
export class ModelProfileRegistry {
  private static profiles: FrontendModelProfile[] = generateProfiles();
  private static profileMap = new Map<string, FrontendModelProfile>(
    ModelProfileRegistry.profiles.map((p) => [p.id.toLowerCase(), p])
  );
  private static categoryMap = new Map<ModelCategory, FrontendModelProfile[]>();

  static {
    for (const p of this.profiles) {
      const list = this.categoryMap.get(p.category) || [];
      list.push(p);
      this.categoryMap.set(p.category, list);
    }
  }

  public static has(id: string): boolean {
    return this.profileMap.has(id.toLowerCase().trim());
  }

  public static get(id: string): FrontendModelProfile | undefined {
    return this.profileMap.get(id.toLowerCase().trim());
  }

  public static getAll(): FrontendModelProfile[] {
    return this.profiles;
  }

  public static count(): number {
    return this.profiles.length;
  }

  public static getByCategory(category: ModelCategory): FrontendModelProfile[] {
    return this.categoryMap.get(category) || [];
  }

  public static filter(opts: {
    category?: ModelCategory;
    status?: ProfileStatus;
    freeOnly?: boolean;
    query?: string;
  }): FrontendModelProfile[] {
    let result = this.profiles;

    if (opts.category) {
      result = result.filter((p) => p.category === opts.category);
    }

    if (opts.status) {
      result = result.filter((p) => p.status === opts.status);
    }

    if (opts.freeOnly) {
      result = result.filter((p) => p.isFree);
    }

    if (opts.query) {
      const q = opts.query.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }
}
