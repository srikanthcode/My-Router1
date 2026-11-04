/**
 * Centralized, Production-Grade Pricing & Promotional Engine (§Phase 2, Phase 4, Phase 5)
 */

export interface ModelPricingTier {
  category: string;
  inputUsdPer1M: number;
  outputUsdPer1M: number;
}

export const SUGGESTED_PRICE_TIERS: Record<string, ModelPricingTier> = {
  budget_fast: { category: "Budget / Fast", inputUsdPer1M: 0.25, outputUsdPer1M: 0.80 },
  standard: { category: "Standard", inputUsdPer1M: 0.60, outputUsdPer1M: 2.40 },
  advanced: { category: "Advanced", inputUsdPer1M: 1.20, outputUsdPer1M: 4.80 },
  premium: { category: "Premium", inputUsdPer1M: 2.50, outputUsdPer1M: 10.00 },
  flagship: { category: "Flagship", inputUsdPer1M: 5.00, outputUsdPer1M: 20.00 },
  coding: { category: "Coding", inputUsdPer1M: 1.50, outputUsdPer1M: 6.00 },
  reasoning: { category: "Reasoning", inputUsdPer1M: 2.00, outputUsdPer1M: 8.00 },
};

export const DEFAULT_USD_TO_INR_RATE = 80; // $1 USD = ₹80 INR
export const DEFAULT_TARGET_GROSS_MARGIN = 0.45; // 45% gross margin

export interface ModelPricingConfig {
  modelId: string;
  name: string;
  provider: string;
  providerModelId: string;
  category: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: string[];
  providerUpstreamCostUsd: {
    inputPer1M: number;
    outputPer1M: number;
  };
  sellingPriceUsd: {
    inputPer1M: number;
    outputPer1M: number;
  };
  sellingPriceInrPaise: {
    inputPer1M: number; // in paise (₹1 = 100 paise)
    outputPer1M: number;
  };
  targetGrossMargin: number;
  isPromotionalEligible: boolean;
  availability: "active" | "degraded" | "disabled";
}

/** Calculate selling price based on upstream provider cost and gross margin */
export function calculateSellingPrice(
  upstreamCostUsd: number,
  targetGrossMargin = DEFAULT_TARGET_GROSS_MARGIN,
  floorPriceUsd = 0.10,
): number {
  if (upstreamCostUsd <= 0) return floorPriceUsd;
  const rawPrice = upstreamCostUsd / (1 - Math.min(0.95, Math.max(0.05, targetGrossMargin)));
  const finalPrice = Math.max(rawPrice, floorPriceUsd);
  return Number(finalPrice.toFixed(4));
}

/** Convert USD per 1M tokens to INR Paise per 1M tokens */
export function usdToInrPaise(usdAmount: number, usdToInrRate = DEFAULT_USD_TO_INR_RATE): number {
  return Math.round(usdAmount * usdToInrRate * 100);
}

/** Convert INR Paise to USD */
export function inrPaiseToUsd(paise: number, usdToInrRate = DEFAULT_USD_TO_INR_RATE): number {
  const rupees = paise / 100;
  return Number((rupees / usdToInrRate).toFixed(4));
}

/** Format dual pricing label e.g. "$0.60 / 1M · ₹48.00 / 1M" */
export function formatDualTokenPrice(usdPer1M: number, usdToInrRate = DEFAULT_USD_TO_INR_RATE): string {
  const inr = usdPer1M * usdToInrRate;
  return `$${usdPer1M.toFixed(2)} / 1M · ₹${inr.toFixed(2)} / 1M`;
}

// ── Credit Packages (Phase 5) ──
export interface CreditPackage {
  id: string;
  name: string;
  usdAmount: number;
  inrPricePaise: number;
  inrFormatted: string;
  usdFormatted: string;
  bonusPercent: number;
  popular?: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "pkg_starter", name: "Starter", usdAmount: 5, inrPricePaise: 40000, inrFormatted: "₹400", usdFormatted: "$5", bonusPercent: 0 },
  { id: "pkg_basic", name: "Basic", usdAmount: 10, inrPricePaise: 80000, inrFormatted: "₹800", usdFormatted: "$10", bonusPercent: 0, popular: true },
  { id: "pkg_growth", name: "Growth", usdAmount: 25, inrPricePaise: 200000, inrFormatted: "₹2,000", usdFormatted: "$25", bonusPercent: 0 },
  { id: "pkg_pro", name: "Pro", usdAmount: 50, inrPricePaise: 400000, inrFormatted: "₹4,000", usdFormatted: "$50", bonusPercent: 0 },
  { id: "pkg_business", name: "Business", usdAmount: 100, inrPricePaise: 800000, inrFormatted: "₹8,000", usdFormatted: "$100", bonusPercent: 0 },
];

// ── 48-Hour Promotional Launch Special (Phase 4) ──
export const PROMOTIONAL_48H_MODELS = new Set<string>([
  "deepseek-v4.1-flash",
  "deepseek-v4.1-flash-1017",
  "qwen-2.5-coder-32b",
  "qwen3.8-27b",
]);

export const PROMO_DURATION_MS = 48 * 60 * 60 * 1000; // 48 Hours

export function isPromotionalModel(modelId: string): boolean {
  if (!modelId) return false;
  return PROMOTIONAL_48H_MODELS.has(modelId.trim().toLowerCase());
}

export function isPromotionActive(activatedAt: Date | string | null): {
  active: boolean;
  remainingMs: number;
  remainingFormatted: string;
  expiresAt: Date | null;
} {
  if (!activatedAt) {
    return { active: false, remainingMs: 0, remainingFormatted: "Not activated", expiresAt: null };
  }
  const start = new Date(activatedAt).getTime();
  const expires = start + PROMO_DURATION_MS;
  const now = Date.now();
  const remainingMs = Math.max(0, expires - now);
  const active = remainingMs > 0;

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    active,
    remainingMs,
    remainingFormatted: active ? `${hours}h ${minutes}m left` : "Expired",
    expiresAt: new Date(expires),
  };
}

