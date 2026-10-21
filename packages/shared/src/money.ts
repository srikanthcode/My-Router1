/**
 * Money is ALWAYS stored and computed as integer minor units (paise for INR,
 * cents for USD). Floating point is never used for financial arithmetic.
 * See master build prompt §48.
 */

export type Currency = "INR" | "USD";

/** Multiplier from major units to minor units per currency. */
const MINOR_UNITS: Record<Currency, number> = { INR: 100, USD: 100 };

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

/** Parse a user-entered decimal string ("499.50") into integer minor units. */
export function parseAmountToMinor(input: string, currency: Currency = "INR"): number {
  const cleaned = input.trim().replace(/[,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid amount: ${input}`);
  }
  return toMinor(parseFloat(cleaned), currency);
}