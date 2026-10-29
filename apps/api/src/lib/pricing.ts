import { and, eq } from "drizzle-orm";
import { getDb, modelPricing, pricingTiers } from "@pro/database";
import { usdCentsToPaise, type ModelPricing } from "@pro/shared";
import { getNumber } from "./settings.js";

export type PricingTierRow = typeof pricingTiers.$inferSelect;

export interface EffectivePricing {
  pricing: ModelPricing;
  tierSlug: string | null;
  tierName: string | null;
}

/** Convert a USD-cents-per-1M tier row into integer paise per 1M tokens. */
export function tierToPricing(tier: PricingTierRow, usdToInrRate: number): ModelPricing {
  return {
    inputPerMillion: usdCentsToPaise(tier.inputUsdCentsPerMillion, usdToInrRate),
    outputPerMillion: usdCentsToPaise(tier.outputUsdCentsPerMillion, usdToInrRate),
    cachedInputPerMillion:
      tier.cachedInputUsdCentsPerMillion === null
        ? undefined
        : usdCentsToPaise(tier.cachedInputUsdCentsPerMillion, usdToInrRate),
    currency: "INR",
  };
}

/**
 * Tier pricing wins for models assigned to an active tier; explicit
 * model_pricing rows remain the fallback for legacy/one-off pricing.
 */
export function resolveEffectivePricing(
  model: { pricingTier: string | null },
  explicit: typeof modelPricing.$inferSelect | null,
  tier: PricingTierRow | null,
  usdToInrRate: number,
): EffectivePricing {
  if (model.pricingTier && tier && tier.active && tier.slug === model.pricingTier) {
    return { pricing: tierToPricing(tier, usdToInrRate), tierSlug: tier.slug, tierName: tier.name };
  }
  return {
    pricing: {
      inputPerMillion: explicit?.inputPerMillion ?? 0,
      outputPerMillion: explicit?.outputPerMillion ?? 0,
      cachedInputPerMillion: explicit?.cachedInputPerMillion ?? undefined,
      currency: "INR",
    },
    tierSlug: null,
    tierName: null,
  };
}

export async function getUsdToInrRate(): Promise<number> {
  return getNumber("USD_TO_INR_RATE", 97);
}

export async function loadActivePricingTiers(): Promise<Map<string, PricingTierRow>> {
  const db = await getDb();
  const rows = await db.select().from(pricingTiers).where(eq(pricingTiers.active, true));
  return new Map(rows.map((t) => [t.slug, t]));
}

export async function loadActivePricingTier(slug: string | null): Promise<PricingTierRow | null> {
  if (!slug) return null;
  const db = await getDb();
  const rows = await db.select().from(pricingTiers).where(and(eq(pricingTiers.slug, slug), eq(pricingTiers.active, true)));
  return rows[0] ?? null;
}
