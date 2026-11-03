import type { BackendModel, CapabilityProfile, FailureContext, FrontendModelProfile } from "./types.js";
import { BackendModelRegistry } from "./backend-registry.js";
import { CapabilityMatcher } from "./capability-matcher.js";
import { ProviderHealthMonitor } from "./health-monitor.js";

export type FallbackAction = "retry" | "next_provider" | "abort_error" | "preserve_refusal";

export interface FallbackDecision {
  action: FallbackAction;
  nextBackend?: BackendModel;
  reason: string;
}

/**
 * Fallback Manager (§6, §9).
 * Manages provider transitions, ensures zero self-loops, and preserves capability constraints.
 */
export class FallbackManager {
  /**
   * Determine the fallback action for a specific failure context.
   */
  public static handleFailure(
    failure: FailureContext,
    profile: FrontendModelProfile,
    fallbackChain: BackendModel[],
    chainIndex: number
  ): FallbackDecision {
    // 1. Streaming Integrity Rule (§6):
    // If output has already been streamed to the user (tokensSent > 0), do NOT attempt fallback
    // to avoid splicing two unrelated model outputs together!
    if (failure.isStreaming && failure.tokensSent > 0) {
      return {
        action: "abort_error",
        reason: "Streaming session disconnected after tokens were emitted. Aborting to maintain stream integrity.",
      };
    }

    // 2. Safety Refusal Rule (§6):
    // Never bypass a safety refusal by falling back to another model
    const msg = failure.message.toLowerCase();
    if (msg.includes("safety") || msg.includes("policy violation") || msg.includes("content moderation")) {
      return {
        action: "preserve_refusal",
        reason: "Request triggered upstream safety policy; preserving response without fallback.",
      };
    }

    // 3. Invalid Request Rule (§6):
    // 400 Bad Request caused by client syntax should not be blindly retried
    if (failure.status === 400 && (msg.includes("invalid json") || msg.includes("malformed"))) {
      return {
        action: "abort_error",
        reason: `Invalid client request syntax: ${failure.message}`,
      };
    }

    // 4. Record health cooldown for 429 or 5xx
    const isRateLimit = failure.status === 429;
    const cooldownMs = isRateLimit ? 15000 : 45000;
    ProviderHealthMonitor.recordFailure(
      failure.backendId,
      failure.provider,
      failure.message,
      failure.status,
      cooldownMs
    );

    // 5. Pick next candidate from fallback chain
    for (let i = chainIndex + 1; i < fallbackChain.length; i++) {
      const candidate = fallbackChain[i]!;

      // Disallow self-fallback loop: cannot be same backend ID as the one that just failed
      if (candidate.id === failure.backendId) continue;

      // Disallow duplicate upstream endpoint
      if (candidate.upstreamModelId === failure.backendId) continue;

      // Verify health
      if (!ProviderHealthMonitor.isAvailable(candidate.id, candidate.provider)) {
        continue;
      }

      // Verify capability preservation
      const match = CapabilityMatcher.match(candidate, profile, {});
      if (!match.isCompatible) {
        continue;
      }

      return {
        action: "next_provider",
        nextBackend: candidate,
        reason: `Fell back from ${failure.backendId} (${failure.status}) to ${candidate.id}.`,
      };
    }

    // No eligible backends remaining in fallback chain
    return {
      action: "abort_error",
      reason: `All eligible backend fallbacks exhausted for profile ${profile.id}. Last error: ${failure.message}`,
    };
  }

  /**
   * Build an ordered, loop-free fallback chain for a profile.
   */
  public static buildChain(
    primary: BackendModel,
    profile: FrontendModelProfile
  ): BackendModel[] {
    const chain: BackendModel[] = [primary];
    const seenUpstreams = new Set<string>([primary.upstreamModelId]);
    const seenProviders = new Set<string>([primary.provider]);

    // 1. Add secondary backend if configured and distinct
    if (profile.routingPolicy.secondaryBackend) {
      const secondary = BackendModelRegistry.get(profile.routingPolicy.secondaryBackend);
      if (
        secondary &&
        secondary.id !== primary.id &&
        !seenUpstreams.has(secondary.upstreamModelId)
      ) {
        chain.push(secondary);
        seenUpstreams.add(secondary.upstreamModelId);
        seenProviders.add(secondary.provider);
      }
    }

    // 2. Add final fallback gateway backend
    const finalFallback = BackendModelRegistry.get(profile.routingPolicy.finalFallback) ||
      BackendModelRegistry.get("prorouter/deepseek-v4.1-flash");

    if (
      finalFallback &&
      !chain.some((b) => b.id === finalFallback.id) &&
      !seenUpstreams.has(finalFallback.upstreamModelId)
    ) {
      chain.push(finalFallback);
      seenUpstreams.add(finalFallback.upstreamModelId);
    }

    return chain;
  }
}
