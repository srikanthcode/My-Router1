| # | ID | Name | Category | Tier | Context | Max out | Upstream in $/1M | Upstream out $/1M | Customer in $/1M | Customer out $/1M | Customer in ₹/1M | Customer out ₹/1M | Free | Primary backend |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `claude-sonnet` | Claude Sonnet | coding | expert | 262,144 | 64,000 | 3 | 15 | 4.7143 | 23.5714 | 457.29 | 2286.43 | no | `prorouter/deepseek-v4.1-flash` |
| 2 | `claude-opus` | Claude Opus | reasoning | ultra | 262,144 | 64,000 | 5 | 25 | 7.8571 | 39.2857 | 762.14 | 3810.71 | no | `prorouter/deepseek-v4.1-flash` |
| 3 | `claude-opus-5` | Claude Opus 5 | reasoning | max | 250,000 | 64,000 | 6 | 30 | 9.4286 | 47.1429 | 914.57 | 4572.86 | no | `prorouter/deepseek-v4.1-flash` |
| 4 | `gemini-pro` | Gemini Pro | general | standard | 1,048,576 | 64,000 | 1.25 | 5 | 1.9643 | 7.8571 | 190.54 | 762.14 | no | `prorouter/deepseek-v4.1-flash` |
| 5 | `grok` | Grok | general | standard | 131,072 | 64,000 | 2 | 10 | 3.1429 | 15.7143 | 304.86 | 1524.29 | no | `prorouter/deepseek-v4.1-flash` |
| 6 | `mistral-large` | Mistral Large | reasoning | expert | 128,000 | 64,000 | 2 | 6 | 3.1429 | 9.4286 | 304.86 | 914.57 | no | `prorouter/deepseek-v4.1-flash` |
| 7 | `devstral-24b` | Devstral 24B | coding | code | 128,000 | 64,000 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `prorouter/deepseek-v4.1-flash` |
| 8 | `gpt-6.1-sol` | GPT-6.1 Sol | reasoning | ultra | 256,000 | 64,000 | 2.5 | 10 | 3.9286 | 15.7143 | 381.07 | 1524.29 | no | `prorouter/deepseek-v4.1-flash` |
| 9 | `gpt-6.1-terra` | GPT-6.1 Terra | research | max | 256,000 | 64,000 | 3.5 | 14 | 5.5 | 22 | 533.50 | 2134.00 | no | `prorouter/deepseek-v4.1-flash` |
| 10 | `gpt-6-luna` | GPT-6 Luna | fast | flash | 256,000 | 64,000 | 0.4 | 1.6 | 0.6286 | 2.5143 | 60.97 | 243.89 | no | `prorouter/deepseek-v4.1-flash` |
| 11 | `kimi-k3` | Kimi K3 | long_context | standard | 200,000 | 64,000 | 0.8 | 2.4 | 1.2571 | 3.7714 | 121.94 | 365.83 | no | `prorouter/deepseek-v4.1-flash` |
| 12 | `kimi-k2.7-code` | Kimi K2.7 Code | coding | code | 200,000 | 64,000 | 0.7 | 2.1 | 1.1 | 3.3 | 106.70 | 320.10 | no | `prorouter/deepseek-v4.1-flash` |
| 13 | `glm-5.3` | GLM-5.3 | reasoning | reason | 200,000 | 128,000 | 0.6 | 1.8 | 0.9429 | 2.8286 | 91.46 | 274.37 | no | `prorouter/deepseek-v4.1-flash` |
| 14 | `glm-5.3-flash` | GLM-5.3-Flash | fast | flash | 200,000 | 128,000 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 15 | `mimo-v2.6-pro` | MiMo-V2.6-Pro | reasoning | expert | 1,048,576 | 131,072 | 0.9 | 2.7 | 1.4143 | 4.2429 | 137.19 | 411.56 | no | `prorouter/deepseek-v4.1-flash` |
| 16 | `mimo-v2.6-flash` | MiMo-V2.6-Flash | fast | lite | 1,048,576 | 131,072 | 0.1 | 0.3 | 0.1571 | 0.4714 | 15.24 | 45.73 | no | `prorouter/deepseek-v4.1-flash` |
| 17 | `minimax-m3.1-flash` | MiniMax M3.1 Flash | fast | flash | 1,000,000 | 131,072 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 18 | `qwen3-coder-next` | Qwen3-Coder-Next | coding | code | 131,072 | 64,000 | 0.5 | 1.5 | 0.7857 | 2.3571 | 76.21 | 228.64 | no | `prorouter/deepseek-v4.1-flash` |
| 19 | `deepseek-v4-pro-0813` | DeepSeek-V4-Pro-0813 | coding | expert | 262,144 | 128,000 | 0.8 | 2.4 | 1.2571 | 3.7714 | 121.94 | 365.83 | no | `prorouter/deepseek-v4.1-flash` |
| 20 | `beam` | Beam | general | lite | 200,000 | 64,000 | 0.1 | 0.3 | 0.1571 | 0.4714 | 15.24 | 45.73 | no | `prorouter/deepseek-v4.1-flash` |
| 21 | `longcat-2.5-preview` | LongCat 2.5 Preview | long_context | standard | 200,000 | 64,000 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `prorouter/deepseek-v4.1-flash` |
| 22 | `jev-1.13` | Jev 1.13 | general | lite | 131,072 | 32,768 | 0.1 | 0.3 | 0.1571 | 0.4714 | 15.24 | 45.73 | no | `prorouter/deepseek-v4.1-flash` |
| 23 | `gpt-4.1` | GPT-4.1 | coding | standard | 128,000 | 16,384 | 2.5 | 10 | 3.9286 | 15.7143 | 381.07 | 1524.29 | no | `openai/gpt-4.1` |
| 24 | `gpt-4o` | GPT-4o | coding | standard | 128,000 | 16,384 | 2.5 | 10 | 3.9286 | 15.7143 | 381.07 | 1524.29 | no | `openai/gpt-4o` |
| 25 | `deepseek-v4.1-flash` | DeepSeek V4.1 Flash | coding | standard | 262,144 | 128,000 | 0.14 | 0.28 | 0.22 | 0.44 | 21.34 | 42.68 | YES | `prorouter/deepseek-v4.1-flash` |
| 26 | `deepseek-v4.1-flash-1017` | DeepSeek-V4.1-Flash-1017 | coding | standard | 262,144 | 128,000 | 0.14 | 0.28 | 0.22 | 0.44 | 21.34 | 42.68 | YES | `prorouter/deepseek-v4.1-flash` |
| 27 | `qwen3.8-27b` | Qwen3.8-27B | coding | standard | 131,072 | 64,000 | 0.2 | 0.8 | 0.3143 | 1.2571 | 30.49 | 121.94 | YES | `groq/qwen3.8-27b` |
| 28 | `qwen/qwen3.8-27b` | Qwen 3.8 27B (Groq LPU) | coding | standard | 131,072 | 64,000 | 0.2 | 0.8 | 0.3143 | 1.2571 | 30.49 | 121.94 | YES | `groq/qwen3.8-27b` |
| 29 | `gpt-oss-20b` | GPT OSS 20B | reasoning | standard | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `nabh/gpt-oss-20b` |
| 30 | `gpt-oss-120b` | GPT OSS 120B | reasoning | standard | 131,072 | 32,768 | 0.3 | 1.2 | 0.4714 | 1.8857 | 45.73 | 182.91 | no | `groq/gpt-oss-120b` |
| 31 | `nemotron-3-ultra-550b-a55b` | Nemotron 3 Ultra 550B A55B | reasoning | standard | 1,048,576 | 65,536 | 0.7 | 2.1 | 1.1 | 3.3 | 106.70 | 320.10 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 32 | `nemotron-3-nano-omni-30b-a3b-reasoning` | Nemotron 3 Nano Omni 30B Reasoning | vision | standard | 131,072 | 20,480 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 33 | `nemotron-3.5-lightning-30b-a3b` | Nemotron 3.5 Lightning 30B A3B | fast | flash | 1,048,576 | 65,536 | 0.1 | 0.3 | 0.1571 | 0.4714 | 15.24 | 45.73 | no | `requesty/nemotron-3.5-lightning-30b-a3b` |
| 34 | `nemotron-3.5-lightning` | Nemotron 3.5 Lightning | fast | flash | 1,048,576 | 65,536 | 0.1 | 0.3 | 0.1571 | 0.4714 | 15.24 | 45.73 | no | `openrouter/nemotron-3.5-lightning` |
| 35 | `nemotron-3.5-super-vl` | Nemotron 3.5 Super VL | vision | standard | 128,000 | 64,000 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `openrouter/nemotron-3.5-super-vl` |
| 36 | `gemma-4-31b-it` | Gemma 4 31B IT | multilingual | standard | 262,144 | 8,192 | 0.14 | 0.42 | 0.22 | 0.66 | 21.34 | 64.02 | no | `requesty/gemma-4-31b-it` |
| 37 | `leanstral-1-5` | Leanstral 1.5 | reasoning | standard | 262,144 | 32,768 | 0.12 | 0.36 | 0.1886 | 0.5657 | 18.29 | 54.87 | no | `requesty/leanstral-1-5` |
| 38 | `ling-3.1-flash` | Ling 3.1 Flash | fast | flash | 262,144 | 32,768 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 39 | `allam-2-7b` | Allam 2 7B | multilingual | standard | 4,096 | 2,048 | 0.05 | 0.15 | 0.0786 | 0.2357 | 7.62 | 22.86 | no | `groq/allam-2-7b` |
| 40 | `pr-gen-omni-core` | Omni Core | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 41 | `pr-gen-dialogue-pro` | Dialogue Pro | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 42 | `pr-gen-knowledge-base` | Knowledge Base | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 43 | `pr-gen-briefing-desk` | Briefing Desk | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 44 | `pr-gen-clarity-engine` | Clarity Engine | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 45 | `pr-gen-writer-companion` | Writer Companion | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 46 | `pr-gen-inquiry-agent` | Inquiry Agent | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 47 | `pr-gen-omni-core-v2` | Omni Core (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 48 | `pr-gen-dialogue-pro-v2` | Dialogue Pro (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 49 | `pr-gen-knowledge-base-v2` | Knowledge Base (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 50 | `pr-gen-briefing-desk-v2` | Briefing Desk (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 51 | `pr-gen-clarity-engine-v2` | Clarity Engine (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 52 | `pr-gen-writer-companion-v2` | Writer Companion (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 53 | `pr-gen-inquiry-agent-v2` | Inquiry Agent (Tier 2) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 54 | `pr-gen-omni-core-v3` | Omni Core (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 55 | `pr-gen-dialogue-pro-v3` | Dialogue Pro (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 56 | `pr-gen-knowledge-base-v3` | Knowledge Base (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 57 | `pr-gen-briefing-desk-v3` | Briefing Desk (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 58 | `pr-gen-clarity-engine-v3` | Clarity Engine (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 59 | `pr-gen-writer-companion-v3` | Writer Companion (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 60 | `pr-gen-inquiry-agent-v3` | Inquiry Agent (Tier 3) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 61 | `pr-gen-omni-core-v4` | Omni Core (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 62 | `pr-gen-dialogue-pro-v4` | Dialogue Pro (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 63 | `pr-gen-knowledge-base-v4` | Knowledge Base (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 64 | `pr-gen-briefing-desk-v4` | Briefing Desk (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 65 | `pr-gen-clarity-engine-v4` | Clarity Engine (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 66 | `pr-gen-writer-companion-v4` | Writer Companion (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 67 | `pr-gen-inquiry-agent-v4` | Inquiry Agent (Tier 4) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 68 | `pr-gen-omni-core-v5` | Omni Core (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 69 | `pr-gen-dialogue-pro-v5` | Dialogue Pro (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 70 | `pr-gen-knowledge-base-v5` | Knowledge Base (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 71 | `pr-gen-briefing-desk-v5` | Briefing Desk (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 72 | `pr-gen-clarity-engine-v5` | Clarity Engine (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 73 | `pr-gen-writer-companion-v5` | Writer Companion (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 74 | `pr-gen-inquiry-agent-v5` | Inquiry Agent (Tier 5) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 75 | `pr-gen-omni-core-v6` | Omni Core (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 76 | `pr-gen-dialogue-pro-v6` | Dialogue Pro (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 77 | `pr-gen-knowledge-base-v6` | Knowledge Base (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 78 | `pr-gen-briefing-desk-v6` | Briefing Desk (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 79 | `pr-gen-clarity-engine-v6` | Clarity Engine (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 80 | `pr-gen-writer-companion-v6` | Writer Companion (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 81 | `pr-gen-inquiry-agent-v6` | Inquiry Agent (Tier 6) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 82 | `pr-gen-omni-core-v7` | Omni Core (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 83 | `pr-gen-dialogue-pro-v7` | Dialogue Pro (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 84 | `pr-gen-knowledge-base-v7` | Knowledge Base (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 85 | `pr-gen-briefing-desk-v7` | Briefing Desk (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 86 | `pr-gen-clarity-engine-v7` | Clarity Engine (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 87 | `pr-gen-writer-companion-v7` | Writer Companion (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 88 | `pr-gen-inquiry-agent-v7` | Inquiry Agent (Tier 7) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 89 | `pr-gen-omni-core-v8` | Omni Core (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 90 | `pr-gen-dialogue-pro-v8` | Dialogue Pro (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 91 | `pr-gen-knowledge-base-v8` | Knowledge Base (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 92 | `pr-gen-briefing-desk-v8` | Briefing Desk (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 93 | `pr-gen-clarity-engine-v8` | Clarity Engine (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 94 | `pr-gen-writer-companion-v8` | Writer Companion (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 95 | `pr-gen-inquiry-agent-v8` | Inquiry Agent (Tier 8) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 96 | `pr-gen-omni-core-v9` | Omni Core (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 97 | `pr-gen-dialogue-pro-v9` | Dialogue Pro (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 98 | `pr-gen-knowledge-base-v9` | Knowledge Base (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 99 | `pr-gen-briefing-desk-v9` | Briefing Desk (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 100 | `pr-gen-clarity-engine-v9` | Clarity Engine (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 101 | `pr-gen-writer-companion-v9` | Writer Companion (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 102 | `pr-gen-inquiry-agent-v9` | Inquiry Agent (Tier 9) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 103 | `pr-gen-omni-core-v10` | Omni Core (Tier 10) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 104 | `pr-gen-dialogue-pro-v10` | Dialogue Pro (Tier 10) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 105 | `pr-gen-knowledge-base-v10` | Knowledge Base (Tier 10) | general | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `prorouter/deepseek-v4.1-flash` |
| 106 | `pr-reason-cot-analytical` | Chain-of-Thought Analyst | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 107 | `pr-reason-deductive-logic` | Deductive Logic Engine | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 108 | `pr-reason-causal-inference` | Causal Inference Model | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 109 | `pr-reason-systems-thinker` | Systems Architecture Thinker | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 110 | `pr-reason-fallacy-detector` | Cognitive Auditor | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 111 | `pr-reason-decision-matrix` | Decision Matrix Pro | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 112 | `pr-reason-hypothesis-tester` | Scientific Hypothesizer | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 113 | `pr-reason-cot-analytical-v2` | Chain-of-Thought Analyst (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 114 | `pr-reason-deductive-logic-v2` | Deductive Logic Engine (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 115 | `pr-reason-causal-inference-v2` | Causal Inference Model (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 116 | `pr-reason-systems-thinker-v2` | Systems Architecture Thinker (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 117 | `pr-reason-fallacy-detector-v2` | Cognitive Auditor (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 118 | `pr-reason-decision-matrix-v2` | Decision Matrix Pro (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 119 | `pr-reason-hypothesis-tester-v2` | Scientific Hypothesizer (Tier 2) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 120 | `pr-reason-cot-analytical-v3` | Chain-of-Thought Analyst (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 121 | `pr-reason-deductive-logic-v3` | Deductive Logic Engine (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 122 | `pr-reason-causal-inference-v3` | Causal Inference Model (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 123 | `pr-reason-systems-thinker-v3` | Systems Architecture Thinker (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 124 | `pr-reason-fallacy-detector-v3` | Cognitive Auditor (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 125 | `pr-reason-decision-matrix-v3` | Decision Matrix Pro (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 126 | `pr-reason-hypothesis-tester-v3` | Scientific Hypothesizer (Tier 3) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 127 | `pr-reason-cot-analytical-v4` | Chain-of-Thought Analyst (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 128 | `pr-reason-deductive-logic-v4` | Deductive Logic Engine (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 129 | `pr-reason-causal-inference-v4` | Causal Inference Model (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 130 | `pr-reason-systems-thinker-v4` | Systems Architecture Thinker (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 131 | `pr-reason-fallacy-detector-v4` | Cognitive Auditor (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 132 | `pr-reason-decision-matrix-v4` | Decision Matrix Pro (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 133 | `pr-reason-hypothesis-tester-v4` | Scientific Hypothesizer (Tier 4) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 134 | `pr-reason-cot-analytical-v5` | Chain-of-Thought Analyst (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 135 | `pr-reason-deductive-logic-v5` | Deductive Logic Engine (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 136 | `pr-reason-causal-inference-v5` | Causal Inference Model (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 137 | `pr-reason-systems-thinker-v5` | Systems Architecture Thinker (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 138 | `pr-reason-fallacy-detector-v5` | Cognitive Auditor (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 139 | `pr-reason-decision-matrix-v5` | Decision Matrix Pro (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 140 | `pr-reason-hypothesis-tester-v5` | Scientific Hypothesizer (Tier 5) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 141 | `pr-reason-cot-analytical-v6` | Chain-of-Thought Analyst (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 142 | `pr-reason-deductive-logic-v6` | Deductive Logic Engine (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 143 | `pr-reason-causal-inference-v6` | Causal Inference Model (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 144 | `pr-reason-systems-thinker-v6` | Systems Architecture Thinker (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 145 | `pr-reason-fallacy-detector-v6` | Cognitive Auditor (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 146 | `pr-reason-decision-matrix-v6` | Decision Matrix Pro (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 147 | `pr-reason-hypothesis-tester-v6` | Scientific Hypothesizer (Tier 6) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 148 | `pr-reason-cot-analytical-v7` | Chain-of-Thought Analyst (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 149 | `pr-reason-deductive-logic-v7` | Deductive Logic Engine (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 150 | `pr-reason-causal-inference-v7` | Causal Inference Model (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 151 | `pr-reason-systems-thinker-v7` | Systems Architecture Thinker (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 152 | `pr-reason-fallacy-detector-v7` | Cognitive Auditor (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 153 | `pr-reason-decision-matrix-v7` | Decision Matrix Pro (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 154 | `pr-reason-hypothesis-tester-v7` | Scientific Hypothesizer (Tier 7) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 155 | `pr-reason-cot-analytical-v8` | Chain-of-Thought Analyst (Tier 8) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 156 | `pr-reason-deductive-logic-v8` | Deductive Logic Engine (Tier 8) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 157 | `pr-reason-causal-inference-v8` | Causal Inference Model (Tier 8) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 158 | `pr-reason-systems-thinker-v8` | Systems Architecture Thinker (Tier 8) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 159 | `pr-reason-fallacy-detector-v8` | Cognitive Auditor (Tier 8) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 160 | `pr-reason-decision-matrix-v8` | Decision Matrix Pro (Tier 8) | reasoning | reason | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 161 | `pr-code-fullstack-architect` | Fullstack Architect | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 162 | `pr-code-python-systems` | Python Systems Engineer | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 163 | `pr-code-rust-memory` | Rust & Systems Safety | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 164 | `pr-code-database-internals` | Database & SQL Specialist | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 165 | `pr-code-devops-cloud` | Cloud & Kubernetes Engineer | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 166 | `pr-code-frontend-perf` | React & Web Performance | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 167 | `pr-code-security-auditor` | Application Security Auditor | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 168 | `pr-code-refactor-clean` | Refactoring & Clean Code | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 169 | `pr-code-fullstack-architect-v2` | Fullstack Architect (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 170 | `pr-code-python-systems-v2` | Python Systems Engineer (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 171 | `pr-code-rust-memory-v2` | Rust & Systems Safety (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 172 | `pr-code-database-internals-v2` | Database & SQL Specialist (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 173 | `pr-code-devops-cloud-v2` | Cloud & Kubernetes Engineer (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 174 | `pr-code-frontend-perf-v2` | React & Web Performance (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 175 | `pr-code-security-auditor-v2` | Application Security Auditor (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 176 | `pr-code-refactor-clean-v2` | Refactoring & Clean Code (Tier 2) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 177 | `pr-code-fullstack-architect-v3` | Fullstack Architect (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 178 | `pr-code-python-systems-v3` | Python Systems Engineer (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 179 | `pr-code-rust-memory-v3` | Rust & Systems Safety (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 180 | `pr-code-database-internals-v3` | Database & SQL Specialist (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 181 | `pr-code-devops-cloud-v3` | Cloud & Kubernetes Engineer (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 182 | `pr-code-frontend-perf-v3` | React & Web Performance (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 183 | `pr-code-security-auditor-v3` | Application Security Auditor (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 184 | `pr-code-refactor-clean-v3` | Refactoring & Clean Code (Tier 3) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 185 | `pr-code-fullstack-architect-v4` | Fullstack Architect (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 186 | `pr-code-python-systems-v4` | Python Systems Engineer (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 187 | `pr-code-rust-memory-v4` | Rust & Systems Safety (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 188 | `pr-code-database-internals-v4` | Database & SQL Specialist (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 189 | `pr-code-devops-cloud-v4` | Cloud & Kubernetes Engineer (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 190 | `pr-code-frontend-perf-v4` | React & Web Performance (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 191 | `pr-code-security-auditor-v4` | Application Security Auditor (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 192 | `pr-code-refactor-clean-v4` | Refactoring & Clean Code (Tier 4) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 193 | `pr-code-fullstack-architect-v5` | Fullstack Architect (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 194 | `pr-code-python-systems-v5` | Python Systems Engineer (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 195 | `pr-code-rust-memory-v5` | Rust & Systems Safety (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 196 | `pr-code-database-internals-v5` | Database & SQL Specialist (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 197 | `pr-code-devops-cloud-v5` | Cloud & Kubernetes Engineer (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 198 | `pr-code-frontend-perf-v5` | React & Web Performance (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 199 | `pr-code-security-auditor-v5` | Application Security Auditor (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 200 | `pr-code-refactor-clean-v5` | Refactoring & Clean Code (Tier 5) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 201 | `pr-code-fullstack-architect-v6` | Fullstack Architect (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 202 | `pr-code-python-systems-v6` | Python Systems Engineer (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 203 | `pr-code-rust-memory-v6` | Rust & Systems Safety (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 204 | `pr-code-database-internals-v6` | Database & SQL Specialist (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 205 | `pr-code-devops-cloud-v6` | Cloud & Kubernetes Engineer (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 206 | `pr-code-frontend-perf-v6` | React & Web Performance (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 207 | `pr-code-security-auditor-v6` | Application Security Auditor (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 208 | `pr-code-refactor-clean-v6` | Refactoring & Clean Code (Tier 6) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 209 | `pr-code-fullstack-architect-v7` | Fullstack Architect (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 210 | `pr-code-python-systems-v7` | Python Systems Engineer (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 211 | `pr-code-rust-memory-v7` | Rust & Systems Safety (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 212 | `pr-code-database-internals-v7` | Database & SQL Specialist (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 213 | `pr-code-devops-cloud-v7` | Cloud & Kubernetes Engineer (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 214 | `pr-code-frontend-perf-v7` | React & Web Performance (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 215 | `pr-code-security-auditor-v7` | Application Security Auditor (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 216 | `pr-code-refactor-clean-v7` | Refactoring & Clean Code (Tier 7) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 217 | `pr-code-fullstack-architect-v8` | Fullstack Architect (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 218 | `pr-code-python-systems-v8` | Python Systems Engineer (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 219 | `pr-code-rust-memory-v8` | Rust & Systems Safety (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 220 | `pr-code-database-internals-v8` | Database & SQL Specialist (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 221 | `pr-code-devops-cloud-v8` | Cloud & Kubernetes Engineer (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 222 | `pr-code-frontend-perf-v8` | React & Web Performance (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 223 | `pr-code-security-auditor-v8` | Application Security Auditor (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 224 | `pr-code-refactor-clean-v8` | Refactoring & Clean Code (Tier 8) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 225 | `pr-code-fullstack-architect-v9` | Fullstack Architect (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 226 | `pr-code-python-systems-v9` | Python Systems Engineer (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 227 | `pr-code-rust-memory-v9` | Rust & Systems Safety (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 228 | `pr-code-database-internals-v9` | Database & SQL Specialist (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 229 | `pr-code-devops-cloud-v9` | Cloud & Kubernetes Engineer (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 230 | `pr-code-frontend-perf-v9` | React & Web Performance (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 231 | `pr-code-security-auditor-v9` | Application Security Auditor (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 232 | `pr-code-refactor-clean-v9` | Refactoring & Clean Code (Tier 9) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 233 | `pr-code-fullstack-architect-v10` | Fullstack Architect (Tier 10) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 234 | `pr-code-python-systems-v10` | Python Systems Engineer (Tier 10) | coding | code | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `groq/qwen3.8-27b` |
| 235 | `pr-agent-workflow-runner` | Autonomous Workflow Orchestrator | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 236 | `pr-agent-repo-synthesizer` | Repo-Level Agent | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 237 | `pr-agent-schema-tooler` | Strict Schema Invoker | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 238 | `pr-agent-sandbox-debugger` | Runtime Sandbox Debugger | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 239 | `pr-agent-agent-swarm` | Subagent Team Lead | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 240 | `pr-agent-workflow-runner-v2` | Autonomous Workflow Orchestrator (Tier 2) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 241 | `pr-agent-repo-synthesizer-v2` | Repo-Level Agent (Tier 2) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 242 | `pr-agent-schema-tooler-v2` | Strict Schema Invoker (Tier 2) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 243 | `pr-agent-sandbox-debugger-v2` | Runtime Sandbox Debugger (Tier 2) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 244 | `pr-agent-agent-swarm-v2` | Subagent Team Lead (Tier 2) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 245 | `pr-agent-workflow-runner-v3` | Autonomous Workflow Orchestrator (Tier 3) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 246 | `pr-agent-repo-synthesizer-v3` | Repo-Level Agent (Tier 3) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 247 | `pr-agent-schema-tooler-v3` | Strict Schema Invoker (Tier 3) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 248 | `pr-agent-sandbox-debugger-v3` | Runtime Sandbox Debugger (Tier 3) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 249 | `pr-agent-agent-swarm-v3` | Subagent Team Lead (Tier 3) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 250 | `pr-agent-workflow-runner-v4` | Autonomous Workflow Orchestrator (Tier 4) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 251 | `pr-agent-repo-synthesizer-v4` | Repo-Level Agent (Tier 4) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 252 | `pr-agent-schema-tooler-v4` | Strict Schema Invoker (Tier 4) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 253 | `pr-agent-sandbox-debugger-v4` | Runtime Sandbox Debugger (Tier 4) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 254 | `pr-agent-agent-swarm-v4` | Subagent Team Lead (Tier 4) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 255 | `pr-agent-workflow-runner-v5` | Autonomous Workflow Orchestrator (Tier 5) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 256 | `pr-agent-repo-synthesizer-v5` | Repo-Level Agent (Tier 5) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 257 | `pr-agent-schema-tooler-v5` | Strict Schema Invoker (Tier 5) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 258 | `pr-agent-sandbox-debugger-v5` | Runtime Sandbox Debugger (Tier 5) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 259 | `pr-agent-agent-swarm-v5` | Subagent Team Lead (Tier 5) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 260 | `pr-agent-workflow-runner-v6` | Autonomous Workflow Orchestrator (Tier 6) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 261 | `pr-agent-repo-synthesizer-v6` | Repo-Level Agent (Tier 6) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 262 | `pr-agent-schema-tooler-v6` | Strict Schema Invoker (Tier 6) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 263 | `pr-agent-sandbox-debugger-v6` | Runtime Sandbox Debugger (Tier 6) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 264 | `pr-agent-agent-swarm-v6` | Subagent Team Lead (Tier 6) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 265 | `pr-agent-workflow-runner-v7` | Autonomous Workflow Orchestrator (Tier 7) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 266 | `pr-agent-repo-synthesizer-v7` | Repo-Level Agent (Tier 7) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 267 | `pr-agent-schema-tooler-v7` | Strict Schema Invoker (Tier 7) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 268 | `pr-agent-sandbox-debugger-v7` | Runtime Sandbox Debugger (Tier 7) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 269 | `pr-agent-agent-swarm-v7` | Subagent Team Lead (Tier 7) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 270 | `pr-agent-workflow-runner-v8` | Autonomous Workflow Orchestrator (Tier 8) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 271 | `pr-agent-repo-synthesizer-v8` | Repo-Level Agent (Tier 8) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 272 | `pr-agent-schema-tooler-v8` | Strict Schema Invoker (Tier 8) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 273 | `pr-agent-sandbox-debugger-v8` | Runtime Sandbox Debugger (Tier 8) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 274 | `pr-agent-agent-swarm-v8` | Subagent Team Lead (Tier 8) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 275 | `pr-agent-workflow-runner-v9` | Autonomous Workflow Orchestrator (Tier 9) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 276 | `pr-agent-repo-synthesizer-v9` | Repo-Level Agent (Tier 9) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 277 | `pr-agent-schema-tooler-v9` | Strict Schema Invoker (Tier 9) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 278 | `pr-agent-sandbox-debugger-v9` | Runtime Sandbox Debugger (Tier 9) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 279 | `pr-agent-agent-swarm-v9` | Subagent Team Lead (Tier 9) | agentic | code | 131,072 | 32,768 | 0.3 | 0.9 | 0.4714 | 1.4143 | 45.73 | 137.19 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 280 | `pr-research-literature-review` | Literature Reviewer | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 281 | `pr-research-competitive-intel` | Market & Competitive Intel | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 282 | `pr-research-data-synthesizer` | Qualitative Data Synthesizer | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 283 | `pr-research-meta-analyst` | Meta-Analysis Assistant | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 284 | `pr-research-deep-investigator` | Deep Research Specialist | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 285 | `pr-research-literature-review-v2` | Literature Reviewer (Tier 2) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 286 | `pr-research-competitive-intel-v2` | Market & Competitive Intel (Tier 2) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 287 | `pr-research-data-synthesizer-v2` | Qualitative Data Synthesizer (Tier 2) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 288 | `pr-research-meta-analyst-v2` | Meta-Analysis Assistant (Tier 2) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 289 | `pr-research-deep-investigator-v2` | Deep Research Specialist (Tier 2) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 290 | `pr-research-literature-review-v3` | Literature Reviewer (Tier 3) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 291 | `pr-research-competitive-intel-v3` | Market & Competitive Intel (Tier 3) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 292 | `pr-research-data-synthesizer-v3` | Qualitative Data Synthesizer (Tier 3) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 293 | `pr-research-meta-analyst-v3` | Meta-Analysis Assistant (Tier 3) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 294 | `pr-research-deep-investigator-v3` | Deep Research Specialist (Tier 3) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 295 | `pr-research-literature-review-v4` | Literature Reviewer (Tier 4) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 296 | `pr-research-competitive-intel-v4` | Market & Competitive Intel (Tier 4) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 297 | `pr-research-data-synthesizer-v4` | Qualitative Data Synthesizer (Tier 4) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 298 | `pr-research-meta-analyst-v4` | Meta-Analysis Assistant (Tier 4) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 299 | `pr-research-deep-investigator-v4` | Deep Research Specialist (Tier 4) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 300 | `pr-research-literature-review-v5` | Literature Reviewer (Tier 5) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 301 | `pr-research-competitive-intel-v5` | Market & Competitive Intel (Tier 5) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 302 | `pr-research-data-synthesizer-v5` | Qualitative Data Synthesizer (Tier 5) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 303 | `pr-research-meta-analyst-v5` | Meta-Analysis Assistant (Tier 5) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 304 | `pr-research-deep-investigator-v5` | Deep Research Specialist (Tier 5) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 305 | `pr-research-literature-review-v6` | Literature Reviewer (Tier 6) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 306 | `pr-research-competitive-intel-v6` | Market & Competitive Intel (Tier 6) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 307 | `pr-research-data-synthesizer-v6` | Qualitative Data Synthesizer (Tier 6) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 308 | `pr-research-meta-analyst-v6` | Meta-Analysis Assistant (Tier 6) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 309 | `pr-research-deep-investigator-v6` | Deep Research Specialist (Tier 6) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 310 | `pr-research-literature-review-v7` | Literature Reviewer (Tier 7) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 311 | `pr-research-competitive-intel-v7` | Market & Competitive Intel (Tier 7) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 312 | `pr-research-data-synthesizer-v7` | Qualitative Data Synthesizer (Tier 7) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 313 | `pr-research-meta-analyst-v7` | Meta-Analysis Assistant (Tier 7) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 314 | `pr-research-deep-investigator-v7` | Deep Research Specialist (Tier 7) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 315 | `pr-research-literature-review-v8` | Literature Reviewer (Tier 8) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 316 | `pr-research-competitive-intel-v8` | Market & Competitive Intel (Tier 8) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 317 | `pr-research-data-synthesizer-v8` | Qualitative Data Synthesizer (Tier 8) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 318 | `pr-research-meta-analyst-v8` | Meta-Analysis Assistant (Tier 8) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 319 | `pr-research-deep-investigator-v8` | Deep Research Specialist (Tier 8) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 320 | `pr-research-literature-review-v9` | Literature Reviewer (Tier 9) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 321 | `pr-research-competitive-intel-v9` | Market & Competitive Intel (Tier 9) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 322 | `pr-research-data-synthesizer-v9` | Qualitative Data Synthesizer (Tier 9) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 323 | `pr-research-meta-analyst-v9` | Meta-Analysis Assistant (Tier 9) | research | expert | 131,072 | 32,768 | 0.35 | 1.05 | 0.55 | 1.65 | 53.35 | 160.05 | no | `requesty/leanstral-1-5` |
| 324 | `pr-math-discrete-proofs` | Discrete Math & Proof Assistant | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 325 | `pr-math-calculus-analysis` | Continuous Calculus & ODEs | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 326 | `pr-math-linear-algebra` | Linear Algebra & Tensor Math | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 327 | `pr-math-physics-simulator` | Classical & Quantum Physics | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 328 | `pr-math-bio-cheminfo` | Biochemistry & Molecular Modeling | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 329 | `pr-math-discrete-proofs-v2` | Discrete Math & Proof Assistant (Tier 2) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 330 | `pr-math-calculus-analysis-v2` | Continuous Calculus & ODEs (Tier 2) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 331 | `pr-math-linear-algebra-v2` | Linear Algebra & Tensor Math (Tier 2) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 332 | `pr-math-physics-simulator-v2` | Classical & Quantum Physics (Tier 2) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 333 | `pr-math-bio-cheminfo-v2` | Biochemistry & Molecular Modeling (Tier 2) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 334 | `pr-math-discrete-proofs-v3` | Discrete Math & Proof Assistant (Tier 3) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 335 | `pr-math-calculus-analysis-v3` | Continuous Calculus & ODEs (Tier 3) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 336 | `pr-math-linear-algebra-v3` | Linear Algebra & Tensor Math (Tier 3) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 337 | `pr-math-physics-simulator-v3` | Classical & Quantum Physics (Tier 3) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 338 | `pr-math-bio-cheminfo-v3` | Biochemistry & Molecular Modeling (Tier 3) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 339 | `pr-math-discrete-proofs-v4` | Discrete Math & Proof Assistant (Tier 4) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 340 | `pr-math-calculus-analysis-v4` | Continuous Calculus & ODEs (Tier 4) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 341 | `pr-math-linear-algebra-v4` | Linear Algebra & Tensor Math (Tier 4) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 342 | `pr-math-physics-simulator-v4` | Classical & Quantum Physics (Tier 4) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 343 | `pr-math-bio-cheminfo-v4` | Biochemistry & Molecular Modeling (Tier 4) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 344 | `pr-math-discrete-proofs-v5` | Discrete Math & Proof Assistant (Tier 5) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 345 | `pr-math-calculus-analysis-v5` | Continuous Calculus & ODEs (Tier 5) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 346 | `pr-math-linear-algebra-v5` | Linear Algebra & Tensor Math (Tier 5) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 347 | `pr-math-physics-simulator-v5` | Classical & Quantum Physics (Tier 5) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 348 | `pr-math-bio-cheminfo-v5` | Biochemistry & Molecular Modeling (Tier 5) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 349 | `pr-math-discrete-proofs-v6` | Discrete Math & Proof Assistant (Tier 6) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 350 | `pr-math-calculus-analysis-v6` | Continuous Calculus & ODEs (Tier 6) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 351 | `pr-math-linear-algebra-v6` | Linear Algebra & Tensor Math (Tier 6) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 352 | `pr-math-physics-simulator-v6` | Classical & Quantum Physics (Tier 6) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 353 | `pr-math-bio-cheminfo-v6` | Biochemistry & Molecular Modeling (Tier 6) | math_science | reason | 131,072 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `requesty/nemotron-3-nano-omni-30b-a3b-reasoning` |
| 354 | `pr-lang-tamil-dravidian` | Tamil & Dravidian Scholar | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 355 | `pr-lang-indic-translingual` | Indic Polyglot | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 356 | `pr-lang-euro-multilingual` | European Romance & Germanic | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 357 | `pr-lang-cjk-specialist` | East Asian CJK Specialist | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 358 | `pr-lang-arabic-mena` | Arabic & MENA Dialectics | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 359 | `pr-lang-tamil-dravidian-v2` | Tamil & Dravidian Scholar (Tier 2) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 360 | `pr-lang-indic-translingual-v2` | Indic Polyglot (Tier 2) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 361 | `pr-lang-euro-multilingual-v2` | European Romance & Germanic (Tier 2) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 362 | `pr-lang-cjk-specialist-v2` | East Asian CJK Specialist (Tier 2) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 363 | `pr-lang-arabic-mena-v2` | Arabic & MENA Dialectics (Tier 2) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 364 | `pr-lang-tamil-dravidian-v3` | Tamil & Dravidian Scholar (Tier 3) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 365 | `pr-lang-indic-translingual-v3` | Indic Polyglot (Tier 3) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 366 | `pr-lang-euro-multilingual-v3` | European Romance & Germanic (Tier 3) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 367 | `pr-lang-cjk-specialist-v3` | East Asian CJK Specialist (Tier 3) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 368 | `pr-lang-arabic-mena-v3` | Arabic & MENA Dialectics (Tier 3) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 369 | `pr-lang-tamil-dravidian-v4` | Tamil & Dravidian Scholar (Tier 4) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 370 | `pr-lang-indic-translingual-v4` | Indic Polyglot (Tier 4) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 371 | `pr-lang-euro-multilingual-v4` | European Romance & Germanic (Tier 4) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 372 | `pr-lang-cjk-specialist-v4` | East Asian CJK Specialist (Tier 4) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 373 | `pr-lang-arabic-mena-v4` | Arabic & MENA Dialectics (Tier 4) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 374 | `pr-lang-tamil-dravidian-v5` | Tamil & Dravidian Scholar (Tier 5) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 375 | `pr-lang-indic-translingual-v5` | Indic Polyglot (Tier 5) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 376 | `pr-lang-euro-multilingual-v5` | European Romance & Germanic (Tier 5) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 377 | `pr-lang-cjk-specialist-v5` | East Asian CJK Specialist (Tier 5) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 378 | `pr-lang-arabic-mena-v5` | Arabic & MENA Dialectics (Tier 5) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 379 | `pr-lang-tamil-dravidian-v6` | Tamil & Dravidian Scholar (Tier 6) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 380 | `pr-lang-indic-translingual-v6` | Indic Polyglot (Tier 6) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 381 | `pr-lang-euro-multilingual-v6` | European Romance & Germanic (Tier 6) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 382 | `pr-lang-cjk-specialist-v6` | East Asian CJK Specialist (Tier 6) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 383 | `pr-lang-arabic-mena-v6` | Arabic & MENA Dialectics (Tier 6) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 384 | `pr-lang-tamil-dravidian-v7` | Tamil & Dravidian Scholar (Tier 7) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 385 | `pr-lang-indic-translingual-v7` | Indic Polyglot (Tier 7) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 386 | `pr-lang-euro-multilingual-v7` | European Romance & Germanic (Tier 7) | multilingual | standard | 131,072 | 32,768 | 0.15 | 0.45 | 0.2357 | 0.7071 | 22.86 | 68.59 | no | `requesty/gemma-4-31b-it` |
| 387 | `pr-vision-ocr-doc-scanner` | OCR Document Intelligence | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 388 | `pr-vision-chart-diagram` | Chart & Architecture Visualizer | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 389 | `pr-vision-ui-ux-auditor` | UI/UX Screen Inspector | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 390 | `pr-vision-infographic-parser` | Infographic Insight Extractor | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 391 | `pr-vision-scene-descriptor` | Spatial & Scene Comprehender | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 392 | `pr-vision-ocr-doc-scanner-v2` | OCR Document Intelligence (Tier 2) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 393 | `pr-vision-chart-diagram-v2` | Chart & Architecture Visualizer (Tier 2) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 394 | `pr-vision-ui-ux-auditor-v2` | UI/UX Screen Inspector (Tier 2) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 395 | `pr-vision-infographic-parser-v2` | Infographic Insight Extractor (Tier 2) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 396 | `pr-vision-scene-descriptor-v2` | Spatial & Scene Comprehender (Tier 2) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 397 | `pr-vision-ocr-doc-scanner-v3` | OCR Document Intelligence (Tier 3) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 398 | `pr-vision-chart-diagram-v3` | Chart & Architecture Visualizer (Tier 3) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 399 | `pr-vision-ui-ux-auditor-v3` | UI/UX Screen Inspector (Tier 3) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 400 | `pr-vision-infographic-parser-v3` | Infographic Insight Extractor (Tier 3) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 401 | `pr-vision-scene-descriptor-v3` | Spatial & Scene Comprehender (Tier 3) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 402 | `pr-vision-ocr-doc-scanner-v4` | OCR Document Intelligence (Tier 4) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 403 | `pr-vision-chart-diagram-v4` | Chart & Architecture Visualizer (Tier 4) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 404 | `pr-vision-ui-ux-auditor-v4` | UI/UX Screen Inspector (Tier 4) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 405 | `pr-vision-infographic-parser-v4` | Infographic Insight Extractor (Tier 4) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 406 | `pr-vision-scene-descriptor-v4` | Spatial & Scene Comprehender (Tier 4) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 407 | `pr-vision-ocr-doc-scanner-v5` | OCR Document Intelligence (Tier 5) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 408 | `pr-vision-chart-diagram-v5` | Chart & Architecture Visualizer (Tier 5) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 409 | `pr-vision-ui-ux-auditor-v5` | UI/UX Screen Inspector (Tier 5) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 410 | `pr-vision-infographic-parser-v5` | Infographic Insight Extractor (Tier 5) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 411 | `pr-vision-scene-descriptor-v5` | Spatial & Scene Comprehender (Tier 5) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 412 | `pr-vision-ocr-doc-scanner-v6` | OCR Document Intelligence (Tier 6) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 413 | `pr-vision-chart-diagram-v6` | Chart & Architecture Visualizer (Tier 6) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 414 | `pr-vision-ui-ux-auditor-v6` | UI/UX Screen Inspector (Tier 6) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 415 | `pr-vision-infographic-parser-v6` | Infographic Insight Extractor (Tier 6) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 416 | `pr-vision-scene-descriptor-v6` | Spatial & Scene Comprehender (Tier 6) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 417 | `pr-vision-ocr-doc-scanner-v7` | OCR Document Intelligence (Tier 7) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 418 | `pr-vision-chart-diagram-v7` | Chart & Architecture Visualizer (Tier 7) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 419 | `pr-vision-ui-ux-auditor-v7` | UI/UX Screen Inspector (Tier 7) | vision | standard | 128,000 | 32,768 | 0.25 | 0.75 | 0.3929 | 1.1786 | 38.11 | 114.32 | no | `openrouter/nemotron-3.5-super-vl` |
| 420 | `pr-fast-instant-reply` | Instant Customer Reply | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 421 | `pr-fast-realtime-moderator` | Realtime Stream Moderator | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 422 | `pr-fast-micro-parser` | Micro-Payload Parser | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 423 | `pr-fast-quick-editor` | Instant Grammar & Polish | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 424 | `pr-fast-autocomplete-hint` | Autocomplete Code Predictor | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 425 | `pr-fast-instant-reply-v2` | Instant Customer Reply (Tier 2) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 426 | `pr-fast-realtime-moderator-v2` | Realtime Stream Moderator (Tier 2) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 427 | `pr-fast-micro-parser-v2` | Micro-Payload Parser (Tier 2) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 428 | `pr-fast-quick-editor-v2` | Instant Grammar & Polish (Tier 2) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 429 | `pr-fast-autocomplete-hint-v2` | Autocomplete Code Predictor (Tier 2) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 430 | `pr-fast-instant-reply-v3` | Instant Customer Reply (Tier 3) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 431 | `pr-fast-realtime-moderator-v3` | Realtime Stream Moderator (Tier 3) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 432 | `pr-fast-micro-parser-v3` | Micro-Payload Parser (Tier 3) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 433 | `pr-fast-quick-editor-v3` | Instant Grammar & Polish (Tier 3) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 434 | `pr-fast-autocomplete-hint-v3` | Autocomplete Code Predictor (Tier 3) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 435 | `pr-fast-instant-reply-v4` | Instant Customer Reply (Tier 4) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 436 | `pr-fast-realtime-moderator-v4` | Realtime Stream Moderator (Tier 4) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 437 | `pr-fast-micro-parser-v4` | Micro-Payload Parser (Tier 4) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 438 | `pr-fast-quick-editor-v4` | Instant Grammar & Polish (Tier 4) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 439 | `pr-fast-autocomplete-hint-v4` | Autocomplete Code Predictor (Tier 4) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 440 | `pr-fast-instant-reply-v5` | Instant Customer Reply (Tier 5) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 441 | `pr-fast-realtime-moderator-v5` | Realtime Stream Moderator (Tier 5) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 442 | `pr-fast-micro-parser-v5` | Micro-Payload Parser (Tier 5) | fast | lite | 131,072 | 16,384 | 0.08 | 0.24 | 0.1257 | 0.3771 | 12.19 | 36.58 | no | `requesty/ling-3.1-flash` |
| 443 | `pr-ctx-million-token-auditor` | 1M+ Token Corpus Auditor | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 444 | `pr-ctx-codebase-indexer` | Monorepo Codebase Indexer | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 445 | `pr-ctx-legal-contract-depot` | Multi-Contract Master Agreement | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 446 | `pr-ctx-financial-ledger-book` | Annual Report & 10-K Synthesizer | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 447 | `pr-ctx-historical-archive` | Full-Transcript Meeting Digest | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 448 | `pr-ctx-million-token-auditor-v2` | 1M+ Token Corpus Auditor (Tier 2) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 449 | `pr-ctx-codebase-indexer-v2` | Monorepo Codebase Indexer (Tier 2) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 450 | `pr-ctx-legal-contract-depot-v2` | Multi-Contract Master Agreement (Tier 2) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 451 | `pr-ctx-financial-ledger-book-v2` | Annual Report & 10-K Synthesizer (Tier 2) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 452 | `pr-ctx-historical-archive-v2` | Full-Transcript Meeting Digest (Tier 2) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 453 | `pr-ctx-million-token-auditor-v3` | 1M+ Token Corpus Auditor (Tier 3) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 454 | `pr-ctx-codebase-indexer-v3` | Monorepo Codebase Indexer (Tier 3) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 455 | `pr-ctx-legal-contract-depot-v3` | Multi-Contract Master Agreement (Tier 3) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 456 | `pr-ctx-financial-ledger-book-v3` | Annual Report & 10-K Synthesizer (Tier 3) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 457 | `pr-ctx-historical-archive-v3` | Full-Transcript Meeting Digest (Tier 3) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 458 | `pr-ctx-million-token-auditor-v4` | 1M+ Token Corpus Auditor (Tier 4) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 459 | `pr-ctx-codebase-indexer-v4` | Monorepo Codebase Indexer (Tier 4) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 460 | `pr-ctx-legal-contract-depot-v4` | Multi-Contract Master Agreement (Tier 4) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 461 | `pr-ctx-financial-ledger-book-v4` | Annual Report & 10-K Synthesizer (Tier 4) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 462 | `pr-ctx-historical-archive-v4` | Full-Transcript Meeting Digest (Tier 4) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 463 | `pr-ctx-million-token-auditor-v5` | 1M+ Token Corpus Auditor (Tier 5) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 464 | `pr-ctx-codebase-indexer-v5` | Monorepo Codebase Indexer (Tier 5) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 465 | `pr-ctx-legal-contract-depot-v5` | Multi-Contract Master Agreement (Tier 5) | long_context | ultra | 1,048,576 | 32,768 | 0.4 | 1.2 | 0.6286 | 1.8857 | 60.97 | 182.91 | no | `requesty/nemotron-3-ultra-550b-a55b` |
| 466 | `pr-creative-fiction-worldbuilder` | Fiction & Worldbuilder | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 467 | `pr-creative-screenplay-dialogue` | Screenplay & Scene Writer | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 468 | `pr-creative-poetic-artisan` | Poetic & Metaphoric Artisan | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 469 | `pr-creative-game-lore-craftsman` | Game Lore & NPC Dialogue | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 470 | `pr-creative-fiction-worldbuilder-v2` | Fiction & Worldbuilder (Tier 2) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 471 | `pr-creative-screenplay-dialogue-v2` | Screenplay & Scene Writer (Tier 2) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 472 | `pr-creative-poetic-artisan-v2` | Poetic & Metaphoric Artisan (Tier 2) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 473 | `pr-creative-game-lore-craftsman-v2` | Game Lore & NPC Dialogue (Tier 2) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 474 | `pr-creative-fiction-worldbuilder-v3` | Fiction & Worldbuilder (Tier 3) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 475 | `pr-creative-screenplay-dialogue-v3` | Screenplay & Scene Writer (Tier 3) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 476 | `pr-creative-poetic-artisan-v3` | Poetic & Metaphoric Artisan (Tier 3) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 477 | `pr-creative-game-lore-craftsman-v3` | Game Lore & NPC Dialogue (Tier 3) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 478 | `pr-creative-fiction-worldbuilder-v4` | Fiction & Worldbuilder (Tier 4) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 479 | `pr-creative-screenplay-dialogue-v4` | Screenplay & Scene Writer (Tier 4) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 480 | `pr-creative-poetic-artisan-v4` | Poetic & Metaphoric Artisan (Tier 4) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 481 | `pr-creative-game-lore-craftsman-v4` | Game Lore & NPC Dialogue (Tier 4) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 482 | `pr-creative-fiction-worldbuilder-v5` | Fiction & Worldbuilder (Tier 5) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 483 | `pr-creative-screenplay-dialogue-v5` | Screenplay & Scene Writer (Tier 5) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 484 | `pr-creative-poetic-artisan-v5` | Poetic & Metaphoric Artisan (Tier 5) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 485 | `pr-creative-game-lore-craftsman-v5` | Game Lore & NPC Dialogue (Tier 5) | creative | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `prorouter/deepseek-v4.1-flash` |
| 486 | `pr-biz-board-memo` | Board Memo & Investor Update | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 487 | `pr-biz-sales-pitch-craft` | Enterprise Sales Strategist | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 488 | `pr-biz-product-spec-lead` | PRD & Product Spec Lead | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 489 | `pr-biz-board-memo-v2` | Board Memo & Investor Update (Tier 2) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 490 | `pr-biz-sales-pitch-craft-v2` | Enterprise Sales Strategist (Tier 2) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 491 | `pr-biz-product-spec-lead-v2` | PRD & Product Spec Lead (Tier 2) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 492 | `pr-biz-board-memo-v3` | Board Memo & Investor Update (Tier 3) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 493 | `pr-biz-sales-pitch-craft-v3` | Enterprise Sales Strategist (Tier 3) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 494 | `pr-biz-product-spec-lead-v3` | PRD & Product Spec Lead (Tier 3) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 495 | `pr-biz-board-memo-v4` | Board Memo & Investor Update (Tier 4) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 496 | `pr-biz-sales-pitch-craft-v4` | Enterprise Sales Strategist (Tier 4) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 497 | `pr-biz-product-spec-lead-v4` | PRD & Product Spec Lead (Tier 4) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 498 | `pr-biz-board-memo-v5` | Board Memo & Investor Update (Tier 5) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 499 | `pr-biz-sales-pitch-craft-v5` | Enterprise Sales Strategist (Tier 5) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
| 500 | `pr-biz-product-spec-lead-v5` | PRD & Product Spec Lead (Tier 5) | business | standard | 131,072 | 32,768 | 0.2 | 0.6 | 0.3143 | 0.9429 | 30.49 | 91.46 | no | `groq/gpt-oss-120b` |
