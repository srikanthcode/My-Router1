import { describe, expect, it } from "vitest";
import { routeRequest, selectAutoModel, type RouteCandidate } from "@uno/routing";

function cand(over: Partial<RouteCandidate>): RouteCandidate {
  return {
    linkId: "l1",
    providerId: "p1",
    providerSlug: "provider-a",
    providerName: "Provider A",
    upstreamModelId: "upstream-a",
    linkPriority: 100,
    providerPriority: 100,
    providerStatus: "active",
    linkStatus: "active",
    timeoutMs: 60000,
    retryCount: 2,
    health: { available: true, latencyMs: 200, successRateBp: 9900, checkedAt: new Date() },
    inputPerMillion: 1000,
    outputPerMillion: 2000,
    isFree: false,
    ...over,
  };
}

describe("routing engine (§11)", () => {
  it("selects the healthy, highest-priority candidate deterministically", () => {
    const a = cand({ providerSlug: "a", providerPriority: 10 });
    const b = cand({ providerSlug: "b", providerPriority: 50 });
    const decision = routeRequest([b, a], { planSlug: "free", fallbackEnabled: true });
    expect(decision?.primary.providerSlug).toBe("a");
    expect(decision?.fallbackChain.map((c) => c.providerSlug)).toEqual(["b"]);
  });

  it("excludes unhealthy, unknown and disabled providers", () => {
    const healthy = cand({ providerSlug: "healthy" });
    const down = cand({ providerSlug: "down", health: { available: false, latencyMs: null, successRateBp: 0, checkedAt: new Date() } });
    const unknown = cand({ providerSlug: "unknown", providerStatus: "unknown", health: null });
    const disabled = cand({ providerSlug: "disabled", linkStatus: "disabled" });
    const decision = routeRequest([down, unknown, disabled, healthy], { planSlug: "free", fallbackEnabled: true });
    expect(decision?.primary.providerSlug).toBe("healthy");
    expect(decision?.fallbackChain).toHaveLength(0);
  });

  it("returns null when no candidate is usable", () => {
    const bad = cand({ providerStatus: "unknown", health: null });
    expect(routeRequest([bad], { planSlug: "free", fallbackEnabled: true })).toBeNull();
  });

  it("respects fallback flag", () => {
    const a = cand({ providerSlug: "a" });
    const b = cand({ providerSlug: "b" });
    const off = routeRequest([a, b], { planSlug: "free", fallbackEnabled: false });
    expect(off?.fallbackChain).toHaveLength(0);
    const on = routeRequest([a, b], { planSlug: "free", fallbackEnabled: true });
    expect(on?.fallbackChain).toHaveLength(1);
  });

  it("prefers in-budget candidates and penalises over-budget ones", () => {
    const cheap = cand({ providerSlug: "cheap", inputPerMillion: 500 });
    const pricey = cand({ providerSlug: "pricey", inputPerMillion: 90000, linkPriority: 1 });
    const decision = routeRequest([pricey, cheap], { planSlug: "free", fallbackEnabled: false, maxInputCostPerMillion: 10000 });
    expect(decision?.primary.providerSlug).toBe("cheap");
  });
});

describe("auto model selection (§11)", () => {
  const options = [
    { slug: "free-chat", name: "Free Chat", isFree: true, rank: 5, popularity: 500, reasoning: false, toolCalls: false, available: true },
    { slug: "coder", name: "Coder", isFree: false, rank: 2, popularity: 900, reasoning: false, toolCalls: true, available: true },
    { slug: "thinker", name: "Thinker", isFree: false, rank: 1, popularity: 800, reasoning: true, toolCalls: false, available: true },
    { slug: "offline", name: "Offline", isFree: false, rank: 0, popularity: 1000, reasoning: true, toolCalls: true, available: false },
  ];

  it("never selects an unavailable model", () => {
    const pick = selectAutoModel(options, { preferFree: false });
    expect(pick?.slug).not.toBe("offline");
  });

  it("prefers free models when hinted", () => {
    const pick = selectAutoModel(options, { preferFree: true });
    expect(pick?.slug).toBe("free-chat");
  });

  it("honours coding hint", () => {
    const pick = selectAutoModel(options, { wantsCoding: true, preferFree: false });
    expect(pick?.slug).toBe("coder");
  });

  it("returns null when nothing is available", () => {
    expect(selectAutoModel(options.map((o) => ({ ...o, available: false })), {})).toBeNull();
  });
});