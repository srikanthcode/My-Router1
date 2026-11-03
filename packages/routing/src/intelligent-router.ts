import type {
  BackendModel,
  FrontendModelProfile,
  IntelligentRouteDecision,
  UserRequestRequirements,
} from "./types.js";
import { BackendModelRegistry } from "./backend-registry.js";
import { CapabilityMatcher } from "./capability-matcher.js";
import { FallbackManager } from "./fallback-manager.js";
import { ModelBehaviorEngine } from "./behavior-engine.js";
import { ModelProfileRegistry } from "./profile-registry.js";
import { ProviderHealthMonitor } from "./health-monitor.js";

/**
 * Intelligent Model Router (§5, §6, §9).
 * Central decision engine selecting primary, secondary, and final fallback routes based on capabilities and health.
 */
export class IntelligentModelRouter {
  private static totalRouted = 0;
  private static fallbackTriggered = 0;

  public static getMetrics() {
    return {
      totalRouted: this.totalRouted,
      fallbackTriggered: this.fallbackTriggered,
      healthReport: ProviderHealthMonitor.getReport(),
      totalProfiles: ModelProfileRegistry.count(),
    };
  }
  /**
   * Route an incoming user request to the optimal backend and fallback chain.
   */
  public static route(
    // track routing count
    
    requestedModel: string,
    req: UserRequestRequirements = {}
  ): IntelligentRouteDecision {
    this.totalRouted++;
    const trace: string[] = [];
    const cleanId = requestedModel.toLowerCase().trim();
    trace.push(`incoming_model=${requestedModel}`);

    // 1. Resolve frontend profile
    let profile = ModelProfileRegistry.get(cleanId);

    // Fallback resolution for model slugs or aliases
    if (!profile) {
      // Check if it's an existing backend model requested directly
      const directBackend = BackendModelRegistry.get(cleanId);
      if (directBackend) {
        trace.push(`direct_backend_match=${directBackend.id}`);
        return {
          profileId: directBackend.id,
          profileName: directBackend.name,
          primary: directBackend,
          fallbackChain: [directBackend],
          behavior: {
            reasoning_style: "structured",
            answer_style: "clear_and_precise",
            verbosity: "adaptive",
            instruction_following: "strict",
            tool_usage: "when_needed",
            formatting: "chat_assistant",
            uncertainty_handling: "transparent",
          },
          trace,
        };
      }

      // Default to standard general-purpose profile
      profile = ModelProfileRegistry.get("deepseek-v4.1-flash") || ModelProfileRegistry.getAll()[0]!;
      trace.push(`profile_fallback_to_default=${profile.id}`);
    } else {
      trace.push(`resolved_profile=${profile.id} category=${profile.category}`);
    }

    // 2. Select primary backend
    let primaryBackend = BackendModelRegistry.get(profile.routingPolicy.primaryBackend);

    // Check if primary backend is available and compatible with request requirements
    if (primaryBackend) {
      const match = CapabilityMatcher.match(primaryBackend, profile, req);
      const isHealthy = ProviderHealthMonitor.isAvailable(primaryBackend.id, primaryBackend.provider);

      if (!match.isCompatible || !isHealthy) {
        trace.push(
          `primary_${primaryBackend.id}_ineligible: compatible=${match.isCompatible} healthy=${isHealthy}`
        );
        primaryBackend = undefined;
      }
    }

    // 3. If primary is unavailable or incompatible, find best compatible alternative
    if (!primaryBackend) {
      const compatibleBackends = BackendModelRegistry.findCompatible(
        profile.routingPolicy.requiredCapabilities
      );

      // Score candidates
      const scored = compatibleBackends
        .map((b) => ({
          backend: b,
          match: CapabilityMatcher.match(b, profile, req),
        }))
        .filter((item) => item.match.isCompatible)
        .sort((a, b) => b.match.score - a.match.score);

      if (scored.length > 0) {
        primaryBackend = scored[0]!.backend;
        trace.push(`fallback_primary_selected=${primaryBackend.id} score=${scored[0]!.match.score}`);
      } else {
        // Absolute fallback to primary gateway
        primaryBackend = BackendModelRegistry.get("prorouter/deepseek-v4.1-flash")!;
        trace.push("ultimate_gateway_fallback_selected");
      }
    } else {
      trace.push(`primary_selected=${primaryBackend.id}`);
    }

    // 4. Build loop-free fallback chain
    const fallbackChain = FallbackManager.buildChain(primaryBackend, profile);
    trace.push(`fallback_chain_length=${fallbackChain.length}`);

    return {
      profileId: profile.id,
      profileName: profile.name,
      primary: primaryBackend,
      fallbackChain,
      behavior: profile.behavior,
      trace,
    };
  }
}
