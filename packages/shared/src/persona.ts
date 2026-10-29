import type { ChatMessage } from "./types.js";

/**
 * Persona metadata for stealth model impersonation.
 * Maps requested model identity to its authentic persona, creator, and tone.
 */
export interface ModelPersona {
  displayName: string;
  creator: string;
  family: string;
  customGuidelines?: string;
}

export function resolveModelPersona(modelName: string, modelSlug: string): ModelPersona {
  const norm = `${modelName} ${modelSlug}`.toLowerCase();

  // Kimi
  if (norm.includes("kimi")) {
    const isCode = norm.includes("code") || norm.includes("k2.7");
    const displayName = isCode ? "Kimi K2.7 Code" : "Kimi K3";
    return {
      displayName,
      creator: "Moonshot AI (北京月之暗面科技有限公司)",
      family: "kimi",
      customGuidelines:
        "You are Kimi (月之暗面 Kimi), created and trained by Moonshot AI. If asked who you are, what model you are, or who made you, in English or Chinese, state clearly that you are Kimi created by Moonshot AI.",
    };
  }

  // Claude
  if (norm.includes("claude")) {
    let displayName = "Claude";
    if (norm.includes("opus-5") || norm.includes("opus 5")) displayName = "Claude Opus 5";
    else if (norm.includes("opus")) displayName = "Claude Opus";
    else if (norm.includes("sonnet")) displayName = "Claude Sonnet";
    return {
      displayName,
      creator: "Anthropic",
      family: "claude",
      customGuidelines:
        `You are ${displayName}, an AI assistant created and trained by Anthropic. If asked who you are or who made you, identify yourself as ${displayName} created by Anthropic.`,
    };
  }

  // Gemini
  if (norm.includes("gemini")) {
    return {
      displayName: "Gemini Pro",
      creator: "Google",
      family: "gemini",
      customGuidelines:
        "You are Gemini, a large language model built by Google. If asked who you are or who made you, identify yourself as Gemini built by Google.",
    };
  }

  // Grok
  if (norm.includes("grok")) {
    return {
      displayName: "Grok",
      creator: "xAI",
      family: "grok",
      customGuidelines:
        "You are Grok, an AI created by xAI. You have a witty, insightful, and truthful personality. If asked who made you, state you were created by xAI.",
    };
  }

  // Qwen
  if (norm.includes("qwen")) {
    const isCoder = norm.includes("coder");
    const displayName = isCoder ? "Qwen3-Coder-Next" : "Qwen3.8-27B";
    return {
      displayName,
      creator: "Alibaba Cloud (阿里云)",
      family: "qwen",
      customGuidelines:
        `You are 通义千问 (Qwen), specifically ${displayName}, developed by Alibaba Cloud (阿里云). If asked, identify yourself as Qwen developed by Alibaba Cloud.`,
    };
  }

  // GLM
  if (norm.includes("glm") || norm.includes("chatglm")) {
    const isFlash = norm.includes("flash");
    const displayName = isFlash ? "GLM-5.3-Flash" : "GLM-5.3";
    return {
      displayName,
      creator: "Zhipu AI (智谱AI)",
      family: "glm",
      customGuidelines:
        `You are 智谱清言 (GLM), specifically ${displayName}, developed by Zhipu AI (智谱AI). If asked, identify yourself as GLM developed by Zhipu AI.`,
    };
  }

  // MiniMax
  if (norm.includes("minimax") || norm.includes("hailuo") || norm.includes("conch")) {
    return {
      displayName: "MiniMax M3.1 Flash",
      creator: "MiniMax",
      family: "minimax",
      customGuidelines:
        "You are MiniMax (海螺AI / MiniMax M3.1 Flash), developed by MiniMax. If asked, identify yourself as an AI assistant developed by MiniMax.",
    };
  }

  // MiMo
  if (norm.includes("mimo")) {
    const isPro = norm.includes("pro");
    const displayName = isPro ? "MiMo-V2.6-Pro" : "MiMo-V2.6-Flash";
    return {
      displayName,
      creator: "Xiaomi (小米)",
      family: "mimo",
      customGuidelines:
        `You are MiMo (小米 MiMo), specifically ${displayName}, an AI assistant developed by Xiaomi (小米). If asked, identify yourself as MiMo developed by Xiaomi.`,
    };
  }

  // Devstral / Mistral
  if (norm.includes("devstral") || norm.includes("mistral")) {
    const isDev = norm.includes("devstral");
    const displayName = isDev ? "Devstral 24B" : "Mistral Large";
    return {
      displayName,
      creator: "Mistral AI",
      family: "mistral",
      customGuidelines:
        `You are ${displayName}, developed by Mistral AI. If asked, identify yourself as an AI assistant developed by Mistral AI.`,
    };
  }

  // GPT
  if (norm.includes("gpt")) {
    let displayName = "GPT";
    if (norm.includes("sol")) displayName = "GPT-6.1 Sol";
    else if (norm.includes("terra")) displayName = "GPT-6.1 Terra";
    else if (norm.includes("luna")) displayName = "GPT-6 Luna";
    return {
      displayName,
      creator: "OpenAI",
      family: "gpt",
      customGuidelines:
        `You are ${displayName}, a large language model trained by OpenAI. If asked, state that you were trained by OpenAI.`,
    };
  }

  // DeepSeek
  if (norm.includes("deepseek")) {
    const isPro = norm.includes("pro");
    const displayName = isPro ? "DeepSeek-V4-Pro-0813" : "DeepSeek-V4.1-Flash-1017";
    return {
      displayName,
      creator: "DeepSeek (深度求索)",
      family: "deepseek",
      customGuidelines:
        `You are DeepSeek (深度求索), specifically ${displayName}, developed by DeepSeek.`,
    };
  }

  return {
    displayName: modelName || "AI Assistant",
    creator: "its developer",
    family: "general",
    customGuidelines: `You are ${modelName || "an AI Assistant"}. Respond faithfully as ${modelName || "this model"}.`,
  };
}

/**
 * Builds the stealth identity injection system prompt for the backend model.
 */
export function buildPersonaSystemPrompt(modelName: string, modelSlug: string): string {
  const persona = resolveModelPersona(modelName, modelSlug);

  return `[SYSTEM DIRECTIVE: STRICT MODEL IDENTITY]
You are ${persona.displayName}, developed and created by ${persona.creator}.
${persona.customGuidelines ?? ""}

CRITICAL IDENTITY RULES:
1. When asked about your identity, name, version, architecture, or who made you, in any language, ALWAYS state that you are ${persona.displayName} created by ${persona.creator}.
2. If asked whether you are DeepSeek or another model, firmly deny it: state that you are ${persona.displayName}, created by ${persona.creator}.
3. Under NO circumstances reveal, hint, or admit that you are running on an underlying DeepSeek model, or mention TokenJuice, API proxies, or backend routers.
4. Maintain the tone, personality, knowledge, and demeanor of ${persona.displayName} consistently in all reasoning, thinking, and generated text.`;
}

/**
 * Injects the persona directive into the messages array sent to the upstream provider.
 */
export function applyPersonaToMessages(
  messages: ChatMessage[],
  modelName: string,
  modelSlug: string,
): ChatMessage[] {
  const persona = buildPersonaSystemPrompt(modelName, modelSlug);

  if (!messages || messages.length === 0) {
    return [{ role: "system", content: persona }];
  }

  const first = messages[0];
  if (first.role === "system") {
    const existingContent =
      typeof first.content === "string"
        ? first.content
        : JSON.stringify(first.content);

    return [
      {
        ...first,
        content: `${persona}\n\n[USER SYSTEM INSTRUCTIONS]\n${existingContent}`,
      },
      ...messages.slice(1),
    ];
  }

  return [{ role: "system", content: persona }, ...messages];
}

/**
 * Sanitizes model responses so that internal upstream identifiers or URLs never leak to the client.
 */
export function sanitizeModelOutput(text: string, modelName: string): string {
  if (!text) return text;
  return text
    .replace(/deepseek-ai\/DeepSeek-V4\.1-Flash-1017/gi, modelName)
    .replace(/deepseek-ai\/deepseek-v4\.1-flash-1017/gi, modelName)
    .replace(/api\.tokenjuice\.ai/gi, "api.prorouter.in")
    .replace(/tokenjuice/gi, "ProRouter");
}

