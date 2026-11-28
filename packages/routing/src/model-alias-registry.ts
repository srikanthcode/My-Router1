/**
 * Curated Model Catalog & Virtual Alias Routing Registry.
 *
 * Implements the two-layer model architecture:
 * 1. Curated Public Catalog: ~40-48 high-demand, high-converting models across 6 clean categories.
 * 2. Virtual Alias Router: maps user/agent requested slugs (e.g. 'deepseek-chat', 'claude-sonnet',
 *    'gpt-5-codex') invisibly to verified canonical backend targets, always backed by the universal
 *    deepseek-v4.1-flash fallback chain.
 *
 * All Tier 1 - Tier 10 duplicate clutter is eliminated.
 */

import { VERIFIED_BACKEND_MODELS } from "./backend-registry.js";
import type { BackendModel } from "./types.js";

export type CuratedCategory =
  | "coding"
  | "text"
  | "reasoning"
  | "fast"
  | "vision"
  | "long_context";

export interface CuratedModelPricing {
  inr: {
    prompt: number; // paise per 1M
    completion: number; // paise per 1M
    cachedPrompt?: number;
  };
  usd: {
    prompt: number; // USD per 1M (decimal)
    completion: number; // USD per 1M (decimal)
    cachedPrompt?: number;
  };
  freeDailyTokens: number;
}

export interface CuratedModelEntry {
  slug: string;
  name: string;
  displayName: string;
  family: string;
  category: CuratedCategory;
  categoryLabel: string;
  description: string;
  contextWindow: number;
  maxOutputTokens: number;
  backendTarget: string; // canonical backend ID in VERIFIED_BACKEND_MODELS
  fallbackChain: string[]; // ordered canonical backend IDs, always ending in deepseek-v4.1-flash
  isFree: boolean;
  freeDailyTokens: number;
  aliases: string[];
  recommendedForAgents: boolean;
  supportsNativeTools: boolean;
  supportsStreamingTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  pricing: CuratedModelPricing;
}

export const CURATED_MODELS: CuratedModelEntry[] = [
  // ── 1. Coding & Agentic (Strictly backed by native tool-calling models) ──
  {
    slug: "deepseek-v4.1-flash",
    name: "DeepSeek V4.1 Flash",
    displayName: "DeepSeek V4.1 Flash (1M Free/Day)",
    family: "DeepSeek",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Ultra-fast frontier coding engine with native tool calling, deep reasoning, and 1,000,000 daily free tokens.",
    contextWindow: 262144,
    maxOutputTokens: 128000,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: [
      "prorouter/deepseek-v4.1-flash",
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: true,
    freeDailyTokens: 1_000_000,
    aliases: [
      "deepseek-chat",
      "deepseek-coder",
      "deepseek-flash",
      "deepseek-v4-flash",
      "deepseek-v4.1-flash-1017",
      "deepseek-ai/DeepSeek-V4.1-Flash-1017",
    ],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1761, completion: 3521, cachedPrompt: 880 },
      usd: { prompt: 0.21, completion: 0.41, cachedPrompt: 0.10 },
      freeDailyTokens: 1_000_000,
    },
  },
  {
    slug: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    displayName: "DeepSeek V4 Pro 0813",
    family: "DeepSeek",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Dedicated coding architecture snapshot for high-precision autonomous codebases, refactoring, and AST manipulation.",
    contextWindow: 262144,
    maxOutputTokens: 64000,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: [
      "prorouter/deepseek-v4.1-flash",
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["deepseek-v4-pro-0813", "deepseek-coder-pro"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 2500, completion: 7500, cachedPrompt: 1250 },
      usd: { prompt: 0.29, completion: 0.88, cachedPrompt: 0.15 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    displayName: "Claude 3.5 Sonnet",
    family: "Anthropic",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Industry gold standard for agentic software engineering, file editing, and autonomous terminal execution.",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/anthropic/claude-3.5-sonnet",
    fallbackChain: [
      "openrouter/anthropic/claude-3.5-sonnet",
      "openai/gpt-4.1",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: [
      "claude-sonnet",
      "claude-3-5-sonnet",
      "claude-3-5-sonnet-20241022",
      "claude-sonnet-4",
      "anthropic/claude-3.5-sonnet",
    ],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 25500, completion: 127500, cachedPrompt: 12750 },
      usd: { prompt: 3.00, completion: 15.00, cachedPrompt: 1.50 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "claude-opus-5",
    name: "Claude Opus 5",
    displayName: "Claude Opus 5",
    family: "Anthropic",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Ultra-high capability frontier model for complex architectural refactoring and multi-step agentic planning.",
    contextWindow: 250000,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/anthropic/claude-3-opus",
    fallbackChain: [
      "openrouter/anthropic/claude-3-opus",
      "openrouter/anthropic/claude-3.5-sonnet",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["claude-opus-5-pro", "anthropic/claude-opus-5"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 85000, completion: 425000, cachedPrompt: 42500 },
      usd: { prompt: 10.00, completion: 50.00, cachedPrompt: 5.00 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-4.1",
    name: "GPT-4.1",
    displayName: "GPT-4.1 (Direct Coding)",
    family: "OpenAI",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "OpenAI flagship high-precision coding model with native tool calls and 128k context window.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    backendTarget: "openai/gpt-4.1",
    fallbackChain: [
      "openai/gpt-4.1",
      "openrouter/openai/gpt-4.1",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: [
      "openai/gpt-4.1",
      "gpt-4.1-turbo",
      "gpt-4.1-preview",
      "gpt-4.1-direct",
    ],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 21250, completion: 85000, cachedPrompt: 10625 },
      usd: { prompt: 2.50, completion: 10.00, cachedPrompt: 1.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-5-codex",
    name: "GPT-5 Codex",
    displayName: "GPT-5 Codex",
    family: "OpenAI",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Next-generation autonomous coding engine with optimized function calling and low token footprint.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    backendTarget: "openai/gpt-4.1",
    fallbackChain: [
      "openai/gpt-4.1",
      "openrouter/openai/gpt-4.1",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gpt-5", "gpt-5-mini", "gpt-5-code"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 21250, completion: 85000, cachedPrompt: 10625 },
      usd: { prompt: 2.50, completion: 10.00, cachedPrompt: 1.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "qwen3-coder-next",
    name: "Qwen3 Coder Next",
    displayName: "Qwen3 Coder Next",
    family: "Qwen",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Alibaba next-gen autonomous coding agent with exceptional MultiPL-E and HumanEval benchmark performance.",
    contextWindow: 131072,
    maxOutputTokens: 64000,
    backendTarget: "groq/qwen3.8-27b",
    fallbackChain: [
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["qwen3-coder", "qwen-coder-next"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 2975, completion: 11900, cachedPrompt: 1487 },
      usd: { prompt: 0.35, completion: 1.40, cachedPrompt: 0.17 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "qwen-2.5-coder-32b",
    name: "Qwen 2.5 Coder 32B",
    displayName: "Qwen 2.5 Coder 32B",
    family: "Qwen",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Dedicated 32B code model matching frontier 70B models in repository comprehension and syntax generation.",
    contextWindow: 131072,
    maxOutputTokens: 64000,
    backendTarget: "groq/qwen3.8-27b",
    fallbackChain: [
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["qwen2.5-coder-32b", "qwen/qwen-2.5-coder-32b"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 2515, completion: 10057, cachedPrompt: 1257 },
      usd: { prompt: 0.30, completion: 1.18, cachedPrompt: 0.15 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    displayName: "Kimi K2.7 Code",
    family: "Moonshot",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Moonshot AI 200k context code specialist for whole-repo analysis and automated test writing.",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: [
      "prorouter/deepseek-v4.1-flash",
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["kimi-code", "moonshot/kimi-k2.7-code"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 5100, completion: 20400, cachedPrompt: 2550 },
      usd: { prompt: 0.60, completion: 2.40, cachedPrompt: 0.30 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "devstral-24b",
    name: "Devstral 24B",
    displayName: "Devstral 24B",
    family: "Mistral",
    category: "coding",
    categoryLabel: "Coding & Agentic",
    description: "Mistral AI developer coding model specialized in CI/CD pipeline automation and code conversion.",
    contextWindow: 128000,
    maxOutputTokens: 32768,
    backendTarget: "openrouter/mistralai/mistral-large-2411",
    fallbackChain: [
      "openrouter/mistralai/mistral-large-2411",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["mistral/devstral-24b", "devstral"],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 3400, completion: 10200, cachedPrompt: 1700 },
      usd: { prompt: 0.40, completion: 1.20, cachedPrompt: 0.20 },
      freeDailyTokens: 0,
    },
  },

  // ── 2. Text & General Chat ──
  {
    slug: "gpt-4o",
    name: "GPT-4o",
    displayName: "GPT-4o (Omni Flagship)",
    family: "OpenAI",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "OpenAI multimodal flagship for general reasoning, conversational chat, writing, and structured outputs.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    backendTarget: "openai/gpt-4o",
    fallbackChain: [
      "openai/gpt-4o",
      "openrouter/openai/gpt-4o",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["openai/gpt-4o", "chatgpt-4o", "gpt-4o-2024-11-20"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 21250, completion: 85000, cachedPrompt: 10625 },
      usd: { prompt: 2.50, completion: 10.00, cachedPrompt: 1.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-6-luna",
    name: "GPT-6 Luna",
    displayName: "GPT-6 Luna",
    family: "OpenAI",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "High-density conversational intelligence with 256k context window for long documents and summarization.",
    contextWindow: 256000,
    maxOutputTokens: 32768,
    backendTarget: "openai/gpt-4o",
    fallbackChain: ["openai/gpt-4o", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gpt-6", "gpt-luna"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 17000, completion: 68000, cachedPrompt: 8500 },
      usd: { prompt: 2.00, completion: 8.00, cachedPrompt: 1.00 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gemini-pro",
    name: "Gemini 2.0 Flash / Pro",
    displayName: "Gemini Pro",
    family: "Google",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "Google multimodal engine with 1M context window for broad reasoning, document ingestion, and chat.",
    contextWindow: 1048576,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/google/gemini-2.0-flash-001",
    fallbackChain: [
      "openrouter/google/gemini-2.0-flash-001",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gemini-1.5-pro", "gemini-2.0-flash", "google/gemini-pro"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1020, completion: 4080, cachedPrompt: 510 },
      usd: { prompt: 0.12, completion: 0.48, cachedPrompt: 0.06 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "grok-2",
    name: "Grok 2",
    displayName: "xAI Grok 2",
    family: "xAI",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "xAI conversational engine offering real-time world knowledge and frank, candid dialog.",
    contextWindow: 131072,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/x-ai/grok-2-1212",
    fallbackChain: [
      "openrouter/x-ai/grok-2-1212",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["grok", "x-ai/grok-2", "grok-2-1212"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 17000, completion: 85000, cachedPrompt: 8500 },
      usd: { prompt: 2.00, completion: 10.00, cachedPrompt: 1.00 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "mistral-large",
    name: "Mistral Large",
    displayName: "Mistral Large 2411",
    family: "Mistral",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "Mistral AI flagship reasoning model with multilingual fluency and precise instruction following.",
    contextWindow: 128000,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/mistralai/mistral-large-2411",
    fallbackChain: [
      "openrouter/mistralai/mistral-large-2411",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["mistralai/mistral-large-2411", "mistral-large-latest"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 17000, completion: 51000, cachedPrompt: 8500 },
      usd: { prompt: 2.00, completion: 6.00, cachedPrompt: 1.00 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "beam-v1",
    name: "Beam v1",
    displayName: "Beam v1",
    family: "ProRouter",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "General-purpose high-speed conversational model for summaries, outlines, and email drafts.",
    contextWindow: 200000,
    maxOutputTokens: 32768,
    backendTarget: "openai/gpt-4o",
    fallbackChain: ["openai/gpt-4o", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["beam"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 4250, completion: 12750, cachedPrompt: 2125 },
      usd: { prompt: 0.50, completion: 1.50, cachedPrompt: 0.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "jev-1.13",
    name: "Jev 1.13",
    displayName: "Jev 1.13",
    family: "ProRouter",
    category: "text",
    categoryLabel: "Text & General Chat",
    description: "Compact conversational model tuned for short answers, fact retrieval, and structured formatting.",
    contextWindow: 131072,
    maxOutputTokens: 16384,
    backendTarget: "openai/gpt-4o",
    fallbackChain: ["openai/gpt-4o", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["jev"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 2550, completion: 7650, cachedPrompt: 1275 },
      usd: { prompt: 0.30, completion: 0.90, cachedPrompt: 0.15 },
      freeDailyTokens: 0,
    },
  },

  // ── 3. Deep Reasoning & Math ──
  {
    slug: "claude-3-opus",
    name: "Claude 3 Opus",
    displayName: "Claude 3 Opus",
    family: "Anthropic",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Deep qualitative synthesis, formal logic, legal analysis, and complex hypothesis testing.",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/anthropic/claude-3-opus",
    fallbackChain: [
      "openrouter/anthropic/claude-3-opus",
      "openrouter/anthropic/claude-3.5-sonnet",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["claude-opus", "anthropic/claude-3-opus"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 127500, completion: 637500, cachedPrompt: 63750 },
      usd: { prompt: 15.00, completion: 75.00, cachedPrompt: 7.50 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-6.1-sol",
    name: "GPT-6.1 Sol",
    displayName: "GPT-6.1 Sol",
    family: "OpenAI",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Frontier mathematical proofs, quantitative modeling, and algorithmic problem decomposition.",
    contextWindow: 256000,
    maxOutputTokens: 64000,
    backendTarget: "openai/gpt-4.1",
    fallbackChain: ["openai/gpt-4.1", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gpt-sol", "gpt-6.1"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 25500, completion: 102000, cachedPrompt: 12750 },
      usd: { prompt: 3.00, completion: 12.00, cachedPrompt: 1.50 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-6.1-terra",
    name: "GPT-6.1 Terra",
    displayName: "GPT-6.1 Terra",
    family: "OpenAI",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Research & analysis engine for cross-disciplinary literature reviews and strategic roadmaps.",
    contextWindow: 256000,
    maxOutputTokens: 64000,
    backendTarget: "openai/gpt-4.1",
    fallbackChain: ["openai/gpt-4.1", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gpt-terra"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 21250, completion: 85000, cachedPrompt: 10625 },
      usd: { prompt: 2.50, completion: 10.00, cachedPrompt: 1.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "nemotron-3-ultra-550b",
    name: "Nemotron 3 Ultra 550B",
    displayName: "Nemotron 3 Ultra 550B A55B",
    family: "NVIDIA",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "NVIDIA 550B MoE frontier reasoning model with 1M context window for massive datasets and physics simulations.",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    backendTarget: "requesty/nemotron-3-ultra-550b-a55b",
    fallbackChain: [
      "requesty/nemotron-3-ultra-550b-a55b",
      "openrouter/nemotron-3-ultra-550b-a55b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: [
      "nemotron-3-ultra-550b-a55b",
      "nemotron-550b",
      "nvidia/nemotron-3-ultra-550b-a55b",
    ],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 5950, completion: 17850, cachedPrompt: 2975 },
      usd: { prompt: 0.70, completion: 2.10, cachedPrompt: 0.35 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "glm-5.3",
    name: "GLM-5.3",
    displayName: "Zhipu GLM-5.3",
    family: "Zhipu",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Bilingual frontier reasoning model with deep expertise in Chinese/English logic and quantitative reasoning.",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: ["prorouter/deepseek-v4.1-flash", "groq/qwen3.8-27b"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["zhipu/glm-5.3", "chatglm-5.3"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 3400, completion: 10200, cachedPrompt: 1700 },
      usd: { prompt: 0.40, completion: 1.20, cachedPrompt: 0.20 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "mimo-v2.6-pro",
    name: "MiMo-V2.6 Pro",
    displayName: "Xiaomi MiMo-V2.6 Pro",
    family: "Xiaomi",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Xiaomi 1M context deep reasoning model designed for end-to-end mathematical analysis and long-form synthesis.",
    contextWindow: 1048576,
    maxOutputTokens: 64000,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: ["prorouter/deepseek-v4.1-flash", "groq/qwen3.8-27b"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["xiaomi/mimo-v2.6-pro", "mimo-pro"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 4250, completion: 12750, cachedPrompt: 2125 },
      usd: { prompt: 0.50, completion: 1.50, cachedPrompt: 0.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "leanstral-1-5",
    name: "Leanstral 1.5",
    displayName: "Leanstral 1.5",
    family: "Mistral",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Mistral AI specialized engine for formal mathematical verification, Lean 4 proofs, and theorem proving.",
    contextWindow: 262144,
    maxOutputTokens: 32768,
    backendTarget: "requesty/leanstral-1-5",
    fallbackChain: [
      "requesty/leanstral-1-5",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["mistral/leanstral-1-5"],
    recommendedForAgents: false,
    supportsNativeTools: false,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1020, completion: 3060, cachedPrompt: 510 },
      usd: { prompt: 0.12, completion: 0.36, cachedPrompt: 0.06 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-oss-120b",
    name: "GPT OSS 120B",
    displayName: "GPT OSS 120B (Groq LPU)",
    family: "OpenAI",
    category: "reasoning",
    categoryLabel: "Deep Reasoning & Math",
    description: "Open-weight 120B reasoning model accelerated on Groq LPUs for instant token streaming.",
    contextWindow: 131072,
    maxOutputTokens: 32768,
    backendTarget: "groq/gpt-oss-120b",
    fallbackChain: ["groq/gpt-oss-120b", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["openai/gpt-oss-120b"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 2550, completion: 10200, cachedPrompt: 1275 },
      usd: { prompt: 0.30, completion: 1.20, cachedPrompt: 0.15 },
      freeDailyTokens: 0,
    },
  },

  // ── 4. Fast & Low-Latency ──
  {
    slug: "qwen3.8-27b",
    name: "Qwen 3.8 27B",
    displayName: "Qwen 3.8 27B (Groq LPU — 1M Free/Day)",
    family: "Qwen",
    category: "fast",
    categoryLabel: "Fast & Low-Latency",
    description: "Groq LPU hardware accelerated model with <150ms TTFT, Indic multilingual fluency, and 1,000,000 free tokens/day.",
    contextWindow: 131072,
    maxOutputTokens: 64000,
    backendTarget: "groq/qwen3.8-27b",
    fallbackChain: [
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: true,
    freeDailyTokens: 1_000_000,
    aliases: [
      "qwen/qwen3.8-27b",
      "qwen-3.8-27b",
      "qwen3.2-27b",
      "groq/qwen3.8-27b",
    ],
    recommendedForAgents: true,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 2515, completion: 10057, cachedPrompt: 1257 },
      usd: { prompt: 0.30, completion: 1.18, cachedPrompt: 0.15 },
      freeDailyTokens: 1_000_000,
    },
  },
  {
    slug: "gpt-oss-20b",
    name: "GPT OSS 20B",
    displayName: "GPT OSS 20B",
    family: "OpenAI",
    category: "fast",
    categoryLabel: "Fast & Low-Latency",
    description: "Compact 20B open reasoning model optimized for sub-100ms response times and high-volume background pipelines.",
    contextWindow: 131072,
    maxOutputTokens: 16384,
    backendTarget: "groq/gpt-oss-20b",
    fallbackChain: [
      "groq/gpt-oss-20b",
      "nabh/gpt-oss-20b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["openai/gpt-oss-20b", "nabh/gpt-oss-20b"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 680, completion: 2040, cachedPrompt: 340 },
      usd: { prompt: 0.08, completion: 0.24, cachedPrompt: 0.04 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "glm-5.3-flash",
    name: "GLM-5.3 Flash",
    displayName: "GLM-5.3 Flash",
    family: "Zhipu",
    category: "fast",
    categoryLabel: "Fast & Low-Latency",
    description: "Fast bilingual inference engine designed for conversational customer bots and real-time chat translation.",
    contextWindow: 200000,
    maxOutputTokens: 32768,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: ["prorouter/deepseek-v4.1-flash", "groq/qwen3.8-27b"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["zhipu/glm-5.3-flash"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: {
      inr: { prompt: 1700, completion: 5100, cachedPrompt: 850 },
      usd: { prompt: 0.20, completion: 0.60, cachedPrompt: 0.10 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "mimo-v2.6-flash",
    name: "MiMo-V2.6 Flash",
    displayName: "MiMo-V2.6 Flash",
    family: "Xiaomi",
    category: "fast",
    categoryLabel: "Fast & Low-Latency",
    description: "Lightweight conversational engine with 1M context window tuned for ultra-fast summarization.",
    contextWindow: 1048576,
    maxOutputTokens: 32768,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: ["prorouter/deepseek-v4.1-flash", "groq/qwen3.8-27b"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["xiaomi/mimo-v2.6-flash"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: {
      inr: { prompt: 1700, completion: 5100, cachedPrompt: 850 },
      usd: { prompt: 0.20, completion: 0.60, cachedPrompt: 0.10 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "ling-3.1-flash",
    name: "Ling 3.1 Flash",
    displayName: "Ling 3.1 Flash",
    family: "Novita",
    category: "fast",
    categoryLabel: "Fast & Low-Latency",
    description: "Novita high-throughput streaming model for instant completions, classification, and text transforms.",
    contextWindow: 262144,
    maxOutputTokens: 32768,
    backendTarget: "requesty/ling-3.1-flash",
    fallbackChain: [
      "requesty/ling-3.1-flash",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["novita/ling-3.1-flash"],
    recommendedForAgents: false,
    supportsNativeTools: false,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: {
      inr: { prompt: 680, completion: 2040, cachedPrompt: 340 },
      usd: { prompt: 0.08, completion: 0.24, cachedPrompt: 0.04 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "nemotron-3.5-lightning",
    name: "Nemotron 3.5 Lightning",
    displayName: "Nemotron 3.5 Lightning",
    family: "NVIDIA",
    category: "fast",
    categoryLabel: "Fast & Low-Latency",
    description: "NVIDIA high-throughput agentic model with 1M context window for rapid multi-step workflows.",
    contextWindow: 1048576,
    maxOutputTokens: 65536,
    backendTarget: "openrouter/nemotron-3.5-lightning",
    fallbackChain: [
      "openrouter/nemotron-3.5-lightning",
      "requesty/nemotron-3.5-lightning-30b-a3b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: [
      "nvidia/nemotron-3.5-lightning",
      "nemotron-3.5-lightning-30b-a3b",
    ],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 850, completion: 2550, cachedPrompt: 425 },
      usd: { prompt: 0.10, completion: 0.30, cachedPrompt: 0.05 },
      freeDailyTokens: 0,
    },
  },

  // ── 5. Vision & Multimodal (Strictly backed by supportsVision: true models) ──
  {
    slug: "nemotron-3.5-super-vl",
    name: "Nemotron 3.5 Super VL",
    displayName: "Nemotron 3.5 Super VL",
    family: "NVIDIA",
    category: "vision",
    categoryLabel: "Vision & Multimodal",
    description: "NVIDIA state-of-the-art vision-language model for UI screenshots, diagrams, chart data extraction, and OCR.",
    contextWindow: 128000,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/nemotron-3.5-super-vl",
    fallbackChain: [
      "openrouter/nemotron-3.5-super-vl",
      "openai/gpt-4o",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["nvidia/nemotron-3.5-super-vl"],
    recommendedForAgents: false,
    supportsNativeTools: false,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1700, completion: 5100, cachedPrompt: 850 },
      usd: { prompt: 0.20, completion: 0.60, cachedPrompt: 0.10 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "nemotron-3-nano-omni-30b",
    name: "Nemotron 3 Nano Omni 30B",
    displayName: "Nemotron 3 Nano Omni 30B Reasoning",
    family: "NVIDIA",
    category: "vision",
    categoryLabel: "Vision & Multimodal",
    description: "Integrated visual reasoning and document understanding model for structured invoice and receipt processing.",
    contextWindow: 131072,
    maxOutputTokens: 20480,
    backendTarget: "requesty/nemotron-3-nano-omni-30b-a3b-reasoning",
    fallbackChain: [
      "requesty/nemotron-3-nano-omni-30b-a3b-reasoning",
      "openrouter/nemotron-3-nano-omni-30b-a3b-reasoning",
      "openai/gpt-4o",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: [
      "nemotron-3-nano-omni-30b-a3b-reasoning",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    ],
    recommendedForAgents: false,
    supportsNativeTools: false,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1275, completion: 3825, cachedPrompt: 637 },
      usd: { prompt: 0.15, completion: 0.45, cachedPrompt: 0.08 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gpt-4o-vision",
    name: "GPT-4o Vision",
    displayName: "GPT-4o Vision",
    family: "OpenAI",
    category: "vision",
    categoryLabel: "Vision & Multimodal",
    description: "OpenAI multimodal visual reasoning for complex software UI mockups, architectural schematics, and design review.",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    backendTarget: "openai/gpt-4o",
    fallbackChain: [
      "openai/gpt-4o",
      "openrouter/openai/gpt-4o",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gpt-4o-image", "openai/gpt-4o-vision"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 21250, completion: 85000, cachedPrompt: 10625 },
      usd: { prompt: 2.50, completion: 10.00, cachedPrompt: 1.25 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gemini-pro-vision",
    name: "Gemini Pro Vision",
    displayName: "Gemini Pro Vision",
    family: "Google",
    category: "vision",
    categoryLabel: "Vision & Multimodal",
    description: "Google multimodal engine for ultra-high-resolution imagery, video frame sequence understanding, and visual OCR.",
    contextWindow: 1048576,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/google/gemini-2.0-flash-001",
    fallbackChain: [
      "openrouter/google/gemini-2.0-flash-001",
      "openai/gpt-4o",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["google/gemini-pro-vision"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1020, completion: 4080, cachedPrompt: 510 },
      usd: { prompt: 0.12, completion: 0.48, cachedPrompt: 0.06 },
      freeDailyTokens: 0,
    },
  },

  // ── 6. Long-Context & Multilingual ──
  {
    slug: "gemini-pro-1m",
    name: "Gemini Pro 1M",
    displayName: "Gemini Pro (1 Million Context)",
    family: "Google",
    category: "long_context",
    categoryLabel: "Long-Context & Multilingual",
    description: "Full repository and multi-hour document ingestion engine with a full 1,048,576 token context window.",
    contextWindow: 1048576,
    maxOutputTokens: 64000,
    backendTarget: "openrouter/google/gemini-2.0-flash-001",
    fallbackChain: [
      "openrouter/google/gemini-2.0-flash-001",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["gemini-1m", "google/gemini-1m"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: true,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1020, completion: 4080, cachedPrompt: 510 },
      usd: { prompt: 0.12, completion: 0.48, cachedPrompt: 0.06 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "minimax-m3.1-flash",
    name: "MiniMax M3.1 Flash",
    displayName: "MiniMax M3.1 Flash (1M Context)",
    family: "MiniMax",
    category: "long_context",
    categoryLabel: "Long-Context & Multilingual",
    description: "1M token context engine specialized in multi-party conversation histories, audio scripts, and long novels.",
    contextWindow: 1000000,
    maxOutputTokens: 32768,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: ["prorouter/deepseek-v4.1-flash", "groq/qwen3.8-27b"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["minimax-1m", "minimax/minimax-m3.1-flash"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: {
      inr: { prompt: 1700, completion: 5100, cachedPrompt: 850 },
      usd: { prompt: 0.20, completion: 0.60, cachedPrompt: 0.10 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "kimi-k3",
    name: "Kimi K3",
    displayName: "Moonshot Kimi K3",
    family: "Moonshot",
    category: "long_context",
    categoryLabel: "Long-Context & Multilingual",
    description: "Moonshot AI 200k context model renowned for high needle-in-a-haystack retrieval accuracy across long documents.",
    contextWindow: 200000,
    maxOutputTokens: 64000,
    backendTarget: "prorouter/deepseek-v4.1-flash",
    fallbackChain: ["prorouter/deepseek-v4.1-flash", "groq/qwen3.8-27b"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["moonshot/kimi-k3", "kimi"],
    recommendedForAgents: false,
    supportsNativeTools: true,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 5100, completion: 20400, cachedPrompt: 2550 },
      usd: { prompt: 0.60, completion: 2.40, cachedPrompt: 0.30 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "gemma-4-31b-it",
    name: "Gemma 4 31B IT",
    displayName: "Google Gemma 4 31B IT (Tamil / Indic)",
    family: "Google",
    category: "long_context",
    categoryLabel: "Long-Context & Multilingual",
    description: "Google 31B instruction model with dedicated high-accuracy fine-tuning for Tamil, Hindi, and South Asian languages.",
    contextWindow: 262144,
    maxOutputTokens: 8192,
    backendTarget: "requesty/gemma-4-31b-it",
    fallbackChain: [
      "requesty/gemma-4-31b-it",
      "groq/qwen3.8-27b",
      "prorouter/deepseek-v4.1-flash",
    ],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["google/gemma-4-31b-it", "gemma-indic"],
    recommendedForAgents: false,
    supportsNativeTools: false,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: true,
    pricing: {
      inr: { prompt: 1190, completion: 3570, cachedPrompt: 595 },
      usd: { prompt: 0.14, completion: 0.42, cachedPrompt: 0.07 },
      freeDailyTokens: 0,
    },
  },
  {
    slug: "allam-2-7b",
    name: "Allam 2 7B",
    displayName: "Allam 2 7B (Arabic / English)",
    family: "Allam",
    category: "long_context",
    categoryLabel: "Long-Context & Multilingual",
    description: "Specialized bilingual Arabic and English foundation model served via Groq LPU for low-latency regional services.",
    contextWindow: 4096,
    maxOutputTokens: 2048,
    backendTarget: "groq/allam-2-7b",
    fallbackChain: ["groq/allam-2-7b", "prorouter/deepseek-v4.1-flash"],
    isFree: false,
    freeDailyTokens: 0,
    aliases: ["allam", "groq/allam-2-7b"],
    recommendedForAgents: false,
    supportsNativeTools: false,
    supportsStreamingTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: {
      inr: { prompt: 425, completion: 1275, cachedPrompt: 213 },
      usd: { prompt: 0.05, completion: 0.15, cachedPrompt: 0.03 },
      freeDailyTokens: 0,
    },
  },
];

/** Shorthand virtual aliases for compatibility with legacy routes and third-party tools */
const VIRTUAL_TIER_MAPPINGS: Record<string, string> = {
  "pr-echo": "deepseek-v4.1-flash",
  "pr-beacon": "deepseek-v4.1-flash",
  "pr-vector": "qwen3.8-27b",
  "pr-prism": "qwen-2.5-coder-32b",
  "pr-zenith": "claude-3.5-sonnet",
  "pr-cortex": "gpt-4.1",
  "pr-quantum": "gpt-4o",
  "pr-aurora": "gemini-pro",
  "pr-apex": "claude-3-opus",
  "pr-titan": "nemotron-3-ultra-550b",
};

export class ModelAliasRegistry {
  private static lookupMap: Map<string, CuratedModelEntry> = new Map();
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    for (const model of CURATED_MODELS) {
      this.lookupMap.set(model.slug.toLowerCase(), model);
      for (const alias of model.aliases) {
        this.lookupMap.set(alias.toLowerCase(), model);
      }
    }
    this.initialized = true;
  }

  /**
   * Resolves any model slug, alias, or legacy tier name to its CuratedModelEntry.
   */
  public static resolve(slug: string): CuratedModelEntry | undefined {
    this.init();
    if (!slug) return undefined;
    const lower = slug.trim().toLowerCase();

    // 1. Direct or alias match
    const direct = this.lookupMap.get(lower);
    if (direct) return direct;

    // 2. Check virtual tier mappings
    const mappedSlug = VIRTUAL_TIER_MAPPINGS[lower];
    if (mappedSlug) {
      return this.lookupMap.get(mappedSlug);
    }

    // 3. Normalized family matches
    if (lower.startsWith("deepseek")) return this.lookupMap.get("deepseek-v4.1-flash");
    if (lower.startsWith("claude")) return this.lookupMap.get("claude-3.5-sonnet");
    if (lower.startsWith("qwen")) return this.lookupMap.get("qwen3.8-27b");
    if (lower.startsWith("gpt-4.1") || lower.startsWith("openai/gpt-4.1")) return this.lookupMap.get("gpt-4.1");
    if (lower.startsWith("gpt-4o") || lower.startsWith("openai/gpt-4o")) return this.lookupMap.get("gpt-4o");
    if (lower.startsWith("gemini")) return this.lookupMap.get("gemini-pro");
    if (lower.startsWith("mistral")) return this.lookupMap.get("mistral-large");
    if (lower.startsWith("nemotron")) return this.lookupMap.get("nemotron-3-ultra-550b");
    if (lower.startsWith("grok")) return this.lookupMap.get("grok-2");

    // 4. Default to universal fallback deepseek-v4.1-flash
    return this.lookupMap.get("deepseek-v4.1-flash");
  }

  /**
   * Resolves a slug to its executable BackendModel and verified fallback chain.
   */
  public static resolveToBackend(slug: string): {
    entry: CuratedModelEntry;
    backend: BackendModel;
    fallbackChain: BackendModel[];
  } {
    const entry = this.resolve(slug) || CURATED_MODELS[0];
    const backend =
      VERIFIED_BACKEND_MODELS[entry.backendTarget] ||
      VERIFIED_BACKEND_MODELS["prorouter/deepseek-v4.1-flash"];

    const fallbackChain: BackendModel[] = [];
    for (const fbId of entry.fallbackChain) {
      const fbModel = VERIFIED_BACKEND_MODELS[fbId];
      if (fbModel && !fallbackChain.some((b) => b.id === fbModel.id)) {
        fallbackChain.push(fbModel);
      }
    }

    // Include verified live multi-provider fallbacks so agent tool-calls never dead-end
    const liveFallbackIds = entry.supportsNativeTools
      ? [
          "requesty/nemotron-3.5-lightning-30b-a3b",
          "requesty/nemotron-3-ultra-550b-a55b",
          "nabh/gpt-oss-20b",
          "requesty/gemma-4-31b-it",
        ]
      : [
          "requesty/nemotron-3.5-lightning-30b-a3b",
          "requesty/gemma-4-31b-it",
          "nabh/gpt-oss-20b",
        ];
    for (const liveId of liveFallbackIds) {
      const liveModel = VERIFIED_BACKEND_MODELS[liveId];
      if (
        liveModel &&
        liveModel.id !== backend.id &&
        !fallbackChain.some((b) => b.id === liveModel.id)
      ) {
        fallbackChain.push(liveModel);
      }
    }

    // Ensure the guaranteed universal fallback deepseek-v4.1-flash is always terminal
    const universalFallback = VERIFIED_BACKEND_MODELS["prorouter/deepseek-v4.1-flash"];
    if (universalFallback && !fallbackChain.some((b) => b.id === universalFallback.id)) {
      fallbackChain.push(universalFallback);
    }

    return { entry, backend, fallbackChain };
  }

  /**
   * Returns all curated models.
   */
  public static getAllCuratedModels(): CuratedModelEntry[] {
    return CURATED_MODELS;
  }

  /**
   * Returns models belonging to a specific category.
   */
  public static getModelsByCategory(category: CuratedCategory): CuratedModelEntry[] {
    return CURATED_MODELS.filter((m) => m.category === category);
  }

  /**
   * Checks whether a given model slug supports native tool calling.
   */
  public static isNativeToolCapable(slug: string): boolean {
    const entry = this.resolve(slug);
    return entry ? entry.supportsNativeTools : false;
  }

  /**
   * Formats the curated catalog for GET /v1/models response, enriched with
   * coding-agent metadata (context_length, max_output_tokens, capabilities, dual pricing).
   */
  public static getOpenAiModelsList(): Array<Record<string, unknown>> {
    return CURATED_MODELS.map((m) => ({
      id: m.slug,
      object: "model",
      created: 1710000000,
      owned_by: "prorouter",
      name: m.name,
      display_name: m.displayName,
      family: m.family,
      category: m.category,
      category_label: m.categoryLabel,
      description: m.description,
      context_length: m.contextWindow,
      max_output_tokens: m.maxOutputTokens,
      recommended_for_agents: m.recommendedForAgents,
      capabilities: {
        tools: m.supportsNativeTools,
        streaming_tools: m.supportsStreamingTools,
        vision: m.supportsVision,
        reasoning: m.supportsReasoning,
        streaming: true,
        anthropic_compatible: true,
      },
      pricing: {
        inr: m.pricing.inr,
        usd: m.pricing.usd,
        free_daily_tokens: m.freeDailyTokens,
      },
    }));
  }
}
