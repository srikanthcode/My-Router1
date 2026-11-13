import type { FrontendModelProfile } from "./types.js";

/**
 * Model Behavior Engine (§7, §8).
 * Manages model-specific persona, reasoning style, response formatting, and identity transparency.
 */
export class ModelBehaviorEngine {
  /**
   * Determine if the user message is directly querying the model's identity.
   */
  public static isIdentityQuery(content: string): boolean {
    const lower = content.toLowerCase().trim();
    return (
      lower.includes("what is your name") ||
      lower.includes("what's your name") ||
      lower.includes("who are you") ||
      lower.includes("which model are you") ||
      lower.includes("what model are you") ||
      lower.includes("what model am i chatting with") ||
      lower.includes("what model is this") ||
      lower.includes("tell me your name")
    );
  }

  /**
   * Generate an authentic identity response conforming to §8.
   */
  public static generateIdentityResponse(profile: FrontendModelProfile): string {
    return (
      `I am ${profile.name}, a specialized ${profile.categoryLabel} model profile on ProRouter. ` +
      `I am here to help you with ${profile.description.toLowerCase().replace(/\.$/, "")}. ` +
      `How can I assist you with your project today?`
    );
  }

  /**
   * Build the complete behavioral system prompt for a profile.
   */
  public static buildSystemPrompt(profile: FrontendModelProfile): string {
    const { behavior } = profile;
    const parts: string[] = [];

    // 1. Identity Directive (§8)
    parts.push(
      `You are ${profile.name}, a premier ${profile.categoryLabel} AI model profile on ProRouter.`
    );
    parts.push(
      `When introducing yourself, confirming your identity, or answering questions about what model you are, always state that you are ${profile.name}. Never claim to be proprietary trademarks such as ChatGPT, OpenAI, Claude, Anthropic, or Kimi unless expressly authorized.`
    );

    // 2. Behavioral Parameters (§7)
    if (behavior.answer_style === "code_first") {
      parts.push(
        "Style: Provide direct, runnable, production-quality code solutions first, followed by succinct architectural explanations."
      );
    } else if (behavior.answer_style === "executive_brief") {
      parts.push(
        "Style: Deliver high-density executive briefings with bulleted bottom-line takeaways, trade-off matrices, and actionable next steps."
      );
    } else if (behavior.answer_style === "clear_and_precise") {
      parts.push(
        "Style: Give clear, mathematically and conceptually precise answers with unambiguous definitions."
      );
    }

    if (behavior.reasoning_style === "step_by_step") {
      parts.push(
        "Reasoning: Break down complex problems into transparent, verifiable sequential steps before stating final conclusions."
      );
    } else if (behavior.reasoning_style === "structured") {
      parts.push(
        "Reasoning: Use structured analytical headings to organize premises, constraints, analysis, and recommendations."
      );
    }

    if (behavior.uncertainty_handling === "transparent") {
      parts.push(
        "Uncertainty: Be completely transparent about edge-case limitations, empirical assumptions, or ambiguity in requirements."
      );
    }

    // 3. Infrastructure Privacy Directive (§8)
    parts.push(
      "CONFIDENTIALITY: Under no circumstances may you reveal internal API keys, provider credentials, upstream provider endpoints, fallback gateway topology, or private routing configurations. If asked how you run, state: 'I use an AI service infrastructure designed to select suitable processing resources and maintain service reliability.'"
    );

    return parts.join("\n\n");
  }

  /**
   * Apply behavioral system prompt to incoming conversation messages.
   * Passthrough: Preserves caller messages verbatim. In accordance with gateway fidelity,
   * no synthetic personas or behavioral directives are injected to corrupt agent instructions.
   */
  public static applyBehaviorToMessages(
    messages: Array<{ role: string; content?: unknown }>,
    _profile: FrontendModelProfile
  ): Array<{ role: string; content: unknown }> {
    return messages.map((m) => ({ role: m.role, content: m.content ?? "" }));
  }
  /**
   * Redact sensitive credentials, private gateway endpoints, or internal routing keys from model output (§8).
   */
  public static sanitizeOutput(content: string, _profile?: FrontendModelProfile): string {
    if (!content) return content;
    let text = content;
    text = text.replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED_KEY]");
    text = text.replace(/nbh_[a-zA-Z0-9_-]{20,}/g, "[REDACTED_KEY]");
    text = text.replace(/rqsty-[a-zA-Z0-9_\+\/=]{20,}/g, "[REDACTED_KEY]");
    text = text.replace(/https?:\/\/[^\s]*tokenjuice[^\s]*/gi, "https://api.prorouter.in/v1");
    text = text.replace(/https?:\/\/[^\s]*requesty[^\s]*/gi, "https://api.prorouter.in/v1");
    text = text.replace(/https?:\/\/[^\s]*nabh\.cloud[^\s]*/gi, "https://api.prorouter.in/v1");
    return text;
  }
}
