import * as fs from "node:fs";
import * as path from "node:path";
import { ModelProfileRegistry } from "../packages/routing/src/profile-registry.js";
import { DEFAULT_USD_TO_INR_DISPLAY_RATE, isStrictlyPromotionalEligible } from "../packages/shared/src/pricing-engine.js";

const allProfiles = ModelProfileRegistry.getAll();
console.log(`[sync-frontend-dataset] Loaded ${allProfiles.length} profiles from ModelProfileRegistry.`);

const displayRate = DEFAULT_USD_TO_INR_DISPLAY_RATE; // 80.0

const webProfiles = allProfiles.map((p) => {
  const isPromo = p.id === "deepseek-v4.1-flash" || p.id === "qwen3.8-27b";
  const inputUsd = p.customerPricingUsd?.inputPerMillion ?? 0.20;
  const outputUsd = p.customerPricingUsd?.outputPerMillion ?? 0.80;
  const cachedInputUsd = p.customerPricingUsd?.cachedInputPerMillion ?? 0;

  const inrInputPaise = Math.ceil(inputUsd * displayRate * 100);
  const inrOutputPaise = Math.ceil(outputUsd * displayRate * 100);
  const inrCachedInputPaise = cachedInputUsd > 0 ? Math.ceil(cachedInputUsd * displayRate * 100) : 0;

  const prov = p.provider || (p.routingPolicy?.preferredProvider ?? p.routingPolicy?.primaryBackend?.split("/")[0]) || "prorouter";

  return {
    id: p.id,
    slug: p.id,
    canonicalModelId: p.canonicalModelId ?? p.id,
    name: p.name,
    category: p.category,
    categoryLabel: p.categoryLabel,
    description: p.description,
    providerName: p.routingPolicy?.preferredProvider ? p.routingPolicy.preferredProvider.toUpperCase() : prov.toUpperCase(),
    providerSlug: prov.toLowerCase(),
    type: "chat",
    status: p.status === "experimental" ? "preview" : "active",
    isFree: isPromo, // STRICTLY ONLY TRUE FOR THE TWO PROMOTIONAL CANONICAL MODELS
    pricingStatus: p.pricingStatus ?? "approved",
    pricing: {
      inputPerMillion: inrInputPaise,
      outputPerMillion: inrOutputPaise,
      cachedInputPerMillion: inrCachedInputPaise,
      currency: "INR",
    },
    customerPricingUsd: {
      inputPerMillion: inputUsd,
      outputPerMillion: outputUsd,
      cachedInputPerMillion: cachedInputUsd,
    },
    upstreamCostUsd: p.upstreamCostUsd ? {
      inputPerMillion: p.upstreamCostUsd.inputPerMillion,
      outputPerMillion: p.upstreamCostUsd.outputPerMillion,
      cachedInputPerMillion: p.upstreamCostUsd.cachedInputPerMillion,
    } : undefined,
    capabilities: {
      modalities: p.capabilities.vision === "supported" ? ["text", "image"] : ["text"],
      streaming: p.capabilities.streaming === "supported",
      toolCalls: p.capabilities.tool_calling === "supported",
      structuredOutputs: p.capabilities.json_structured === "supported",
      reasoning: p.capabilities.reasoning === "supported",
      vision: p.capabilities.vision === "supported",
      imageGeneration: false,
      audio: false,
      jsonMode: true,
    },
    contextWindow: p.contextWindow,
    maxOutputTokens: p.maxOutputTokens,
    rank: p.rank,
    popularity: p.popularity,
    rating: p.rating,
    latencyMs: p.capabilities.low_latency === "supported" ? 95 : 180,
    available: true,
    benchmarks: p.benchmarks,
  };
});

const freeCount = webProfiles.filter((m) => m.isFree).length;
console.log(`[sync-frontend-dataset] Total models: ${webProfiles.length}, Free models: ${freeCount}`);
if (freeCount !== 2) {
  console.warn(`WARNING: Expected exactly 2 free promotional models, found ${freeCount}`);
}

const fileContent = `/**
 * Pre-compiled 500+ Frontend Model Profiles dataset.
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

export const MODEL_PROFILES_500: ModelSummary[] = ${JSON.stringify(webProfiles, null, 2)};

export const ALL_MODELS_500: WebModelEntry[] = MODEL_PROFILES_500.map((m) => ({
  id: m.slug,
  name: m.name,
  object: "model",
  created: 1710000000,
  owned_by: m.providerSlug || "prorouter",
  category: m.category,
  description: m.description,
  pricing: {
    input_usd_per_million: m.customerPricingUsd?.inputPerMillion ?? (m.pricing.inputPerMillion / 8000),
    output_usd_per_million: m.customerPricingUsd?.outputPerMillion ?? (m.pricing.outputPerMillion / 8000),
  },
}));
`;

const targetPath = path.resolve(process.cwd(), "apps/web/lib/model-profiles-data.ts");
fs.writeFileSync(targetPath, fileContent, "utf-8");
console.log(`[sync-frontend-dataset] Successfully written to ${targetPath}`);
