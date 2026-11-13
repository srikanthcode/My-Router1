/**
 * Centralized, Production-Grade Pricing & Promotional Engine
 * 
 * Initial pricing formula:
 * Customer Selling Price = (Upstream Cost * (1 + Operational Reserve)) / (1 - Target Gross Margin)
 * 
 * Default:
 * - Operational reserve: 10% (1.10)
 * - Target gross margin: 30% (0.30)
 * Example:
 * - Provider input cost: $0.20 -> Customer input price: $0.3143 (~$0.31-0.32)
 * - Provider output cost: $0.80 -> Customer output price: $1.2571 (~$1.26)
 */

export type PricingCategory =
  | "budget"
  | "standard"
  | "advanced"
  | "coding"
  | "reasoning"
  | "premium"
  | "frontier"
  | "multimodal";

export type PricingStatus = "approved" | "pricing_pending" | "disabled" | "draft";

export interface PricingConfigOptions {
  operationalReserve?: number; // e.g. 0.10 (10%)
  targetGrossMargin?: number; // e.g. 0.30 (30%)
  modelMarkup?: number; // additive e.g. 0.05
  providerMarkup?: number; // additive e.g. 0.05
  minSellingPriceUsd?: number; // floor price e.g. 0.05
  maxApprovedMargin?: number; // ceiling margin e.g. 0.85
  manualPriceOverrideUsd?: number | null;
}

export const DEFAULT_OPERATIONAL_RESERVE = 0.10; // 10%
export const DEFAULT_TARGET_GROSS_MARGIN = 0.30; // 30%
export const DEFAULT_MIN_SELLING_PRICE_USD = 0.05; // $0.05 / 1M tokens floor
export const DEFAULT_MAX_APPROVED_MARGIN = 0.85; // 85% ceiling

/**
 * Exchange rate configuration.
 * Market exchange rate reflects true currency conversion.
 * Display policy rate is the single billing/display default used everywhere.
 */
export const DEFAULT_USD_TO_INR_MARKET_RATE = 88.0;
export const DEFAULT_USD_TO_INR_DISPLAY_RATE = 97.0;
export const DEFAULT_USD_TO_INR_RATE = DEFAULT_USD_TO_INR_DISPLAY_RATE;

export interface TokenPriceCalculation {
  upstreamCostUsdPer1M: number;
  customerPriceUsdPer1M: number;
  customerPriceInrPaisePer1M: number;
  marginPercent: number;
  operationalReservePercent: number;
  isOverride: boolean;
  status: PricingStatus;
}

export interface ModelPricingCalculationResult {
  input: TokenPriceCalculation;
  output: TokenPriceCalculation;
  cachedInput?: TokenPriceCalculation;
  pricingStatus: PricingStatus;
  isCommerciallyAvailable: boolean;
}

/**
 * Calculate single token metric customer price independently (input, output, or cached)
 */
export function calculateTokenPrice(
  upstreamCostUsdPer1M: number | null | undefined,
  options: PricingConfigOptions = {},
  usdToInrRate = DEFAULT_USD_TO_INR_DISPLAY_RATE
): TokenPriceCalculation {
  if (
    upstreamCostUsdPer1M === null ||
    upstreamCostUsdPer1M === undefined ||
    upstreamCostUsdPer1M < 0 ||
    isNaN(upstreamCostUsdPer1M)
  ) {
    return {
      upstreamCostUsdPer1M: 0,
      customerPriceUsdPer1M: 0,
      customerPriceInrPaisePer1M: 0,
      marginPercent: 0,
      operationalReservePercent: (options.operationalReserve ?? DEFAULT_OPERATIONAL_RESERVE) * 100,
      isOverride: false,
      status: "pricing_pending",
    };
  }

  // Handle manual price override
  if (
    options.manualPriceOverrideUsd !== undefined &&
    options.manualPriceOverrideUsd !== null &&
    options.manualPriceOverrideUsd >= 0
  ) {
    const override = options.manualPriceOverrideUsd;
    const margin = override > 0 ? (override - upstreamCostUsdPer1M) / override : 0;
    const inrPaise = Math.ceil(override * usdToInrRate * 100);
    return {
      upstreamCostUsdPer1M: upstreamCostUsdPer1M,
      customerPriceUsdPer1M: Number(override.toFixed(4)),
      customerPriceInrPaisePer1M: inrPaise,
      marginPercent: Number((margin * 100).toFixed(2)),
      operationalReservePercent: (options.operationalReserve ?? DEFAULT_OPERATIONAL_RESERVE) * 100,
      isOverride: true,
      status: "approved",
    };
  }

  // If cost is 0 and no override, pending pricing unless specifically a free canonical model
  if (upstreamCostUsdPer1M === 0) {
    return {
      upstreamCostUsdPer1M: 0,
      customerPriceUsdPer1M: 0,
      customerPriceInrPaisePer1M: 0,
      marginPercent: 0,
      operationalReservePercent: (options.operationalReserve ?? DEFAULT_OPERATIONAL_RESERVE) * 100,
      isOverride: false,
      status: "pricing_pending",
    };
  }

  const opReserve = Math.max(0, options.operationalReserve ?? DEFAULT_OPERATIONAL_RESERVE);
  const targetMargin = Math.min(
    options.maxApprovedMargin ?? DEFAULT_MAX_APPROVED_MARGIN,
    Math.max(0.01, options.targetGrossMargin ?? DEFAULT_TARGET_GROSS_MARGIN)
  );
  const modelMarkup = options.modelMarkup ?? 0;
  const providerMarkup = options.providerMarkup ?? 0;
  const minFloor = options.minSellingPriceUsd ?? DEFAULT_MIN_SELLING_PRICE_USD;

  // Formula: (Upstream Cost * (1 + Operational Reserve + Markups)) / (1 - Target Gross Margin)
  const totalReserveAndMarkup = 1 + opReserve + modelMarkup + providerMarkup;
  const costWithReserve = upstreamCostUsdPer1M * totalReserveAndMarkup;
  const denominator = 1 - targetMargin;
  const rawPrice = costWithReserve / denominator;
  const finalPrice = Math.max(minFloor, rawPrice);

  const realizedMargin = (finalPrice - upstreamCostUsdPer1M) / finalPrice;
  const inrPaise = Math.ceil(finalPrice * usdToInrRate * 100);

  return {
    upstreamCostUsdPer1M: Number(upstreamCostUsdPer1M.toFixed(4)),
    customerPriceUsdPer1M: Number(finalPrice.toFixed(4)),
    customerPriceInrPaisePer1M: inrPaise,
    marginPercent: Number((realizedMargin * 100).toFixed(2)),
    operationalReservePercent: Number((opReserve * 100).toFixed(2)),
    isOverride: false,
    status: "approved",
  };
}

/**
 * Calculate full model pricing for input, output, and optional cached tokens.
 */
export function calculateModelPricing(
  costs: {
    inputUsdPer1M?: number | null;
    outputUsdPer1M?: number | null;
    cachedInputUsdPer1M?: number | null;
  },
  options: PricingConfigOptions = {},
  usdToInrRate = DEFAULT_USD_TO_INR_DISPLAY_RATE
): ModelPricingCalculationResult {
  const input = calculateTokenPrice(costs.inputUsdPer1M, options, usdToInrRate);
  const output = calculateTokenPrice(costs.outputUsdPer1M, options, usdToInrRate);
  const cachedInput = costs.cachedInputUsdPer1M !== undefined && costs.cachedInputUsdPer1M !== null
    ? calculateTokenPrice(costs.cachedInputUsdPer1M, options, usdToInrRate)
    : undefined;

  const isPending = input.status === "pricing_pending" || output.status === "pricing_pending";
  const pricingStatus: PricingStatus = isPending ? "pricing_pending" : "approved";

  return {
    input,
    output,
    cachedInput,
    pricingStatus,
    isCommerciallyAvailable: !isPending,
  };
}

// ── Strict 48-Hour Promotional Launch Policy ──
/**
 * ONLY TWO CANONICAL MODELS CAN RECEIVE THE 48-HOUR FREE PROMOTION:
 * 1. DeepSeek V4.1 Flash (`deepseek-v4.1-flash`)
 * 2. Qwen3.8-27B (`qwen3.8-27b`)
 * 
 * Every other model must have paid pricing.
 * Do not include Qwen 2.5 Coder 32B or unrelated DeepSeek checkpoints.
 */
export const PROMOTIONAL_CANONICAL_MODELS = [
  "deepseek-v4.1-flash",
  "qwen3.8-27b",
] as const;

export type PromotionalCanonicalModel = (typeof PROMOTIONAL_CANONICAL_MODELS)[number];

export const PROMOTIONAL_48H_MODELS = new Set<string>([
  "deepseek-v4.1-flash",
  "deepseek-v4.1-flash-1017",
  "qwen3.8-27b",
  "qwen/qwen3.8-27b",
]);

/**
 * Map aliases strictly to their canonical identity for promotional checks.
 * Returns the canonical ID if and only if it resolves to one of the 2 eligible canonical models.
 */
export function resolvePromotionalCanonicalId(identifier: string): PromotionalCanonicalModel | null {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  // Explicit exclusions (never promotion eligible)
  if (
    clean.includes("qwen-2.5-coder") ||
    clean.includes("qwen2.5-coder") ||
    clean.includes("deepseek-v4-pro") ||
    clean.includes("deepseek-r1") ||
    clean.includes("deepseek-v3")
  ) {
    return null;
  }

  // DeepSeek V4.1 Flash and genuine aliases
  if (
    clean === "deepseek-v4.1-flash" ||
    clean === "deepseek-v4.1-flash-1017" ||
    clean === "deepseek-ai/deepseek-v4.1-flash-1017" ||
    clean === "deepseek-ai/deepseek-v4.1-flash" ||
    clean === "prorouter/deepseek-v4.1-flash"
  ) {
    return "deepseek-v4.1-flash";
  }

  // Qwen 3.8 27B and genuine aliases
  if (
    clean === "qwen3.8-27b" ||
    clean === "qwen-3.8-27b" ||
    clean === "qwen/qwen3.8-27b" ||
    clean === "groq/qwen3.8-27b"
  ) {
    return "qwen3.8-27b";
  }

  return null;
}

export function isStrictlyPromotionalEligible(identifier: string): boolean {
  return resolvePromotionalCanonicalId(identifier) !== null;
}

export const PROMO_DURATION_MS = 48 * 60 * 60 * 1000; // 48 Hours

export interface PromotionStatusResult {
  active: boolean;
  remainingMs: number;
  remainingFormatted: string;
  expiresAt: Date | null;
  eligibleCanonicalModels: readonly string[];
}

export function checkPromotionStatus(activatedAt: Date | string | null): PromotionStatusResult {
  if (!activatedAt) {
    return {
      active: false,
      remainingMs: 0,
      remainingFormatted: "Not activated",
      expiresAt: null,
      eligibleCanonicalModels: PROMOTIONAL_CANONICAL_MODELS,
    };
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
    eligibleCanonicalModels: PROMOTIONAL_CANONICAL_MODELS,
  };
}

// Retain compatibility helper for existing imports
export function isPromotionActive(activatedAt: Date | string | null): PromotionStatusResult {
  return checkPromotionStatus(activatedAt);
}

export function isPromotionalModel(modelId: string): boolean {
  return isStrictlyPromotionalEligible(modelId);
}

// ── Formatters ──
export function formatPricingDisplay(
  inputUsd: number,
  outputUsd: number,
  currency: "USD" | "INR" = "USD",
  usdToInrRate = DEFAULT_USD_TO_INR_DISPLAY_RATE
): string {
  if (currency === "INR") {
    const inrIn = (inputUsd * usdToInrRate).toFixed(2);
    const inrOut = (outputUsd * usdToInrRate).toFixed(2);
    return `₹${inrIn} In | ₹${inrOut} Out`;
  }
  return `$${inputUsd.toFixed(2)} In | $${outputUsd.toFixed(2)} Out`;
}

export function formatCachedPricingDisplay(
  cachedUsd: number,
  currency: "USD" | "INR" = "USD",
  usdToInrRate = DEFAULT_USD_TO_INR_DISPLAY_RATE
): string {
  if (currency === "INR") {
    const inr = (cachedUsd * usdToInrRate).toFixed(2);
    return `₹${inr} Cached`;
  }
  return `$${cachedUsd.toFixed(2)} Cached`;
}
