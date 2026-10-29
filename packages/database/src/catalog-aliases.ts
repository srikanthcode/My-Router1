export interface PricingTierSeed {
  slug: string;
  name: string;
  description: string;
  inputUsdCentsPerMillion: number;
  outputUsdCentsPerMillion: number;
  cachedInputUsdCentsPerMillion: number;
  sortOrder: number;
}

export const PRICING_TIER_SEEDS: PricingTierSeed[] = [
  {
    slug: "lite",
    name: "Lite",
    description: "Lowest-cost tier for lightweight aliases and everyday chat.",
    inputUsdCentsPerMillion: 20,
    outputUsdCentsPerMillion: 80,
    cachedInputUsdCentsPerMillion: 10,
    sortOrder: 10,
  },
  {
    slug: "flash",
    name: "Flash",
    description: "Fast, low-cost tier for high-volume drafting and extraction.",
    inputUsdCentsPerMillion: 30,
    outputUsdCentsPerMillion: 120,
    cachedInputUsdCentsPerMillion: 15,
    sortOrder: 20,
  },
  {
    slug: "standard",
    name: "Standard",
    description: "Balanced tier for general production workloads.",
    inputUsdCentsPerMillion: 50,
    outputUsdCentsPerMillion: 200,
    cachedInputUsdCentsPerMillion: 25,
    sortOrder: 30,
  },
  {
    slug: "code",
    name: "Code",
    description: "Tier tuned for coding assistants and repository-aware agents.",
    inputUsdCentsPerMillion: 75,
    outputUsdCentsPerMillion: 300,
    cachedInputUsdCentsPerMillion: 38,
    sortOrder: 40,
  },
  {
    slug: "reason",
    name: "Reason",
    description: "Tier for analytical, multi-step reasoning workloads.",
    inputUsdCentsPerMillion: 100,
    outputUsdCentsPerMillion: 400,
    cachedInputUsdCentsPerMillion: 50,
    sortOrder: 50,
  },
  {
    slug: "expert",
    name: "Expert",
    description: "Higher-capability tier for demanding professional work.",
    inputUsdCentsPerMillion: 150,
    outputUsdCentsPerMillion: 600,
    cachedInputUsdCentsPerMillion: 75,
    sortOrder: 60,
  },
  {
    slug: "ultra",
    name: "Ultra",
    description: "Premium tier for long-running, high-value tasks.",
    inputUsdCentsPerMillion: 200,
    outputUsdCentsPerMillion: 800,
    cachedInputUsdCentsPerMillion: 100,
    sortOrder: 70,
  },
  {
    slug: "max",
    name: "Max",
    description: "Top retail tier for maximum-priority alias workloads.",
    inputUsdCentsPerMillion: 300,
    outputUsdCentsPerMillion: 1200,
    cachedInputUsdCentsPerMillion: 150,
    sortOrder: 80,
  },
];

export const PRO_ALIAS_PROVIDER_SLUG = "prorouter-gateway";
export const PRO_ALIAS_UPSTREAM_MODEL_ID = "deepseek-ai/DeepSeek-V4.1-Flash-1017";
export const PRO_ALIAS_BACKEND_MODEL = "DeepSeek V4.1 Flash";
export const PRO_ALIAS_CONTEXT_WINDOW = 1_000_000;
export const PRO_ALIAS_MAX_OUTPUT_TOKENS = 128_000;

export const PRO_ALIAS_FAMILIES = [
  "orion",
  "nova",
  "atlas",
  "vega",
  "lyra",
  "sirius",
  "phoenix",
  "titan",
  "aurora",
  "zephyr",
  "onyx",
  "ember",
  "cobalt",
  "quasar",
  "helix",
  "nimbus",
  "eclipse",
  "apex",
  "vertex",
  "summit",
  "horizon",
  "falcon",
  "comet",
  "meteor",
  "pulsar",
  "nebula",
  "solstice",
  "equinox",
  "zenith",
  "cardinal",
] as const;

export interface ProAliasVariant {
  key: string;
  label: string;
  pricingTier: string;
}

export const PRO_ALIAS_VARIANTS: ProAliasVariant[] = [
  { key: "mini", label: "Mini", pricingTier: "lite" },
  { key: "lite", label: "Lite", pricingTier: "lite" },
  { key: "flash", label: "Flash", pricingTier: "flash" },
  { key: "standard", label: "Standard", pricingTier: "standard" },
  { key: "turbo", label: "Turbo", pricingTier: "standard" },
  { key: "code", label: "Code", pricingTier: "code" },
  { key: "reason", label: "Reason", pricingTier: "reason" },
  { key: "expert", label: "Expert", pricingTier: "expert" },
  { key: "ultra", label: "Ultra", pricingTier: "ultra" },
  { key: "max", label: "Max", pricingTier: "max" },
];

export interface ProAliasSeed {
  slug: string;
  name: string;
  description: string;
  provider: string;
  upstreamModelId: string;
  pricingTier: string;
  rank: number;
  popularity: number;
}

function tierName(slug: string): string {
  return PRICING_TIER_SEEDS.find((tier) => tier.slug === slug)?.name ?? slug;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const PRO_ALIASES: ProAliasSeed[] = PRO_ALIAS_FAMILIES.flatMap(
  (family, familyIndex) =>
    PRO_ALIAS_VARIANTS.map((variant, variantIndex) => {
      const index = familyIndex * PRO_ALIAS_VARIANTS.length + variantIndex;
      return {
        slug: `pr-${family}-${variant.key}-pro`,
        name: `${titleCase(family)} ${variant.label} Pro`,
        description: `${titleCase(family)} ${variant.label} is a public Pro alias billed at the ${tierName(
          variant.pricingTier,
        )} tier. All Pro aliases route to the same ${PRO_ALIAS_BACKEND_MODEL} backend.`,
        provider: PRO_ALIAS_PROVIDER_SLUG,
        upstreamModelId: PRO_ALIAS_UPSTREAM_MODEL_ID,
        pricingTier: variant.pricingTier,
        rank: 100 + index,
        popularity: 8000 - index,
      };
    }),
);
