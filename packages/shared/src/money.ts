/**
 * Money is ALWAYS stored and computed as integer minor units (paise for INR,
 * cents for USD). Floating point is never used for financial arithmetic.
 * See master build prompt §48.
 */

export type Currency = "INR" | "USD";

/** Multiplier from major units to minor units per currency. */
const MINOR_UNITS: Record<Currency, number> = { INR: 100, USD: 100 };

/** Default platform USD to INR exchange rate */
export const DEFAULT_USD_TO_INR_RATE = 85.0;

/** Get the configured USD to INR exchange rate */
export function getUsdToInrRate(): number {
  const envVal = typeof process !== "undefined" && process.env ? process.env.USD_TO_INR_RATE : undefined;
  if (envVal) {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_USD_TO_INR_RATE;
}

/** Convert USD micro-dollars (1 USD = 1,000,000 micro-dollars) to INR paise (integer) */
export function microUsdToPaise(microUsd: number, usdToInrRate = getUsdToInrRate()): number {
  if (microUsd <= 0) return 0;
  return Math.ceil((microUsd * usdToInrRate) / 10_000);
}

/** Convert INR paise (integer) to USD micro-dollars (integer) */
export function paiseToMicroUsd(paise: number, usdToInrRate = getUsdToInrRate()): number {
  if (paise <= 0) return 0;
  return Math.round((paise * 10_000) / usdToInrRate);
}

/** Convert USD dollars (decimal) to INR paise (integer) */
export function usdToPaise(usd: number, usdToInrRate = getUsdToInrRate()): number {
  if (usd <= 0) return 0;
  return Math.ceil(usd * usdToInrRate * 100);
}

/** Convert INR paise to USD dollars (decimal rounded to 4 decimals) */
export function paiseToUsd(paise: number, usdToInrRate = getUsdToInrRate()): number {
  if (paise <= 0) return 0;
  return Number(((paise / 100) / usdToInrRate).toFixed(4));
}

/** Dual currency pricing representation */
export interface DualCurrencyPricing {
  inr: {
    prompt: number; // paise per 1M
    completion: number; // paise per 1M
    cachedPrompt?: number;
  };
  usd: {
    prompt: number; // USD per 1M (decimal)
    completion: number; // USD per 1M (decimal)
    cachedPrompt?: number;
  };
  freeDailyTokens?: number;
}

/** Convert a decimal amount in major units to integer minor units. */
export function toMinor(amount: number, currency: Currency = "INR"): number {
  const mult = MINOR_UNITS[currency];
  // Scale through 15 significant digits so values like 1.005 don't collapse
  // to 100.4999… before rounding, then round half away from zero.
  const sign = amount < 0 ? -1 : 1;
  const scaled = Number((Math.abs(amount) * mult).toPrecision(15));
  return sign * Math.round(scaled);
}

/** Convert integer minor units to a decimal major-unit number (display only). */
export function toMajor(minor: number, currency: Currency = "INR"): number {
  return minor / MINOR_UNITS[currency];
}

/** Format integer minor units as a currency string, e.g. 124550 -> "₹1,245.50" */
export function formatMoney(
  minor: number,
  currency: Currency = "INR",
  opts: { compact?: boolean } = {},
): string {
  const symbol = currency === "INR" ? "₹" : "$";
  const major = toMajor(minor, currency);
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2,
  }).format(major);
  return `${symbol}${formatted}`;
}

/** Format integer minor units compactly with Cr/L/K (INR) or B/M/K (USD). */
export function formatCompactMoney(
  minor: number,
  currency: Currency = "INR",
): string {
  const symbol = currency === "INR" ? "₹" : "$";
  const major = toMajor(minor, currency);
  const abs = Math.abs(major);
  if (currency === "INR") {
    if (abs >= 10_000_000) return `${symbol}${(major / 10_000_000).toFixed(2)}Cr`;
    if (abs >= 100_000) return `${symbol}${(major / 100_000).toFixed(2)}L`;
    if (abs >= 1_000) return `${symbol}${(major / 1_000).toFixed(1)}K`;
  } else {
    if (abs >= 1_000_000_000) return `${symbol}${(major / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `${symbol}${(major / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `${symbol}${(major / 1_000).toFixed(1)}K`;
  }
  return formatMoney(minor, currency);
}

/**
 * Compute the cost of a token usage against per-1M-token prices.
 * prices are integer minor units per 1,000,000 tokens.
 * Result is rounded up to the nearest minor unit so we never under-charge.
 */
export function tokenCost(
  tokens: number,
  pricePerMillionMinor: number,
): number {
  if (tokens <= 0 || pricePerMillionMinor <= 0) return 0;
  return Math.ceil((tokens * pricePerMillionMinor) / 1_000_000);
}

/** Total request cost = input + output + optional platform fee. */
export function requestCost(params: {
  inputTokens: number;
  outputTokens: number;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  platformFeePercent?: number;
}): number {
  const base =
    tokenCost(params.inputTokens, params.inputPricePerMillion) +
    tokenCost(params.outputTokens, params.outputPricePerMillion);
  const feePercent = params.platformFeePercent ?? 0;
  if (feePercent <= 0) return base;
  return base + Math.ceil((base * feePercent) / 100);
}

/** Convert USD minor units to INR minor units using a configurable rate. */
export function usdMinorToInrMinor(
  usdMinor: number,
  usdToInrRate: number,
): number {
  // rate is major-units (e.g. 97 = ₹97 per $1). Both sides are minor units,
  // so the multiplier is the same.
  return Math.ceil(usdMinor * usdToInrRate);
}

/**
 * Convert a retail USD-cents price (e.g. per 1M tokens) to INR paise.
 * `usdToInrRate` is major units (97 = ₹97 per $1); both sides are minor
 * units, so the multiplier is identical. Rounds up to avoid under-charging.
 */
export function usdCentsToPaise(usdCents: number, usdToInrRate: number): number {
  if (usdCents <= 0) return 0;
  return Math.ceil(usdCents * usdToInrRate);
}

/** Parse a user-entered decimal string ("499.50") into integer minor units. */
export function parseAmountToMinor(input: string, currency: Currency = "INR"): number {
  const cleaned = input.trim().replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid amount: ${input}`);
  }
  return toMinor(parseFloat(cleaned), currency);
}