import type {
  BackendModel,
  CapabilityProfile,
  FrontendModelProfile,
  UserRequestRequirements,
} from "./types.js";

export interface CapabilityMatchResult {
  isCompatible: boolean;
  score: number;
  matchedCapabilities: (keyof CapabilityProfile)[];
  missingCapabilities: (keyof CapabilityProfile)[];
  reasons: string[];
}

/**
 * Capability Matcher (§5, §9).
 * Evaluates whether a backend model satisfies the profile and request requirements.
 */
export class CapabilityMatcher {
  /**
   * Extract user requirements from request payload (messages, tools, etc.)
   */
  public static extractRequirements(payload: {
    messages?: Array<{ role: string; content?: unknown }>;
    tools?: unknown[];
    stream?: boolean;
    model?: string;
  }): UserRequestRequirements {
    const req: UserRequestRequirements = {
      hasImages: false,
      requiresTools: Array.isArray(payload.tools) && payload.tools.length > 0,
      requiresReasoning: false,
      requiresCoding: false,
      requiresTamil: false,
      requiresMultilingual: false,
      streaming: payload.stream === true,
    };

    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    let totalText = "";

    for (const m of messages) {
      if (typeof m.content === "string") {
        totalText += " " + m.content;
      } else if (Array.isArray(m.content)) {
        for (const part of m.content) {
          if (part && typeof part === "object") {
            const p = part as Record<string, unknown>;
            if (p.type === "image_url" || p.image_url || p.type === "image") {
              req.hasImages = true;
            }
            if (typeof p.text === "string") {
              totalText += " " + p.text;
            }
          }
        }
      }
    }

    // Tamil Unicode range: U+0B80 - U+0BFF
    if (this.detectTamil(totalText)) {
      req.requiresTamil = true;
      req.requiresMultilingual = true;
    }

    const lower = totalText.toLowerCase();
    if (
      lower.includes("```") ||
      lower.includes("function") ||
      lower.includes("def ") ||
      lower.includes("class ") ||
      lower.includes("typescript") ||
      lower.includes("python") ||
      lower.includes("sql")
    ) {
      req.requiresCoding = true;
    }

    if (
      lower.includes("step by step") ||
      lower.includes("prove that") ||
      lower.includes("derive ") ||
      lower.includes("calculate") ||
      lower.includes("explain why")
    ) {
      req.requiresReasoning = true;
    }

    return req;
  }

  /**
   * Detect presence of Tamil script (Unicode range U+0B80 - U+0BFF).
   */
  public static detectTamil(text: string): boolean {
    return /[\u0B80-\u0BFF]/.test(text);
  }

  /**
   * Match a candidate backend against profile requirements and user request requirements.
   */
  public static match(
    backend: BackendModel,
    profile: FrontendModelProfile,
    req: UserRequestRequirements
  ): CapabilityMatchResult {
    const matched: (keyof CapabilityProfile)[][] = [];
    const missing: (keyof CapabilityProfile)[] = [];
    const reasons: string[] = [];
    let score = 1000;

    // 1. Strict Modality Check: Vision
    if (req.hasImages || profile.capabilities.vision === "supported") {
      if (backend.capabilities.vision !== "supported") {
        return {
          isCompatible: false,
          score: -10000,
          matchedCapabilities: [],
          missingCapabilities: ["vision"],
          reasons: ["Backend lacks required vision capability for image processing."],
        };
      }
      score += 200;
      reasons.push("vision verified");
    }

    // 2. Strict Tool Calling Check
    if (req.requiresTools) {
      if (backend.capabilities.tool_calling !== "supported") {
        return {
          isCompatible: false,
          score: -10000,
          matchedCapabilities: [],
          missingCapabilities: ["tool_calling"],
          reasons: ["Backend does not support structured tool calling."],
        };
      }
      score += 150;
      reasons.push("tool calling verified");
    }

    // 3. Strict Tamil / Multilingual Check
    if (req.requiresTamil) {
      if (backend.capabilities.tamil_language === "supported") {
        score += 300;
        reasons.push("native Tamil verified");
      } else if (backend.capabilities.multilingual === "supported") {
        score += 100;
        reasons.push("multilingual compatible for Tamil");
      } else {
        return {
          isCompatible: false,
          score: -5000,
          matchedCapabilities: [],
          missingCapabilities: ["tamil_language"],
          reasons: ["Backend does not support Tamil language comprehension."],
        };
      }
    }

    // 4. Required capabilities specified by profile routing policy
    for (const cap of profile.routingPolicy.requiredCapabilities) {
      const capStatus = backend.capabilities[cap];
      if (capStatus === "unsupported") {
        return {
          isCompatible: false,
          score: -10000,
          matchedCapabilities: [],
          missingCapabilities: [cap],
          reasons: [`Backend is marked unsupported for required capability: ${String(cap)}`],
        };
      } else if (capStatus === "supported") {
        score += 50;
      }
    }

    // 5. Backend health and latency scoring
    if (backend.healthStatus === "degraded") {
      score -= 300;
      reasons.push("provider health degraded");
    } else if (backend.healthStatus === "disabled") {
      return {
        isCompatible: false,
        score: -20000,
        matchedCapabilities: [],
        missingCapabilities: [],
        reasons: ["Backend is disabled by health monitor."],
      };
    }

    return {
      isCompatible: true,
      score,
      matchedCapabilities: profile.routingPolicy.requiredCapabilities,
      missingCapabilities: [],
      reasons,
    };
  }
}
