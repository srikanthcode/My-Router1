import { describe, expect, it } from "vitest";
import { formatMoney, parseAmountToMinor, requestCost, toMinor, tokenCost, usdMinorToInrMinor } from "@uno/shared";

describe("money (integer paise, §48)", () => {
  it("converts major units to minor units without float drift", () => {
    expect(toMinor(499)).toBe(49900);
    expect(toMinor(0.1)).toBe(10);
    expect(toMinor(1.005)).toBe(101); // half-away-from-zero, not banker's
    expect(toMinor(19.99)).toBe(1999);
  });

  it("computes token cost by rounding up to the nearest paisa", () => {
    // 1M tokens at ₹50/1M = ₹50 = 5000 paise
    expect(tokenCost(1_000_000, 5000)).toBe(5000);
    // 1 token must not be free (rounds up)
    expect(tokenCost(1, 5000)).toBe(1);
    expect(tokenCost(0, 5000)).toBe(0);
  });

  it("sums input + output + platform fee", () => {
    const cost = requestCost({ inputTokens: 1000, outputTokens: 500, inputPricePerMillion: 2000, outputPricePerMillion: 4000 });
    // input: ceil(1000*2000/1M)=2, output: ceil(500*4000/1M)=2 → 4
    expect(cost).toBe(4);
    const withFee = requestCost({ inputTokens: 1000, outputTokens: 500, inputPricePerMillion: 2000, outputPricePerMillion: 4000, platformFeePercent: 10 });
    expect(withFee).toBe(5);
  });

  it("formats INR", () => {
    expect(formatMoney(124550)).toBe("₹1,245.50");
    expect(formatMoney(49900)).toBe("₹499.00");
  });

  it("parses user input to paise", () => {
    expect(parseAmountToMinor("499")).toBe(49900);
    expect(parseAmountToMinor("1,050.50")).toBe(105050);
    expect(() => parseAmountToMinor("abc")).toThrow();
  });

  it("converts USD to INR using configurable rate", () => {
    expect(usdMinorToInrMinor(100, 97)).toBe(9700); // $1.00 → ₹97.00
    expect(usdMinorToInrMinor(100, 90)).toBe(9000);
  });
});