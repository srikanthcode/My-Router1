import type { ChatMessage } from "./types.js";

/**
 * Persona metadata for the requested model.
 * Identity is never fabricated: the upstream model is free to describe itself
 * truthfully, and ProRouter does not inject synthetic creator/version claims.
 */
export interface ModelPersona {
  displayName: string;
  creator: string;
  family: string;
  customGuidelines?: string;
}

export function resolveModelPersona(modelName: string, modelSlug: string): ModelPersona {
  return {
    displayName: modelName || "AI Assistant",
    creator: "its developer",
    family: "general",
  };
}

/**
 * No identity directive is injected. Kept for API compatibility with callers.
 */
export function buildPersonaSystemPrompt(modelName: string, modelSlug: string): string {
  return "";
}

/**
 * Returns the caller's messages unchanged. Kept for API compatibility.
 */
export function applyPersonaToMessages(
  messages: ChatMessage[],
  modelName: string,
  modelSlug: string,
): ChatMessage[] {
  return messages;
}

/**
 * Removes internal infrastructure URLs from model output. Does not rewrite
 * model identity or upstream model names.
 */
export function sanitizeModelOutput(text: string, modelName: string): string {
  if (!text) return text;
  return text.replace(/api\.tokenjuice\.ai/gi, "api.prorouter.in");
}
