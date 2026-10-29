import { describe, expect, it } from "vitest";
import {
  PRICING_TIER_SEEDS,
  PRO_ALIASES,
  PRO_ALIAS_FAMILIES,
  PRO_ALIAS_PROVIDER_SLUG,
  PRO_ALIAS_UPSTREAM_MODEL_ID,
  PRO_ALIAS_VARIANTS,
} from "../packages/database/src/catalog-aliases.js";

describe("Pro alias catalog", () => {
  it("defines 300 aliases from 30 families and 10 variants", () => {
    expect(PRO_ALIAS_FAMILIES).toHaveLength(30);
    expect(PRO_ALIAS_VARIANTS).toHaveLength(10);
    expect(PRO_ALIASES).toHaveLength(300);
  });

  it("has unique slugs following the pr-<family>-<variant>-pro pattern", () => {
    const slugs = PRO_ALIASES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const alias of PRO_ALIASES) {
      expect(alias.slug).toMatch(/^pr-[a-z0-9]+-[a-z0-9]+-pro$/);
      expect(alias.name.endsWith(" Pro")).toBe(true);
      expect(alias.description).toContain("DeepSeek V4.1");
    }
  });

  it("references only seeded pricing tiers", () => {
    const tiers = new Set(PRICING_TIER_SEEDS.map((t) => t.slug));
    for (const alias of PRO_ALIASES) expect(tiers.has(alias.pricingTier)).toBe(true);
  });

  it("routes every alias through the shared gateway model", () => {
    for (const alias of PRO_ALIASES) {
      expect(alias.provider).toBe(PRO_ALIAS_PROVIDER_SLUG);
      expect(alias.upstreamModelId).toBe(PRO_ALIAS_UPSTREAM_MODEL_ID);
    }
  });
});
