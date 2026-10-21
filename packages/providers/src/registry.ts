import { AnthropicAdapter } from "./anthropic.js";
import { FreemodelsAdapter } from "./freemodels.js";
import { OpenAICompatibleAdapter } from "./openai.js";
import type { AdapterConfig, ProviderAdapter } from "./adapter.js";

/**
 * Adapter factory (§12). Admin picks an adapter type when configuring a
 * provider; unknown types fall back to the OpenAI-compatible adapter.
 */
export function createAdapter(adapterType: string, config: AdapterConfig): ProviderAdapter {
  switch (adapterType) {
    case "anthropic":
      return new AnthropicAdapter(config);
    case "freemodels":
      return new FreemodelsAdapter(config);
    case "openai":
    case "groq":
    case "mistral":
    case "ollama":
    case "openrouter":
    case "custom_openai":
    default:
      return new OpenAICompatibleAdapter(config);
  }
}