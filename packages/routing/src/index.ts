/**
 * ProRouter — routing engine (§11, §66).
 *
 * The engine is a pure function over candidate data so it is deterministic,
 * testable and observable. Database hydration happens in the API layer.
 */

export interface RouteCandidate {
  linkId: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  /** Upstream model id for this provider. */
  upstreamModelId: string;
  /** Lower = preferred. */
  linkPriority: number;
  providerPriority: number;
  providerStatus: "active" | "degraded" | "disabled" | "unknown";
  linkStatus: "active" | "degraded" | "disabled";
  timeoutMs: number;
  retryCount: number;
  health: {
    available: boolean;
    latencyMs: number | null;
    successRateBp: number;
    checkedAt: Date | null;
  } | null;
  /** Cost in integer paise per 1M tokens (0 for free models). */
  inputPerMillion: number;
  outputPerMillion: number;
  isFree: boolean;
}

export interface RouteOptions {
  /** User's plan slug (free/boost/ultra) — affects queue priority weighting. */
  planSlug: string;
  /** Enable automatic fallback chain (feature flag provider_fallback). */
  fallbackEnabled: boolean;
  /** Maximum acceptable input price per 1M tokens (paise), if budgeted. */
  maxInputCostPerMillion?: number;
  /** Prefer free candidates (user has free quota available). */
  preferFree?: boolean;
}

export interface RouteScore {
  candidate: RouteCandidate;
  score: number;
  reasons: string[];
}

export interface RouteDecision {
  primary: RouteCandidate;
  fallbackChain: RouteCandidate[];
  scores: RouteScore[];
  /** Human-readable trace for the inspector (§36). */
  trace: string[];
}

const HEALTHY_STALE_MS = 15 * 60 * 1000;

function isUsable(c: RouteCandidate): boolean {
  if (c.linkStatus === "disabled" || c.providerStatus === "disabled") return false;
  if (c.linkStatus === "degraded" || c.providerStatus === "degraded") return false;
  if (c.providerStatus === "unknown") return false;
  if (c.health && !c.health.available) return false;
  if (c.health) {
    const age = Date.now() - new Date(c.health.checkedAt ?? 0).getTime();
    if (age > HEALTHY_STALE_MS && !c.health.available) return false;
  }
  return true;
}

function score(c: RouteCandidate, opts: RouteOptions): RouteScore {
  const reasons: string[] = [];
  let s = 1000;

  const prio = Math.min(c.linkPriority, c.providerPriority);
  s -= prio * 2;
  reasons.push(`priority ${prio}`);

  if (c.health) {
    s += Math.round(c.health.successRateBp / 100);
    if (c.health.latencyMs !== null) {
      const latencyPenalty = Math.min(200, Math.round(c.health.latencyMs / 50));
      s -= latencyPenalty;
      reasons.push(`latency ${c.health.latencyMs}ms`);
    }
    reasons.push(`success ${(c.health.successRateBp / 100).toFixed(1)}%`);
  }
  if (c.providerStatus === "active") {
    s += 50;
    reasons.push("healthy");
  } else if (c.providerStatus === "unknown") {
    s -= 500;
    reasons.push("health unknown");
  }

  if (!c.isFree && opts.maxInputCostPerMillion !== undefined) {
    if (c.inputPerMillion > opts.maxInputCostPerMillion) {
      s -= 10_000;
      reasons.push("over budget");
    }
  }
  if (c.isFree && opts.preferFree) {
    s += 200;
    reasons.push("free quota eligible");
  }

  if (opts.planSlug === "ultra") s += 10;
  if (opts.planSlug === "free") s -= 5;

  return { candidate: c, score: s, reasons };
}

/**
 * Route a request: pick the best candidate and build the fallback chain.
 * Deterministic: identical inputs → identical outputs (ties broken by
 * provider priority, then provider slug).
 */
export function routeRequest(candidates: RouteCandidate[], opts: RouteOptions): RouteDecision | null {
  const trace: string[] = [];
  trace.push(`candidates=${candidates.length}`);

  const usable = candidates.filter(isUsable);
  trace.push(`usable=${usable.length}`);
  if (usable.length === 0) return null;

  const budgeted = usable.filter(
    (c) => opts.maxInputCostPerMillion === undefined || c.isFree || c.inputPerMillion <= opts.maxInputCostPerMillion,
  );
  trace.push(`within_budget=${budgeted.length}`);

  const pool = budgeted.length > 0 ? budgeted : usable;

  const scored = pool
    .map((c) => score(c, opts))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.candidate.providerPriority !== b.candidate.providerPriority) return a.candidate.providerPriority - b.candidate.providerPriority;
      return a.candidate.providerSlug.localeCompare(b.candidate.providerSlug);
    });

  const primary = scored[0]!;
  trace.push(`selected=${primary.candidate.providerSlug} score=${primary.score}`);

  const fallbackChain = opts.fallbackEnabled ? scored.slice(1).map((s) => s.candidate) : [];
  if (opts.fallbackEnabled) trace.push(`fallbacks=${fallbackChain.length}`);
  else trace.push("fallback=disabled");

  return { primary: primary.candidate, fallbackChain, scores: scored, trace };
}

/**
 * Auto model selection (§11): choose a model for "uno/auto" based on what the
 * user asked for. `preferFree` is set when the user has free quota left.
 */
export interface AutoModelOption {
  slug: string;
  name: string;
  isFree: boolean;
  rank: number;
  popularity: number;
  reasoning: boolean;
  toolCalls: boolean;
  available: boolean;
}

export function selectAutoModel(
  options: AutoModelOption[],
  hints: { wantsCoding?: boolean; wantsReasoning?: boolean; preferFree?: boolean },
): AutoModelOption | null {
  const available = options.filter((o) => o.available);
  if (available.length === 0) return null;
  const scored = available
    .map((o) => {
      let s = 1000 - o.rank * 10 + Math.min(100, o.popularity / 100);
      if (hints.preferFree && o.isFree) s += 500;
      if (hints.wantsCoding && o.toolCalls) s += 100;
      if (hints.wantsReasoning && o.reasoning) s += 100;
      return { o, s };
    })
    .sort((a, b) => b.s - a.s || a.o.slug.localeCompare(b.o.slug));
  return scored[0]?.o ?? null;
}