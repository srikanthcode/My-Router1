/**
 * Pre-compiled curated Frontend Model Profiles dataset.
 * Synchronized with the central dynamic pricing engine and ModelProfileRegistry.
 * STRICT POLICY: Only deepseek-v4.1-flash and qwen3.8-27b receive 48h free promotion.
 */

import type { ModelSummary } from "./server-api";

export interface WebModelEntry {
  id: string;
  name: string;
  object: string;
  created: number;
  owned_by: string;
  category?: string;
  tier?: string;
  description?: string;
  pricing?: {
    input_usd_per_million: number;
    output_usd_per_million: number;
  };
}

export const MODEL_PROFILES_500: ModelSummary[] = [
  {
    "id": "deepseek-v4.1-flash",
    "slug": "deepseek-v4.1-flash",
    "canonicalModelId": "deepseek-v4.1-flash",
    "name": "DeepSeek V4.1 Flash",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Ultra-fast frontier coding engine with native tool calling, deep reasoning, and 1,000,000 daily free tokens.",
    "providerName": "DEEPSEEK",
    "providerSlug": "deepseek",
    "type": "chat",
    "status": "active",
    "isFree": true,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1785,
      "outputPerMillion": 3485,
      "cachedInputPerMillion": 850,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.21,
      "outputPerMillion": 0.41,
      "cachedInputPerMillion": 0.1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.147,
      "outputPerMillion": 0.287,
      "cachedInputPerMillion": 0.07
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 262144,
    "maxOutputTokens": 128000,
    "rank": 1,
    "popularity": 10000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "deepseek-v4-pro",
    "slug": "deepseek-v4-pro",
    "canonicalModelId": "deepseek-v4-pro",
    "name": "DeepSeek V4 Pro",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Dedicated coding architecture snapshot for high-precision autonomous codebases, refactoring, and AST manipulation.",
    "providerName": "DEEPSEEK",
    "providerSlug": "deepseek",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 2465,
      "outputPerMillion": 7480,
      "cachedInputPerMillion": 1275,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.29,
      "outputPerMillion": 0.88,
      "cachedInputPerMillion": 0.15
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.203,
      "outputPerMillion": 0.616,
      "cachedInputPerMillion": 0.105
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 262144,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "claude-3.5-sonnet",
    "slug": "claude-3.5-sonnet",
    "canonicalModelId": "claude-3.5-sonnet",
    "name": "Claude 3.5 Sonnet",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Industry gold standard for agentic software engineering, file editing, and autonomous terminal execution.",
    "providerName": "ANTHROPIC",
    "providerSlug": "anthropic",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 25500,
      "outputPerMillion": 127500,
      "cachedInputPerMillion": 12750,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 3,
      "outputPerMillion": 15,
      "cachedInputPerMillion": 1.5
    },
    "upstreamCostUsd": {
      "inputPerMillion": 2.1,
      "outputPerMillion": 10.5,
      "cachedInputPerMillion": 1.05
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "claude-opus-5",
    "slug": "claude-opus-5",
    "canonicalModelId": "claude-opus-5",
    "name": "Claude Opus 5",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Ultra-high capability frontier model for complex architectural refactoring and multi-step agentic planning.",
    "providerName": "ANTHROPIC",
    "providerSlug": "anthropic",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 85000,
      "outputPerMillion": 425000,
      "cachedInputPerMillion": 42500,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 10,
      "outputPerMillion": 50,
      "cachedInputPerMillion": 5
    },
    "upstreamCostUsd": {
      "inputPerMillion": 7,
      "outputPerMillion": 35,
      "cachedInputPerMillion": 3.5
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 250000,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-4.1",
    "slug": "gpt-4.1",
    "canonicalModelId": "gpt-4.1",
    "name": "GPT-4.1",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "OpenAI flagship high-precision coding model with native tool calls and 128k context window.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 21250,
      "outputPerMillion": 85000,
      "cachedInputPerMillion": 10625,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2.5,
      "outputPerMillion": 10,
      "cachedInputPerMillion": 1.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.75,
      "outputPerMillion": 7,
      "cachedInputPerMillion": 0.875
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 16384,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-5-codex",
    "slug": "gpt-5-codex",
    "canonicalModelId": "gpt-5-codex",
    "name": "GPT-5 Codex",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Next-generation autonomous coding engine with optimized function calling and low token footprint.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 21250,
      "outputPerMillion": 85000,
      "cachedInputPerMillion": 10625,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2.5,
      "outputPerMillion": 10,
      "cachedInputPerMillion": 1.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.75,
      "outputPerMillion": 7,
      "cachedInputPerMillion": 0.875
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 16384,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "qwen3-coder-next",
    "slug": "qwen3-coder-next",
    "canonicalModelId": "qwen3-coder-next",
    "name": "Qwen3 Coder Next",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Alibaba next-gen autonomous coding agent with exceptional MultiPL-E and HumanEval benchmark performance.",
    "providerName": "QWEN",
    "providerSlug": "qwen",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 2975,
      "outputPerMillion": 11900,
      "cachedInputPerMillion": 1445,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.35,
      "outputPerMillion": 1.4,
      "cachedInputPerMillion": 0.17
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.245,
      "outputPerMillion": 0.98,
      "cachedInputPerMillion": 0.119
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "qwen-2.5-coder-32b",
    "slug": "qwen-2.5-coder-32b",
    "canonicalModelId": "qwen-2.5-coder-32b",
    "name": "Qwen 2.5 Coder 32B",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Dedicated 32B code model matching frontier 70B models in repository comprehension and syntax generation.",
    "providerName": "QWEN",
    "providerSlug": "qwen",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 2550,
      "outputPerMillion": 10030,
      "cachedInputPerMillion": 1275,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.3,
      "outputPerMillion": 1.18,
      "cachedInputPerMillion": 0.15
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.21,
      "outputPerMillion": 0.826,
      "cachedInputPerMillion": 0.105
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "kimi-k2.7-code",
    "slug": "kimi-k2.7-code",
    "canonicalModelId": "kimi-k2.7-code",
    "name": "Kimi K2.7 Code",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Moonshot AI 200k context code specialist for whole-repo analysis and automated test writing.",
    "providerName": "MOONSHOT",
    "providerSlug": "moonshot",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 5100,
      "outputPerMillion": 20400,
      "cachedInputPerMillion": 2550,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.6,
      "outputPerMillion": 2.4,
      "cachedInputPerMillion": 0.3
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.42,
      "outputPerMillion": 1.68,
      "cachedInputPerMillion": 0.21
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "devstral-24b",
    "slug": "devstral-24b",
    "canonicalModelId": "devstral-24b",
    "name": "Devstral 24B",
    "category": "coding",
    "categoryLabel": "Coding & Agentic",
    "description": "Mistral AI developer coding model specialized in CI/CD pipeline automation and code conversion.",
    "providerName": "MISTRAL",
    "providerSlug": "mistral",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 3400,
      "outputPerMillion": 10200,
      "cachedInputPerMillion": 1700,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.4,
      "outputPerMillion": 1.2,
      "cachedInputPerMillion": 0.2
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.28,
      "outputPerMillion": 0.84,
      "cachedInputPerMillion": 0.14
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 32768,
    "rank": 1,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-4o",
    "slug": "gpt-4o",
    "canonicalModelId": "gpt-4o",
    "name": "GPT-4o",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "OpenAI multimodal flagship for general reasoning, conversational chat, writing, and structured outputs.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 21250,
      "outputPerMillion": 85000,
      "cachedInputPerMillion": 10625,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2.5,
      "outputPerMillion": 10,
      "cachedInputPerMillion": 1.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.75,
      "outputPerMillion": 7,
      "cachedInputPerMillion": 0.875
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 16384,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-6-luna",
    "slug": "gpt-6-luna",
    "canonicalModelId": "gpt-6-luna",
    "name": "GPT-6 Luna",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "High-density conversational intelligence with 256k context window for long documents and summarization.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 17000,
      "outputPerMillion": 68000,
      "cachedInputPerMillion": 8500,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2,
      "outputPerMillion": 8,
      "cachedInputPerMillion": 1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.4,
      "outputPerMillion": 5.6,
      "cachedInputPerMillion": 0.7
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 256000,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gemini-pro",
    "slug": "gemini-pro",
    "canonicalModelId": "gemini-pro",
    "name": "Gemini 2.0 Flash / Pro",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "Google multimodal engine with 1M context window for broad reasoning, document ingestion, and chat.",
    "providerName": "GOOGLE",
    "providerSlug": "google",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1020,
      "outputPerMillion": 4080,
      "cachedInputPerMillion": 510,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.12,
      "outputPerMillion": 0.48,
      "cachedInputPerMillion": 0.06
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.084,
      "outputPerMillion": 0.336,
      "cachedInputPerMillion": 0.042
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "grok-2",
    "slug": "grok-2",
    "canonicalModelId": "grok-2",
    "name": "Grok 2",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "xAI conversational engine offering real-time world knowledge and frank, candid dialog.",
    "providerName": "XAI",
    "providerSlug": "xai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 17000,
      "outputPerMillion": 85000,
      "cachedInputPerMillion": 8500,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2,
      "outputPerMillion": 10,
      "cachedInputPerMillion": 1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.4,
      "outputPerMillion": 7,
      "cachedInputPerMillion": 0.7
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "mistral-large",
    "slug": "mistral-large",
    "canonicalModelId": "mistral-large",
    "name": "Mistral Large",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "Mistral AI flagship reasoning model with multilingual fluency and precise instruction following.",
    "providerName": "MISTRAL",
    "providerSlug": "mistral",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 17000,
      "outputPerMillion": 51000,
      "cachedInputPerMillion": 8500,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2,
      "outputPerMillion": 6,
      "cachedInputPerMillion": 1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.4,
      "outputPerMillion": 4.2,
      "cachedInputPerMillion": 0.7
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "beam-v1",
    "slug": "beam-v1",
    "canonicalModelId": "beam-v1",
    "name": "Beam v1",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "General-purpose high-speed conversational model for summaries, outlines, and email drafts.",
    "providerName": "PROROUTER",
    "providerSlug": "prorouter",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 4250,
      "outputPerMillion": 12750,
      "cachedInputPerMillion": 2125,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.5,
      "outputPerMillion": 1.5,
      "cachedInputPerMillion": 0.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.35,
      "outputPerMillion": 1.05,
      "cachedInputPerMillion": 0.175
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "jev-1.13",
    "slug": "jev-1.13",
    "canonicalModelId": "jev-1.13",
    "name": "Jev 1.13",
    "category": "text",
    "categoryLabel": "Text & General Chat",
    "description": "Compact conversational model tuned for short answers, fact retrieval, and structured formatting.",
    "providerName": "PROROUTER",
    "providerSlug": "prorouter",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 2550,
      "outputPerMillion": 7650,
      "cachedInputPerMillion": 1275,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.3,
      "outputPerMillion": 0.9,
      "cachedInputPerMillion": 0.15
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.21,
      "outputPerMillion": 0.63,
      "cachedInputPerMillion": 0.105
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 16384,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "claude-3-opus",
    "slug": "claude-3-opus",
    "canonicalModelId": "claude-3-opus",
    "name": "Claude 3 Opus",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Deep qualitative synthesis, formal logic, legal analysis, and complex hypothesis testing.",
    "providerName": "ANTHROPIC",
    "providerSlug": "anthropic",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 127500,
      "outputPerMillion": 637500,
      "cachedInputPerMillion": 63750,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 15,
      "outputPerMillion": 75,
      "cachedInputPerMillion": 7.5
    },
    "upstreamCostUsd": {
      "inputPerMillion": 10.5,
      "outputPerMillion": 52.5,
      "cachedInputPerMillion": 5.25
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-6.1-sol",
    "slug": "gpt-6.1-sol",
    "canonicalModelId": "gpt-6.1-sol",
    "name": "GPT-6.1 Sol",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Frontier mathematical proofs, quantitative modeling, and algorithmic problem decomposition.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 25500,
      "outputPerMillion": 102000,
      "cachedInputPerMillion": 12750,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 3,
      "outputPerMillion": 12,
      "cachedInputPerMillion": 1.5
    },
    "upstreamCostUsd": {
      "inputPerMillion": 2.1,
      "outputPerMillion": 8.4,
      "cachedInputPerMillion": 1.05
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 256000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-6.1-terra",
    "slug": "gpt-6.1-terra",
    "canonicalModelId": "gpt-6.1-terra",
    "name": "GPT-6.1 Terra",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Research & analysis engine for cross-disciplinary literature reviews and strategic roadmaps.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 21250,
      "outputPerMillion": 85000,
      "cachedInputPerMillion": 10625,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2.5,
      "outputPerMillion": 10,
      "cachedInputPerMillion": 1.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.75,
      "outputPerMillion": 7,
      "cachedInputPerMillion": 0.875
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 256000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "nemotron-3-ultra-550b",
    "slug": "nemotron-3-ultra-550b",
    "canonicalModelId": "nemotron-3-ultra-550b",
    "name": "Nemotron 3 Ultra 550B",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "NVIDIA 550B MoE frontier reasoning model with 1M context window for massive datasets and physics simulations.",
    "providerName": "NVIDIA",
    "providerSlug": "nvidia",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 5950,
      "outputPerMillion": 17850,
      "cachedInputPerMillion": 2975,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.7,
      "outputPerMillion": 2.1,
      "cachedInputPerMillion": 0.35
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.49,
      "outputPerMillion": 1.47,
      "cachedInputPerMillion": 0.245
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 65536,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "glm-5.3",
    "slug": "glm-5.3",
    "canonicalModelId": "glm-5.3",
    "name": "GLM-5.3",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Bilingual frontier reasoning model with deep expertise in Chinese/English logic and quantitative reasoning.",
    "providerName": "ZHIPU",
    "providerSlug": "zhipu",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 3400,
      "outputPerMillion": 10200,
      "cachedInputPerMillion": 1700,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.4,
      "outputPerMillion": 1.2,
      "cachedInputPerMillion": 0.2
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.28,
      "outputPerMillion": 0.84,
      "cachedInputPerMillion": 0.14
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "mimo-v2.6-pro",
    "slug": "mimo-v2.6-pro",
    "canonicalModelId": "mimo-v2.6-pro",
    "name": "MiMo-V2.6 Pro",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Xiaomi 1M context deep reasoning model designed for end-to-end mathematical analysis and long-form synthesis.",
    "providerName": "XIAOMI",
    "providerSlug": "xiaomi",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 4250,
      "outputPerMillion": 12750,
      "cachedInputPerMillion": 2125,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.5,
      "outputPerMillion": 1.5,
      "cachedInputPerMillion": 0.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.35,
      "outputPerMillion": 1.05,
      "cachedInputPerMillion": 0.175
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "leanstral-1-5",
    "slug": "leanstral-1-5",
    "canonicalModelId": "leanstral-1-5",
    "name": "Leanstral 1.5",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Mistral AI specialized engine for formal mathematical verification, Lean 4 proofs, and theorem proving.",
    "providerName": "MISTRAL",
    "providerSlug": "mistral",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1020,
      "outputPerMillion": 3060,
      "cachedInputPerMillion": 510,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.12,
      "outputPerMillion": 0.36,
      "cachedInputPerMillion": 0.06
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.084,
      "outputPerMillion": 0.252,
      "cachedInputPerMillion": 0.042
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": false,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 262144,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-oss-120b",
    "slug": "gpt-oss-120b",
    "canonicalModelId": "gpt-oss-120b",
    "name": "GPT OSS 120B",
    "category": "reasoning",
    "categoryLabel": "Deep Reasoning & Math",
    "description": "Open-weight 120B reasoning model accelerated on Groq LPUs for instant token streaming.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 2550,
      "outputPerMillion": 10200,
      "cachedInputPerMillion": 1275,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.3,
      "outputPerMillion": 1.2,
      "cachedInputPerMillion": 0.15
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.21,
      "outputPerMillion": 0.84,
      "cachedInputPerMillion": 0.105
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "qwen3.8-27b",
    "slug": "qwen3.8-27b",
    "canonicalModelId": "qwen3.8-27b",
    "name": "Qwen 3.8 27B",
    "category": "fast",
    "categoryLabel": "Fast & Low-Latency",
    "description": "Groq LPU hardware accelerated model with <150ms TTFT, Indic multilingual fluency, and 1,000,000 free tokens/day.",
    "providerName": "QWEN",
    "providerSlug": "qwen",
    "type": "chat",
    "status": "active",
    "isFree": true,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 2550,
      "outputPerMillion": 10030,
      "cachedInputPerMillion": 1275,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.3,
      "outputPerMillion": 1.18,
      "cachedInputPerMillion": 0.15
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.21,
      "outputPerMillion": 0.826,
      "cachedInputPerMillion": 0.105
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 64000,
    "rank": 1,
    "popularity": 10000,
    "rating": 98,
    "latencyMs": 95,
    "available": true
  },
  {
    "id": "gpt-oss-20b",
    "slug": "gpt-oss-20b",
    "canonicalModelId": "gpt-oss-20b",
    "name": "GPT OSS 20B",
    "category": "fast",
    "categoryLabel": "Fast & Low-Latency",
    "description": "Compact 20B open reasoning model optimized for sub-100ms response times and high-volume background pipelines.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 680,
      "outputPerMillion": 2040,
      "cachedInputPerMillion": 340,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.08,
      "outputPerMillion": 0.24,
      "cachedInputPerMillion": 0.04
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.056,
      "outputPerMillion": 0.168,
      "cachedInputPerMillion": 0.028
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 16384,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 95,
    "available": true
  },
  {
    "id": "glm-5.3-flash",
    "slug": "glm-5.3-flash",
    "canonicalModelId": "glm-5.3-flash",
    "name": "GLM-5.3 Flash",
    "category": "fast",
    "categoryLabel": "Fast & Low-Latency",
    "description": "Fast bilingual inference engine designed for conversational customer bots and real-time chat translation.",
    "providerName": "ZHIPU",
    "providerSlug": "zhipu",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1700,
      "outputPerMillion": 5100,
      "cachedInputPerMillion": 850,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.2,
      "outputPerMillion": 0.6,
      "cachedInputPerMillion": 0.1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.14,
      "outputPerMillion": 0.42,
      "cachedInputPerMillion": 0.07
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": false,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 95,
    "available": true
  },
  {
    "id": "mimo-v2.6-flash",
    "slug": "mimo-v2.6-flash",
    "canonicalModelId": "mimo-v2.6-flash",
    "name": "MiMo-V2.6 Flash",
    "category": "fast",
    "categoryLabel": "Fast & Low-Latency",
    "description": "Lightweight conversational engine with 1M context window tuned for ultra-fast summarization.",
    "providerName": "XIAOMI",
    "providerSlug": "xiaomi",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1700,
      "outputPerMillion": 5100,
      "cachedInputPerMillion": 850,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.2,
      "outputPerMillion": 0.6,
      "cachedInputPerMillion": 0.1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.14,
      "outputPerMillion": 0.42,
      "cachedInputPerMillion": 0.07
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": false,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 95,
    "available": true
  },
  {
    "id": "ling-3.1-flash",
    "slug": "ling-3.1-flash",
    "canonicalModelId": "ling-3.1-flash",
    "name": "Ling 3.1 Flash",
    "category": "fast",
    "categoryLabel": "Fast & Low-Latency",
    "description": "Novita high-throughput streaming model for instant completions, classification, and text transforms.",
    "providerName": "NOVITA",
    "providerSlug": "novita",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 680,
      "outputPerMillion": 2040,
      "cachedInputPerMillion": 340,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.08,
      "outputPerMillion": 0.24,
      "cachedInputPerMillion": 0.04
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.056,
      "outputPerMillion": 0.168,
      "cachedInputPerMillion": 0.028
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": false,
      "structuredOutputs": true,
      "reasoning": false,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 262144,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 95,
    "available": true
  },
  {
    "id": "nemotron-3.5-lightning",
    "slug": "nemotron-3.5-lightning",
    "canonicalModelId": "nemotron-3.5-lightning",
    "name": "Nemotron 3.5 Lightning",
    "category": "fast",
    "categoryLabel": "Fast & Low-Latency",
    "description": "NVIDIA high-throughput agentic model with 1M context window for rapid multi-step workflows.",
    "providerName": "NVIDIA",
    "providerSlug": "nvidia",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 850,
      "outputPerMillion": 2550,
      "cachedInputPerMillion": 425,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.1,
      "outputPerMillion": 0.3,
      "cachedInputPerMillion": 0.05
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.07,
      "outputPerMillion": 0.21,
      "cachedInputPerMillion": 0.035
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 65536,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 95,
    "available": true
  },
  {
    "id": "nemotron-3.5-super-vl",
    "slug": "nemotron-3.5-super-vl",
    "canonicalModelId": "nemotron-3.5-super-vl",
    "name": "Nemotron 3.5 Super VL",
    "category": "vision",
    "categoryLabel": "Vision & Multimodal",
    "description": "NVIDIA state-of-the-art vision-language model for UI screenshots, diagrams, chart data extraction, and OCR.",
    "providerName": "NVIDIA",
    "providerSlug": "nvidia",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1700,
      "outputPerMillion": 5100,
      "cachedInputPerMillion": 850,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.2,
      "outputPerMillion": 0.6,
      "cachedInputPerMillion": 0.1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.14,
      "outputPerMillion": 0.42,
      "cachedInputPerMillion": 0.07
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": false,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "nemotron-3-nano-omni-30b",
    "slug": "nemotron-3-nano-omni-30b",
    "canonicalModelId": "nemotron-3-nano-omni-30b",
    "name": "Nemotron 3 Nano Omni 30B",
    "category": "vision",
    "categoryLabel": "Vision & Multimodal",
    "description": "Integrated visual reasoning and document understanding model for structured invoice and receipt processing.",
    "providerName": "NVIDIA",
    "providerSlug": "nvidia",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1275,
      "outputPerMillion": 3825,
      "cachedInputPerMillion": 680,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.15,
      "outputPerMillion": 0.45,
      "cachedInputPerMillion": 0.08
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.105,
      "outputPerMillion": 0.315,
      "cachedInputPerMillion": 0.056
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": false,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 131072,
    "maxOutputTokens": 20480,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gpt-4o-vision",
    "slug": "gpt-4o-vision",
    "canonicalModelId": "gpt-4o-vision",
    "name": "GPT-4o Vision",
    "category": "vision",
    "categoryLabel": "Vision & Multimodal",
    "description": "OpenAI multimodal visual reasoning for complex software UI mockups, architectural schematics, and design review.",
    "providerName": "OPENAI",
    "providerSlug": "openai",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 21250,
      "outputPerMillion": 85000,
      "cachedInputPerMillion": 10625,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 2.5,
      "outputPerMillion": 10,
      "cachedInputPerMillion": 1.25
    },
    "upstreamCostUsd": {
      "inputPerMillion": 1.75,
      "outputPerMillion": 7,
      "cachedInputPerMillion": 0.875
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 128000,
    "maxOutputTokens": 16384,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gemini-pro-vision",
    "slug": "gemini-pro-vision",
    "canonicalModelId": "gemini-pro-vision",
    "name": "Gemini Pro Vision",
    "category": "vision",
    "categoryLabel": "Vision & Multimodal",
    "description": "Google multimodal engine for ultra-high-resolution imagery, video frame sequence understanding, and visual OCR.",
    "providerName": "GOOGLE",
    "providerSlug": "google",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1020,
      "outputPerMillion": 4080,
      "cachedInputPerMillion": 510,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.12,
      "outputPerMillion": 0.48,
      "cachedInputPerMillion": 0.06
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.084,
      "outputPerMillion": 0.336,
      "cachedInputPerMillion": 0.042
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gemini-pro-1m",
    "slug": "gemini-pro-1m",
    "canonicalModelId": "gemini-pro-1m",
    "name": "Gemini Pro 1M",
    "category": "long_context",
    "categoryLabel": "Long-Context & Multilingual",
    "description": "Full repository and multi-hour document ingestion engine with a full 1,048,576 token context window.",
    "providerName": "GOOGLE",
    "providerSlug": "google",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1020,
      "outputPerMillion": 4080,
      "cachedInputPerMillion": 510,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.12,
      "outputPerMillion": 0.48,
      "cachedInputPerMillion": 0.06
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.084,
      "outputPerMillion": 0.336,
      "cachedInputPerMillion": 0.042
    },
    "capabilities": {
      "modalities": [
        "text",
        "image"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": true,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1048576,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "minimax-m3.1-flash",
    "slug": "minimax-m3.1-flash",
    "canonicalModelId": "minimax-m3.1-flash",
    "name": "MiniMax M3.1 Flash",
    "category": "long_context",
    "categoryLabel": "Long-Context & Multilingual",
    "description": "1M token context engine specialized in multi-party conversation histories, audio scripts, and long novels.",
    "providerName": "MINIMAX",
    "providerSlug": "minimax",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1700,
      "outputPerMillion": 5100,
      "cachedInputPerMillion": 850,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.2,
      "outputPerMillion": 0.6,
      "cachedInputPerMillion": 0.1
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.14,
      "outputPerMillion": 0.42,
      "cachedInputPerMillion": 0.07
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": false,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 1000000,
    "maxOutputTokens": 32768,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "kimi-k3",
    "slug": "kimi-k3",
    "canonicalModelId": "kimi-k3",
    "name": "Kimi K3",
    "category": "long_context",
    "categoryLabel": "Long-Context & Multilingual",
    "description": "Moonshot AI 200k context model renowned for high needle-in-a-haystack retrieval accuracy across long documents.",
    "providerName": "MOONSHOT",
    "providerSlug": "moonshot",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 5100,
      "outputPerMillion": 20400,
      "cachedInputPerMillion": 2550,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.6,
      "outputPerMillion": 2.4,
      "cachedInputPerMillion": 0.3
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.42,
      "outputPerMillion": 1.68,
      "cachedInputPerMillion": 0.21
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": true,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 200000,
    "maxOutputTokens": 64000,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "gemma-4-31b-it",
    "slug": "gemma-4-31b-it",
    "canonicalModelId": "gemma-4-31b-it",
    "name": "Gemma 4 31B IT",
    "category": "long_context",
    "categoryLabel": "Long-Context & Multilingual",
    "description": "Google 31B instruction model with dedicated high-accuracy fine-tuning for Tamil, Hindi, and South Asian languages.",
    "providerName": "GOOGLE",
    "providerSlug": "google",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 1190,
      "outputPerMillion": 3570,
      "cachedInputPerMillion": 595,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.14,
      "outputPerMillion": 0.42,
      "cachedInputPerMillion": 0.07
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.098,
      "outputPerMillion": 0.294,
      "cachedInputPerMillion": 0.049
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": false,
      "structuredOutputs": true,
      "reasoning": true,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 262144,
    "maxOutputTokens": 8192,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  },
  {
    "id": "allam-2-7b",
    "slug": "allam-2-7b",
    "canonicalModelId": "allam-2-7b",
    "name": "Allam 2 7B",
    "category": "long_context",
    "categoryLabel": "Long-Context & Multilingual",
    "description": "Specialized bilingual Arabic and English foundation model served via Groq LPU for low-latency regional services.",
    "providerName": "ALLAM",
    "providerSlug": "allam",
    "type": "chat",
    "status": "active",
    "isFree": false,
    "pricingStatus": "approved",
    "pricing": {
      "inputPerMillion": 425,
      "outputPerMillion": 1275,
      "cachedInputPerMillion": 255,
      "currency": "INR"
    },
    "customerPricingUsd": {
      "inputPerMillion": 0.05,
      "outputPerMillion": 0.15,
      "cachedInputPerMillion": 0.03
    },
    "upstreamCostUsd": {
      "inputPerMillion": 0.035,
      "outputPerMillion": 0.105,
      "cachedInputPerMillion": 0.021
    },
    "capabilities": {
      "modalities": [
        "text"
      ],
      "streaming": true,
      "toolCalls": false,
      "structuredOutputs": true,
      "reasoning": false,
      "vision": false,
      "imageGeneration": false,
      "audio": false,
      "jsonMode": true
    },
    "contextWindow": 4096,
    "maxOutputTokens": 2048,
    "rank": 10,
    "popularity": 9000,
    "rating": 98,
    "latencyMs": 180,
    "available": true
  }
];

export const ALL_MODELS_500: WebModelEntry[] = MODEL_PROFILES_500.map((m) => ({
  id: m.slug,
  name: m.name,
  object: "model",
  created: 1710000000,
  owned_by: m.providerSlug || "prorouter",
  category: m.category,
  description: m.description,
  pricing: {
    input_usd_per_million: m.customerPricingUsd?.inputPerMillion ?? (m.pricing.inputPerMillion / 8500),
    output_usd_per_million: m.customerPricingUsd?.outputPerMillion ?? (m.pricing.outputPerMillion / 8500),
  },
}));
