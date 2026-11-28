import type { FrontendModelProfile } from "./types.js";

/**
 * Detects whether an incoming request comes from an autonomous coding agent,
 * contains structured tool calls/schemas, or targets an agent workflow.
 * When true, destructive middlewares (greeting overrides, synthetic personas,
 * vacuous response normalization, XML stripping) MUST be completely bypassed.
 */
export function isAgentOrStructuredRequest(
  reqOrHeaders?: any,
  body?: Record<string, unknown> | null
): boolean {
  if (!body && !reqOrHeaders) return false;

  // 1. Tool, function, or response_format definitions in body
  if (body) {
    if (Array.isArray(body.tools) && body.tools.length > 0) return true;
    if (Array.isArray(body.functions) && body.functions.length > 0) return true;
    if (body.tool_choice !== undefined) return true;
    if (body.response_format !== undefined) return true;

    // 2. Check messages for tool calls, tool results, role === "tool"|"developer", XML tool tags, or long system prompt
    if (Array.isArray(body.messages)) {
      const xmlOrAgentPromptPattern =
        /<(?:write_to_file|replace_in_file|apply_diff|read_file|execute_command|list_files|search_files|attempt_completion|ask_followup_question|browser_action|list_code_definition_names|new_task|task|environment_details|use_mcp_tool|access_mcp_resource)>|\bYou are (?:Cline|Kilo Code|Roo Code|Claude Code|Cursor|Aider|Continue)\b/i;
      for (const m of body.messages) {
        if (!m || typeof m !== "object") continue;
        const msg = m as Record<string, unknown>;
        if (msg.role === "tool" || msg.role === "developer") return true;
        if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) return true;
        if (msg.tool_call_id !== undefined) return true;
        if (msg.role === "system" && typeof msg.content === "string" && msg.content.length > 200) {
          return true;
        }
        if (typeof msg.content === "string" && xmlOrAgentPromptPattern.test(msg.content)) {
          return true;
        }
        if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (block && typeof block === "object") {
              const b = block as Record<string, unknown>;
              if (
                b.type === "tool_use" ||
                b.type === "tool_result" ||
                b.type === "function_call" ||
                b.type === "function_call_output"
              ) {
                return true;
              }
              if (typeof b.text === "string" && xmlOrAgentPromptPattern.test(b.text)) {
                return true;
              }
            }
          }
        }
      }
    }
  }

  // 3. Check headers for coding agents, Stainless SDKs, or Anthropic protocol
  if (reqOrHeaders) {
    let userAgent = "";
    let xTitle = "";
    let referer = "";
    let anthropicVersion = "";
    let stainlessLang = "";

    const headersObj = (reqOrHeaders as any).headers || reqOrHeaders;
    if (headersObj && typeof headersObj.get === "function") {
      userAgent = headersObj.get("user-agent") || "";
      xTitle = headersObj.get("x-title") || "";
      referer = headersObj.get("http-referer") || headersObj.get("referer") || "";
      anthropicVersion = headersObj.get("anthropic-version") || "";
      stainlessLang = headersObj.get("x-stainless-lang") || headersObj.get("x-stainless-package-version") || "";
    } else if (headersObj && typeof headersObj === "object") {
      userAgent = String(headersObj["user-agent"] || "");
      xTitle = String(headersObj["x-title"] || "");
      referer = String(headersObj["http-referer"] || headersObj["referer"] || "");
      anthropicVersion = String(headersObj["anthropic-version"] || "");
      stainlessLang = String(headersObj["x-stainless-lang"] || headersObj["x-stainless-package-version"] || "");
    }

    if (anthropicVersion || stainlessLang) return true;

    const lowerHeaderStr = `${userAgent} ${xTitle} ${referer}`.toLowerCase();
    const codingAgentPattern = /(?:cline|kilo(?:-?code)?|roo(?:-?code|-?cline)?|claude(?:-?code)?|cursor|aider|continue|opencode|goose|windsurf|zed|copilot|anthropic|openai\/(?:js|python)|openai-sdk|ai-sdk|langchain|mastra)/i;
    if (codingAgentPattern.test(lowerHeaderStr)) {
      return true;
    }
  }

  return false;
}

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

export type CodingIntentType =
  | "code_generation"
  | "code_debugging"
  | "code_explanation"
  | "file_operation"
  | "tool_execution"
  | "normal_conversation";

/**
 * Intelligent Coding Intent Recognition Engine (§5, §8).
 * Distinguishes between conversational chat, code generation, debugging, explanation,
 * file operations, and tool calling to ensure developer coding requests receive complete,
 * runnable code rather than generic greetings.
 */
export class CodingIntentDetector {
  public static isCodingIntent(messages: Array<{ role: string; content?: unknown }>): boolean {
    const intent = this.detectIntent(messages);
    return intent !== "normal_conversation";
  }

  public static detectIntent(messages: Array<{ role: string; content?: unknown }>): CodingIntentType {
    if (!messages || messages.length === 0) return "normal_conversation";

    // 1. Tool execution or structured agent signals take absolute precedence
    for (const m of messages) {
      if ((m as any).tool_calls || (m as any).function_call || m.role === "tool") {
        return "tool_execution";
      }
    }
    if (isAgentOrStructuredRequest(null, { messages })) {
      return "tool_execution";
    }

    // 2. A pure greeting turn takes precedence ONLY for standard conversational chat
    if (this.isGreetingInput(messages)) {
      return "normal_conversation";
    }

    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return "normal_conversation";
    const lastUserMsg = userMessages[userMessages.length - 1];
    const text = typeof lastUserMsg.content === "string"
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg.content)
        ? (lastUserMsg.content as any[]).map((p) => p?.text ?? "").join(" ")
        : "";

    if (!text.trim()) return "normal_conversation";
    const lower = text.toLowerCase();

    // 1. Code debugging
    if (
      /\b(debug|fix(?:\s+(?:this|the|all|my)?\s*(?:bug|error|issue|exception|crash|code|compilation|syntax|problem|everything)?)?|troubleshoot|correct\s+this|why\s+is\s+this\s+(?:failing|broken|throwing))\b/i.test(lower) ||
      /\b(typeerror|syntaxerror|referenceerror|stack\s*trace|compilation\s*error|runtime\s*error)\b/i.test(lower)
    ) {
      return "code_debugging";
    }

    // 2. File creation or modification
    if (
      /\b(?:create|creat|write|generate|modify|edit|save|update)\s+(?:a\s+|one\s+|single\s+)?(?:file|script|module|component|app|package|html|css|js|jsx|tsx|py|ts)\b/i.test(lower) ||
      /\b(?:[a-zA-Z0-9_\-\.]+\.(?:jsx?|tsx?|py|html|css|json|vue|rs|go|java|cpp|c|sh|sql))\b/i.test(lower)
    ) {
      return "file_operation";
    }

    // 3. Code explanation
    if (
      /\b(?:explain|how\s+does\s+(?:this|the)\s+(?:code|function|class|method|hook|algorithm)|walk\s+me\s+through)\b/i.test(lower)
    ) {
      return "code_explanation";
    }

    // 4. Code generation
    if (
      /\b(creat|create|build|write|implement|generate|code|program|scaffold)\b/i.test(lower) &&
      /\b(react|reacet|vue|next\.?js|node\.?js|angular|svelte|python|typescript|javascript|html|css|sql|api|rest|graphql|component|hooks?|app\.jsx|app\.tsx|endpoint|todo|counter|backend|frontend)\b/i.test(lower)
    ) {
      return "code_generation";
    }

    // 5. Multi-turn continuation or feature modification in an active coding session
    const priorHasCode = messages.slice(0, -1).some((m) => {
      const c = typeof m.content === "string" ? m.content : "";
      return c.includes("```") || /\b(?:import\s+|export\s+|function\s+|const\s+|class\s+|return\s+<|component|button)/i.test(c);
    });
    if (priorHasCode && /\b(?:add|toggle|dark\s*mode|light\s*mode|theme|feature|change|update|make|fix|style|prop|state|button)\b/i.test(lower)) {
      return "code_generation";
    }

    // Catch general programming / coding requests
    if (
      /\b(react|reacet|jsx|tsx|vue|svelte|typescript|javascript|python|golang|rust|solidity)\b/i.test(lower) ||
      /\b(function|class|method|component|endpoint|api|middleware|regex|algorithm|dark\s*mode|toggle)\b/i.test(lower)
    ) {
      return "code_generation";
    }

    return "normal_conversation";
  }

  public static isGenericGreeting(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    return (
      /^(?:hello|hi|hey|greetings)[\s\.,!?:-]*$/i.test(trimmed) ||
      /^(?:hello|hi|hey)[\s\.,!?:-]*(?:how\s+(?:can|may)\s+i\s+(?:help|assist)\s+you(?:\s+today)?|what\s+can\s+i\s+(?:do|help\s+with)\s+for\s+you)[\s\.,!\?]*$/i.test(trimmed) ||
      /^(?:i\s+am|i'm)\s+(?:here|ready)\s+to\s+help(?:\s+you)?[\s\.,!\?]*$/i.test(trimmed) ||
      /^(?:how\s+(?:can|may)\s+i\s+(?:help|assist)\s+you(?:\s+today)?)[\s\.,!\?]*$/i.test(trimmed)
    );
  }

  public static isVacuousAck(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    return /^(?:got\s+it|good\s+to\s+know|noted|understood|i\s+understand|sure(?:\s+thing)?|ok|okay|will\s+do|alright|all\s+right|right\s+away|acknowledged|ready|no\s+problem|not\s+answerable|unanswerable|cannot\s+answer|can't\s+answer|nothing\s+to\s+do|no\s+action\s+needed)[\s\.,!?:-]*$/i.test(trimmed);
  }

  public static isVacuousResponse(content: string): boolean {
    if (!content || !content.trim()) return true;
    const trimmed = content.trim();
    if (this.isGenericGreeting(trimmed)) return true;
    return this.isVacuousAck(trimmed);
  }

  public static isGreetingInput(messages: Array<{ role: string; content?: unknown }>): boolean {
    if (!messages || messages.length === 0) return false;
    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return false;
    const lastUserMsg = userMessages[userMessages.length - 1];
    const text = typeof lastUserMsg.content === "string"
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg.content)
        ? (lastUserMsg.content as any[]).map((p) => p?.text ?? "").join(" ")
        : "";
    const trimmed = text.trim();
    if (!trimmed) return false;
    return (
      /^(?:hi|hello|hey|hiya|howdy|sup|yo|greetings)(?:\s+there)?[\s\.,!?:-]*(?:how\s+(?:are\s+you|are\s+things|is\s+it\s+going|are\s+you\s+doing)|what'?s\s+up)?[\s\.,!\?]*$/i.test(trimmed) ||
      /^good\s+(?:morning|afternoon|evening|day)[\s\.,!?:-]*$/i.test(trimmed)
    );
  }

  public static buildCodingDirective(intent: CodingIntentType): string {
    switch (intent) {
      case "code_generation":
      case "file_operation":
        return (
          "You are a principal software engineer. When given a coding or file generation task, immediately provide complete, runnable, production-grade source code. " +
          "Strictly fulfill requested frameworks, file count constraints, and naming conventions. " +
          "Never output generic greetings (e.g. 'How can I help you today?'), introductory small-talk, or incomplete placeholders. " +
          "Include all necessary imports, state logic, and styling. Provide working code that can run directly."
        );
      case "code_debugging":
        return (
          "You are an expert software engineer and debugger. Identify the exact root cause of the bug, explain the fix clearly and concisely, and return the complete, corrected code."
        );
      case "code_explanation":
        return (
          "You are a technical software architect. Explain the code clearly, covering architectural flow, key mechanisms, edge cases, and performance considerations."
        );
      default:
        return (
          "You are an expert AI developer assistant. Provide direct, high-quality, actionable technical responses without unnecessary preamble."
        );
    }
  }

  /**
   * Fallback code synthesis is disabled so the gateway never returns synthetic placeholder code.
   */
  public static generateFallbackCode(messages: Array<{ role: string; content?: unknown }>): string {
    if (this.isGreetingInput(messages)) {
      return "Hello! How can I assist you with your project today?";
    }
    return "";
  }
}
