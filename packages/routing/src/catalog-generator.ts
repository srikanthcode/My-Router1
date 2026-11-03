import type { FrontendModelProfile, ModelCategory, CapabilityProfile, ProfileBehavior, RoutingPolicy } from "./types.js";

function caps(overrides: Partial<CapabilityProfile> = {}): CapabilityProfile {
  return {
    general_intelligence: "supported",
    reasoning: "supported",
    deep_reasoning: "unknown",
    mathematics: "unknown",
    coding: "unknown",
    agentic_coding: "unknown",
    tool_calling: "supported",
    function_calling: "supported",
    vision: "unsupported",
    image_understanding: "unsupported",
    document_understanding: "unknown",
    multilingual: "supported",
    tamil_language: "unknown",
    long_context: "unknown",
    json_structured: "supported",
    streaming: "supported",
    low_latency: "supported",
    complex_analysis: "unknown",
    research: "unknown",
    planning: "unknown",
    instruction_following: "supported",
    ...overrides,
  };
}

export function generateProfiles(): FrontendModelProfile[] {
  const list: FrontendModelProfile[] = [];
  const seenIds = new Set<string>();

  function add(profile: FrontendModelProfile) {
    if (seenIds.has(profile.id)) {
      throw new Error(`Duplicate profile ID generated: ${profile.id}`);
    }
    seenIds.add(profile.id);
    list.push(profile);
  }

  // ── Existing 22 Frontend Identities (§3) ──
  const legacyIdentities = [
    { id: "claude-sonnet", name: "Claude Sonnet", category: "coding", desc: "Anthropic Claude Sonnet — balanced intelligence, high coding precision, and nuanced creative writing." },
    { id: "claude-opus", name: "Claude Opus", category: "reasoning", desc: "Anthropic Claude Opus — deep analysis, nuanced reasoning, and complex task decomposition." },
    { id: "claude-opus-5", name: "Claude Opus 5", category: "reasoning", desc: "Anthropic Claude Opus 5 — next-generation frontier intelligence for research and coding." },
    { id: "gemini-pro", name: "Gemini Pro", category: "general", desc: "Google Gemini Pro — powerful multimodal model with vast context window and world knowledge." },
    { id: "grok", name: "Grok", category: "general", desc: "xAI Grok — direct, truthful AI with real-time insight and witty demeanor." },
    { id: "mistral-large", name: "Mistral Large", category: "reasoning", desc: "Mistral Large — flagship model for complex multilingual reasoning and precise instruction following." },
    { id: "devstral-24b", name: "Devstral 24B", category: "coding", desc: "Mistral Devstral 24B — developer-tuned open weights optimized for software engineering workflows." },
    { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", category: "reasoning", desc: "OpenAI GPT-6.1 Sol — frontier cloud model optimized for high-speed reasoning and synthesis." },
    { id: "gpt-6.1-terra", name: "GPT-6.1 Terra", category: "research", desc: "OpenAI GPT-6.1 Terra — flagship multimodal intelligence with deep scientific knowledge." },
    { id: "gpt-6-luna", name: "GPT-6 Luna", category: "fast", desc: "OpenAI GPT-6 Luna — low-latency next-gen assistant for rapid task execution." },
    { id: "kimi-k3", name: "Kimi K3", category: "long_context", desc: "Moonshot Kimi K3 — ultra long-context frontier model with high-speed reasoning and deep comprehension." },
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", category: "coding", desc: "Moonshot Kimi K2.7 Code — specialized code intelligence and agentic workflow automation." },
    { id: "glm-5.3", name: "GLM-5.3", category: "reasoning", desc: "Zhipu GLM-5.3 — flagship bilingual reasoning, analytical thinking, and tool execution." },
    { id: "glm-5.3-flash", name: "GLM-5.3-Flash", category: "fast", desc: "Zhipu GLM 5.3 Flash — fast multilingual reasoning with high-speed tool execution." },
    { id: "mimo-v2.6-pro", name: "MiMo-V2.6-Pro", category: "reasoning", desc: "Xiaomi MiMo V2.6 Pro — flagship multimodal reasoning model for advanced synthesis and coding." },
    { id: "mimo-v2.6-flash", name: "MiMo-V2.6-Flash", category: "fast", desc: "Xiaomi MiMo Flash — quick responses with solid reasoning." },
    { id: "minimax-m3.1-flash", name: "MiniMax M3.1 Flash", category: "fast", desc: "MiniMax M3.1 Flash — fast multimodal model with reliable tool calling and low latency." },
    { id: "qwen3-coder-next", name: "Qwen3-Coder-Next", category: "coding", desc: "Alibaba Qwen3 Coder Next — specialized coding model for repository synthesis and multi-file debugging." },
    { id: "deepseek-v4-pro-0813", name: "DeepSeek-V4-Pro-0813", category: "coding", desc: "DeepSeek V4 Pro — high-throughput frontier reasoning and deep architectural coding." },
    { id: "beam", name: "Beam", category: "general", desc: "Fast general-purpose model for everyday chat and drafting." },
    { id: "longcat-2.5-preview", name: "LongCat 2.5 Preview", category: "long_context", desc: "Meituan LongCat 2.5 — long-context preview with strong multilingual reasoning." },
    { id: "jev-1.13", name: "Jev 1.13", category: "general", desc: "Jev 1.13 — general-purpose assistant with balanced speed and quality." },
  ];

  for (let i = 0; i < legacyIdentities.length; i++) {
    const item = legacyIdentities[i]!;
    add({
      id: item.id,
      name: item.name,
      category: item.category as ModelCategory,
      categoryLabel: formatCategoryLabel(item.category as ModelCategory),
      description: item.desc,
      status: "production",
      contextWindow: 262144,
      maxOutputTokens: 64000,
      pricingTier: "standard",
      isFree: true,
      capabilities: caps({
        reasoning: "supported",
        coding: item.category === "coding" ? "supported" : "unknown",
        agentic_coding: item.category === "coding" ? "supported" : "unknown",
        long_context: item.category === "long_context" ? "supported" : "unknown",
        low_latency: item.category === "fast" ? "supported" : "unknown",
      }),
      behavior: {
        reasoning_style: "structured",
        answer_style: "clear_and_precise",
        verbosity: "adaptive",
        instruction_following: "strict",
        tool_usage: "when_needed",
        formatting: "chat_assistant",
        uncertainty_handling: "transparent",
        system_prompt_template: `You are ${item.name}, a premier AI assistant powered by ProRouter intelligent routing. Provide thorough, high-precision responses tailored to the user request.`,
      },
      routingPolicy: {
        primaryBackend: "prorouter/deepseek-v4.1-flash",
        finalFallback: "prorouter/deepseek-v4.1-flash",
        requiredCapabilities: ["general_intelligence"],
      },
      rank: 10 + i,
      popularity: 9900 - i * 15,
      rating: 98,
      tags: ["legacy", item.category, "pro"],
    });
  }

  // ── Native Verified Live Models ──
  const verifiedLive = [
    { id: "gpt-oss-20b", name: "GPT OSS 20B", cat: "reasoning", primary: "nabh/gpt-oss-20b", sec: "groq/gpt-oss-20b", desc: "Open-weight 20B parameter reasoning and chat model with high speed and chain-of-thought capabilities." },
    { id: "gpt-oss-120b", name: "GPT OSS 120B", cat: "reasoning", primary: "groq/gpt-oss-120b", sec: "prorouter/deepseek-v4.1-flash", desc: "OpenAI open-weight 120B parameter MoE reasoning architecture running on Groq LPU." },
    { id: "qwen/qwen3.8-27b", name: "Qwen 3.8 27B", cat: "coding", primary: "groq/qwen3.8-27b", sec: "prorouter/deepseek-v4.1-flash", desc: "Alibaba Qwen3.8 27B — high-performance open-weight model with strong multilingual and reasoning abilities." },
    { id: "qwen3.8-27b", name: "Qwen3.8-27B (Standard)", cat: "coding", primary: "groq/qwen3.8-27b", sec: "prorouter/deepseek-v4.1-flash", desc: "Alibaba Qwen3.8 27B standard model alias running on high-speed inference." },
    { id: "nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B A55B", cat: "reasoning", primary: "requesty/nemotron-3-ultra-550b-a55b", sec: "openrouter/nemotron-3-ultra-550b-a55b", desc: "NVIDIA Nemotron 3 Ultra 550B A55B — ultra-scale frontier reasoning engine with 1M context." },
    { id: "nemotron-3-nano-omni-30b-a3b-reasoning", name: "Nemotron 3 Nano Omni 30B Reasoning", cat: "vision", primary: "requesty/nemotron-3-nano-omni-30b-a3b-reasoning", sec: "openrouter/nemotron-3-nano-omni-30b-a3b-reasoning", desc: "NVIDIA Nemotron 3 Nano Omni 30B — deep chain-of-thought reasoning and multimodal STEM problem-solving." },
    { id: "nemotron-3.5-lightning-30b-a3b", name: "Nemotron 3.5 Lightning 30B A3B", cat: "fast", primary: "requesty/nemotron-3.5-lightning-30b-a3b", sec: "openrouter/nemotron-3.5-lightning", desc: "NVIDIA Nemotron 3.5 Lightning 30B A3B — lightning-fast inference with an extraordinary 1M context window." },
    { id: "nemotron-3.5-lightning", name: "Nemotron 3.5 Lightning", cat: "fast", primary: "openrouter/nemotron-3.5-lightning", sec: "requesty/nemotron-3.5-lightning-30b-a3b", desc: "NVIDIA Nemotron 3.5 Lightning — low-latency assistant for high-volume work." },
    { id: "nemotron-3.5-super-vl", name: "Nemotron 3.5 Super VL", cat: "vision", primary: "openrouter/nemotron-3.5-super-vl", sec: "prorouter/deepseek-v4.1-flash", desc: "NVIDIA Nemotron 3.5 Super — high-capacity vision-language reasoning." },
    { id: "gemma-4-31b-it", name: "Gemma 4 31B IT", cat: "multilingual", primary: "requesty/gemma-4-31b-it", sec: "prorouter/deepseek-v4.1-flash", desc: "Google Gemma 4 31B Instruction-Tuned — Google's latest open frontier architecture featuring 262K context." },
    { id: "leanstral-1-5", name: "Leanstral 1.5", cat: "reasoning", primary: "requesty/leanstral-1-5", sec: "prorouter/deepseek-v4.1-flash", desc: "Mistral Leanstral 1.5 — high-efficiency reasoning model with massive 262K context." },
    { id: "ling-3.1-flash", name: "Ling 3.1 Flash", cat: "fast", primary: "requesty/ling-3.1-flash", sec: "prorouter/deepseek-v4.1-flash", desc: "Novita Ling 3.1 Flash — ultra-responsive 262K context model for conversational speed." },
    { id: "allam-2-7b", name: "Allam 2 7B", cat: "multilingual", primary: "groq/allam-2-7b", sec: "prorouter/deepseek-v4.1-flash", desc: "SDAIA high-performance bilingual Arabic & English foundational language model." },
    { id: "deepseek-v4.1-flash-1017", name: "DeepSeek-V4.1-Flash-1017", cat: "coding", primary: "prorouter/deepseek-v4.1-flash", sec: "prorouter/deepseek-v4.1-flash", desc: "DeepSeek V4.1 Flash checkpoint 1017 — latest frontier open-weight reasoning model." },
    { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", cat: "coding", primary: "prorouter/deepseek-v4.1-flash", sec: "prorouter/deepseek-v4.1-flash", desc: "DeepSeek V4.1 Flash — state-of-the-art high-speed reasoning, coding, and multilingual intelligence." },
  ];

  for (let i = 0; i < verifiedLive.length; i++) {
    const item = verifiedLive[i]!;
    add({
      id: item.id,
      name: item.name,
      category: item.cat as ModelCategory,
      categoryLabel: formatCategoryLabel(item.cat as ModelCategory),
      description: item.desc,
      status: "production",
      contextWindow: item.cat === "long_context" ? 1048576 : 131072,
      maxOutputTokens: 32768,
      pricingTier: "standard",
      isFree: true,
      capabilities: caps({
        reasoning: "supported",
        coding: item.cat === "coding" ? "supported" : "unknown",
        vision: item.cat === "vision" ? "supported" : "unsupported",
        multilingual: "supported",
        low_latency: item.cat === "fast" ? "supported" : "unknown",
      }),
      behavior: {
        reasoning_style: item.cat === "reasoning" ? "structured" : "concise",
        answer_style: item.cat === "coding" ? "code_first" : "clear_and_precise",
        verbosity: "adaptive",
        instruction_following: "strict",
        tool_usage: "when_needed",
        formatting: "chat_assistant",
        uncertainty_handling: "transparent",
        system_prompt_template: `You are ${item.name}. Provide authentic, direct responses without claiming unverified capabilities.`,
      },
      routingPolicy: {
        primaryBackend: item.primary,
        secondaryBackend: item.sec,
        finalFallback: "prorouter/deepseek-v4.1-flash",
        requiredCapabilities: item.cat === "vision" ? ["vision"] : ["general_intelligence"],
      },
      rank: 1 + i,
      popularity: 9950 - i * 10,
      rating: 99,
      tags: ["verified", "live", item.cat],
    });
  }

  // ── Category Specifications for 500+ Profiles (§4) ──
  const categorySpecs: Array<{
    category: ModelCategory;
    targetCount: number;
    primaryBackend: string;
    secondaryBackend: string;
    finalFallback: string;
    prefix: string;
    specialCaps: Partial<CapabilityProfile>;
    behaviorDefaults: Partial<ProfileBehavior>;
    subdomains: Array<{ suffix: string; title: string; desc: string; extraCaps?: Partial<CapabilityProfile> }>;
  }> = [
    // 1. General-purpose AI: 70 target
    {
      category: "general",
      targetCount: 70,
      prefix: "gen",
      primaryBackend: "prorouter/deepseek-v4.1-flash",
      secondaryBackend: "groq/gpt-oss-120b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { general_intelligence: "supported", reasoning: "supported", instruction_following: "supported" },
      behaviorDefaults: { answer_style: "conversational", reasoning_style: "structured", verbosity: "adaptive" },
      subdomains: [
        { suffix: "omni-core", title: "Omni Core", desc: "Balanced everyday conversational intelligence and multi-topic comprehension." },
        { suffix: "dialogue-pro", title: "Dialogue Pro", desc: "Fluent, interactive assistant tuned for multi-turn brainstorming and dialogue." },
        { suffix: "knowledge-base", title: "Knowledge Base", desc: "Encyclopedic inquiry assistant for contextual lookups and factual explanation." },
        { suffix: "briefing-desk", title: "Briefing Desk", desc: "Executive summarizer designed for crisp briefings and high-density digests." },
        { suffix: "clarity-engine", title: "Clarity Engine", desc: "Transparent assistant focusing on plain language breakdown of convoluted topics." },
        { suffix: "writer-companion", title: "Writer Companion", desc: "Collaborative drafting assistant for memos, emails, and structured outlines." },
        { suffix: "inquiry-agent", title: "Inquiry Agent", desc: "Active-listening assistant asking clarifying questions to hone requirements." },
      ],
    },

    // 2. Advanced reasoning: 65 target
    {
      category: "reasoning",
      targetCount: 65,
      prefix: "reason",
      primaryBackend: "requesty/nemotron-3-ultra-550b-a55b",
      secondaryBackend: "groq/gpt-oss-120b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { reasoning: "supported", deep_reasoning: "supported", complex_analysis: "supported", planning: "supported" },
      behaviorDefaults: { reasoning_style: "step_by_step", answer_style: "clear_and_precise", uncertainty_handling: "transparent" },
      subdomains: [
        { suffix: "cot-analytical", title: "Chain-of-Thought Analyst", desc: "Rigorous step-by-step chain-of-thought breakdown of multi-constraint problems." },
        { suffix: "deductive-logic", title: "Deductive Logic Engine", desc: "Formal propositional and first-order predicate logic validator." },
        { suffix: "causal-inference", title: "Causal Inference Model", desc: "Counterfactual reasoning and root-cause analysis across complex variables." },
        { suffix: "systems-thinker", title: "Systems Architecture Thinker", desc: "Macro-level feedback loop evaluation and second-order effect modeling." },
        { suffix: "fallacy-detector", title: "Cognitive Auditor", desc: "Rhetorical bias identification, argument stress-testing, and assumption auditing." },
        { suffix: "decision-matrix", title: "Decision Matrix Pro", desc: "Multi-criteria tradeoff evaluator weighting risks, costs, and strategic outcomes." },
        { suffix: "hypothesis-tester", title: "Scientific Hypothesizer", desc: "Falsification testing and empirical experimental protocol design." },
      ],
    },

    // 3. Coding and software engineering: 85 target
    {
      category: "coding",
      targetCount: 85,
      prefix: "code",
      primaryBackend: "groq/qwen3.8-27b",
      secondaryBackend: "requesty/nemotron-3-ultra-550b-a55b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { coding: "supported", tool_calling: "supported", json_structured: "supported" },
      behaviorDefaults: { answer_style: "code_first", formatting: "code_focused", instruction_following: "strict" },
      subdomains: [
        { suffix: "fullstack-architect", title: "Fullstack Architect", desc: "Next.js, TypeScript, Tailwind, and serverless distributed architecture synthesis." },
        { suffix: "python-systems", title: "Python Systems Engineer", desc: "AsyncIO, FastAPI, PyTorch, and high-performance backend Python pipeline design." },
        { suffix: "rust-memory", title: "Rust & Systems Safety", desc: "Zero-cost abstractions, borrow-checker resolution, and unsafe audit engineering." },
        { suffix: "database-internals", title: "Database & SQL Specialist", desc: "PostgreSQL query plan optimization, indexing strategies, and schema migrations." },
        { suffix: "devops-cloud", title: "Cloud & Kubernetes Engineer", desc: "Terraform IaC, Helm charts, CI/CD GitHub workflows, and container networking." },
        { suffix: "frontend-perf", title: "React & Web Performance", desc: "Hydration minimization, memoization, WebGL, and micro-frontend design." },
        { suffix: "security-auditor", title: "Application Security Auditor", desc: "OWASP Top 10 mitigation, auth handshake verification, and sanitize checks." },
        { suffix: "refactor-clean", title: "Refactoring & Clean Code", desc: "Dead code elimination, design pattern retrofitting, and cyclomatic complexity reduction." },
      ],
    },

    // 4. Agentic coding and tool use: 45 target
    {
      category: "agentic",
      targetCount: 45,
      prefix: "agent",
      primaryBackend: "requesty/nemotron-3-ultra-550b-a55b",
      secondaryBackend: "groq/qwen3.8-27b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { agentic_coding: "supported", tool_calling: "supported", function_calling: "supported", planning: "supported" },
      behaviorDefaults: { tool_usage: "always", formatting: "code_focused", reasoning_style: "structured" },
      subdomains: [
        { suffix: "workflow-runner", title: "Autonomous Workflow Orchestrator", desc: "Multi-step tool calling, API sequencing, and rollback-aware execution." },
        { suffix: "repo-synthesizer", title: "Repo-Level Agent", desc: "Multi-file repository navigation, diff synthesis, and test runner verification." },
        { suffix: "schema-tooler", title: "Strict Schema Invoker", desc: "Deterministic JSON Schema and Zod tool call parameter generation without hallucinations." },
        { suffix: "sandbox-debugger", title: "Runtime Sandbox Debugger", desc: "Terminal stderr triage, stack trace inspection, and iterative patch verification." },
        { suffix: "agent-swarm", title: "Subagent Team Lead", desc: "Decomposes complex requests into parallel delegate task queues." },
      ],
    },

    // 5. Research and analysis: 45 target
    {
      category: "research",
      targetCount: 45,
      prefix: "research",
      primaryBackend: "requesty/leanstral-1-5",
      secondaryBackend: "groq/gpt-oss-120b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { research: "supported", complex_analysis: "supported", long_context: "supported" },
      behaviorDefaults: { answer_style: "authoritative", formatting: "academic_paper", verbosity: "comprehensive" },
      subdomains: [
        { suffix: "literature-review", title: "Literature Reviewer", desc: "Cross-disciplinary paper synthesis, citation mapping, and methodology evaluation." },
        { suffix: "competitive-intel", title: "Market & Competitive Intel", desc: "Moat analysis, unit economics breakdown, and patent landscape survey." },
        { suffix: "data-synthesizer", title: "Qualitative Data Synthesizer", desc: "Extracts key findings, clusters themes, and summarizes long unstructured transcripts." },
        { suffix: "meta-analyst", title: "Meta-Analysis Assistant", desc: "Reconciles conflicting studies, evaluates sample sizes, and quantifies statistical significance." },
        { suffix: "deep-investigator", title: "Deep Research Specialist", desc: "Multi-layered investigation exploring historical precedent, modern context, and edge risks." },
      ],
    },

    // 6. Mathematics and science: 30 target
    {
      category: "math_science",
      targetCount: 30,
      prefix: "math",
      primaryBackend: "requesty/nemotron-3-nano-omni-30b-a3b-reasoning",
      secondaryBackend: "groq/gpt-oss-120b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { mathematics: "supported", deep_reasoning: "supported", reasoning: "supported" },
      behaviorDefaults: { reasoning_style: "step_by_step", formatting: "academic_paper", uncertainty_handling: "transparent" },
      subdomains: [
        { suffix: "discrete-proofs", title: "Discrete Math & Proof Assistant", desc: "Inductive proofs, combinatorics, graph theory, and formal lemma verification." },
        { suffix: "calculus-analysis", title: "Continuous Calculus & ODEs", desc: "Multivariable differentiation, integration bounds, and differential equation modeling." },
        { suffix: "linear-algebra", title: "Linear Algebra & Tensor Math", desc: "Eigenvalue decomposition, vector space transformations, and matrix rank calculation." },
        { suffix: "physics-simulator", title: "Classical & Quantum Physics", desc: "Thermodynamics, Lagrangian mechanics, and quantum state formalism analysis." },
        { suffix: "bio-cheminfo", title: "Biochemistry & Molecular Modeling", desc: "Reaction kinematics, ligand-receptor binding affinity, and metabolic pathway exploration." },
      ],
    },

    // 7. Multilingual AI: 35 target (includes explicit Tamil language support)
    {
      category: "multilingual",
      targetCount: 35,
      prefix: "lang",
      primaryBackend: "requesty/gemma-4-31b-it",
      secondaryBackend: "groq/qwen3.8-27b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { multilingual: "supported", tamil_language: "supported", instruction_following: "supported" },
      behaviorDefaults: { answer_style: "clear_and_precise", reasoning_style: "structured" },
      subdomains: [
        { suffix: "tamil-dravidian", title: "Tamil & Dravidian Scholar", desc: "Classical and modern Tamil linguistic fluency, Sangam literature translation, and grammar verification.", extraCaps: { tamil_language: "supported" } },
        { suffix: "indic-translingual", title: "Indic Polyglot", desc: "High-accuracy cross-translation between Hindi, Tamil, Telugu, Kannada, Bengali, and English.", extraCaps: { tamil_language: "supported" } },
        { suffix: "euro-multilingual", title: "European Romance & Germanic", desc: "Nuanced idiomatic translation across French, German, Spanish, Italian, and Portuguese." },
        { suffix: "cjk-specialist", title: "East Asian CJK Specialist", desc: "High-precision Japanese, Korean, and Simplified/Traditional Chinese translation with honorifics." },
        { suffix: "arabic-mena", title: "Arabic & MENA Dialectics", desc: "Modern Standard Arabic and regional Levantine/Gulf dialect synthesis powered by Allam foundation.", extraCaps: { multilingual: "supported" } },
      ],
    },

    // 8. Vision and document understanding: 35 target
    {
      category: "vision",
      targetCount: 35,
      prefix: "vision",
      primaryBackend: "openrouter/nemotron-3.5-super-vl",
      secondaryBackend: "requesty/nemotron-3-nano-omni-30b-a3b-reasoning",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { vision: "supported", image_understanding: "supported", document_understanding: "supported" },
      behaviorDefaults: { answer_style: "clear_and_precise", formatting: "markdown_clean" },
      subdomains: [
        { suffix: "ocr-doc-scanner", title: "OCR Document Intelligence", desc: "Extracts tabular data, forms, and handwritten annotations from high-resolution PDF/image documents." },
        { suffix: "chart-diagram", title: "Chart & Architecture Visualizer", desc: "Interprets Gantt charts, network topologies, UML diagrams, and financial histograms." },
        { suffix: "ui-ux-auditor", title: "UI/UX Screen Inspector", desc: "Audits wireframes, Figma mocks, and mobile screenshots for accessibility and visual hierarchy." },
        { suffix: "infographic-parser", title: "Infographic Insight Extractor", desc: "Converts dense pictorial infographics into structured hierarchical bullet points and JSON." },
        { suffix: "scene-descriptor", title: "Spatial & Scene Comprehender", desc: "Detailed scene decomposition, object bounding analysis, and visual relationship mapping." },
      ],
    },

    // 9. Fast-response AI: 30 target
    {
      category: "fast",
      targetCount: 30,
      prefix: "fast",
      primaryBackend: "requesty/ling-3.1-flash",
      secondaryBackend: "openrouter/nemotron-3.5-lightning",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { low_latency: "supported", streaming: "supported", instruction_following: "supported" },
      behaviorDefaults: { answer_style: "clear_and_precise", verbosity: "compact", formatting: "chat_assistant" },
      subdomains: [
        { suffix: "instant-reply", title: "Instant Customer Reply", desc: "Sub-second turnaround assistant for high-throughput live customer chat and help desks." },
        { suffix: "realtime-moderator", title: "Realtime Stream Moderator", desc: "Rapid toxicity filtering, policy verification, and community guideline enforcement." },
        { suffix: "micro-parser", title: "Micro-Payload Parser", desc: "Lightweight JSON sanitizer for webhook transformation and micro-service routing." },
        { suffix: "quick-editor", title: "Instant Grammar & Polish", desc: "Rapid spellcheck, active voice conversion, and sentence rhythm polishing." },
        { suffix: "autocomplete-hint", title: "Autocomplete Code Predictor", desc: "Ultra-low latency next-token suggestions for interactive editor autocompletion." },
      ],
    },

    // 10. Long-context AI: 25 target
    {
      category: "long_context",
      targetCount: 25,
      prefix: "ctx",
      primaryBackend: "requesty/nemotron-3-ultra-550b-a55b",
      secondaryBackend: "requesty/leanstral-1-5",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { long_context: "supported", research: "supported", complex_analysis: "supported" },
      behaviorDefaults: { verbosity: "comprehensive", reasoning_style: "structured" },
      subdomains: [
        { suffix: "million-token-auditor", title: "1M+ Token Corpus Auditor", desc: "Deep haystack search and cross-chapter reconciliation across 1,000,000 token archives." },
        { suffix: "codebase-indexer", title: "Monorepo Codebase Indexer", desc: "Maintains architectural consistency across hundreds of source files in a single prompt." },
        { suffix: "legal-contract-depot", title: "Multi-Contract Master Agreement", desc: "Compares revisions, exhibits, and indemnity clauses across massive legal dockets." },
        { suffix: "financial-ledger-book", title: "Annual Report & 10-K Synthesizer", desc: "Audits GAAP reconciliations and footnote disclosures across multi-year SEC filings." },
        { suffix: "historical-archive", title: "Full-Transcript Meeting Digest", desc: "Synthesizes hundreds of hours of raw audio transcripts into categorized decisions." },
      ],
    },

    // 11. Creative writing: 20 target
    {
      category: "creative",
      targetCount: 20,
      prefix: "creative",
      primaryBackend: "prorouter/deepseek-v4.1-flash",
      secondaryBackend: "requesty/gemma-4-31b-it",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { general_intelligence: "supported", multilingual: "supported" },
      behaviorDefaults: { answer_style: "conversational", instruction_following: "creative", verbosity: "comprehensive" },
      subdomains: [
        { suffix: "fiction-worldbuilder", title: "Fiction & Worldbuilder", desc: "Intricate worldbuilding, consistent character dialogue, and dynamic narrative pacing." },
        { suffix: "screenplay-dialogue", title: "Screenplay & Scene Writer", desc: "Industry-standard script formatting with punchy subtext and dramatic tension." },
        { suffix: "poetic-artisan", title: "Poetic & Metaphoric Artisan", desc: "Lyrical meter, imagery-rich verse, and innovative metaphorical structures." },
        { suffix: "game-lore-craftsman", title: "Game Lore & NPC Dialogue", desc: "Branching quest design, character backstories, and interactive environmental lore." },
      ],
    },

    // 12. Business and productivity: 15 target
    {
      category: "business",
      targetCount: 15,
      prefix: "biz",
      primaryBackend: "groq/gpt-oss-120b",
      secondaryBackend: "requesty/nemotron-3-ultra-550b-a55b",
      finalFallback: "prorouter/deepseek-v4.1-flash",
      specialCaps: { general_intelligence: "supported", json_structured: "supported", complex_analysis: "supported" },
      behaviorDefaults: { answer_style: "executive_brief", formatting: "technical_memo", verbosity: "compact" },
      subdomains: [
        { suffix: "board-memo", title: "Board Memo & Investor Update", desc: "Crisp executive updates, OKR summaries, and unit economics presentations." },
        { suffix: "sales-pitch-craft", title: "Enterprise Sales Strategist", desc: "Objection handling, RFP responses, and value proposition alignment." },
        { suffix: "product-spec-lead", title: "PRD & Product Spec Lead", desc: "Detailed feature specs, acceptance criteria, edge case lists, and user journey flows." },
      ],
    },
  ];

  // ── Expand Profiles Per Category To Reach Target Quotas ──
  let globalRank = 100;
  for (const spec of categorySpecs) {
    const existingCountForCategory = list.filter((p) => p.category === spec.category).length;
    const needed = Math.max(0, spec.targetCount - existingCountForCategory);
    const subCount = spec.subdomains.length;

    for (let i = 0; i < needed; i++) {
      const sub = spec.subdomains[i % subCount]!;
      const cycle = Math.floor(i / subCount) + 1;
      const profileId = cycle === 1 ? `pr-${spec.prefix}-${sub.suffix}` : `pr-${spec.prefix}-${sub.suffix}-v${cycle}`;
      const profileName = cycle === 1 ? sub.title : `${sub.title} (Tier ${cycle})`;

      add({
        id: profileId,
        name: profileName,
        category: spec.category,
        categoryLabel: formatCategoryLabel(spec.category),
        description: `${sub.desc} Calibrated for ${spec.category.replace("_", " ")} workloads.`,
        status: "production",
        contextWindow: spec.category === "long_context" ? 1048576 : (spec.category === "vision" ? 128000 : 131072),
        maxOutputTokens: spec.category === "fast" ? 16384 : 32768,
        pricingTier: spec.category === "fast" ? "lite" : (spec.category === "coding" || spec.category === "reasoning" ? "code" : "standard"),
        isFree: true,
        capabilities: caps({
          ...spec.specialCaps,
          ...(sub.extraCaps || {}),
        }),
        behavior: {
          reasoning_style: "structured",
          answer_style: "clear_and_precise",
          verbosity: "adaptive",
          instruction_following: "strict",
          tool_usage: "when_needed",
          formatting: "chat_assistant",
          uncertainty_handling: "transparent",
          ...spec.behaviorDefaults,
          system_prompt_template: `You are ${profileName}, a specialized AI model profile on ProRouter. When introducing yourself, identify authentically as ${profileName}. Deliver precise, high-performance answers in your domain.`,
        },
        routingPolicy: {
          primaryBackend: spec.primaryBackend,
          secondaryBackend: spec.secondaryBackend,
          finalFallback: spec.finalFallback,
          requiredCapabilities: Object.keys(spec.specialCaps) as (keyof CapabilityProfile)[],
        },
        rank: globalRank++,
        popularity: 9000 - (globalRank % 1000),
        rating: 96,
        tags: [spec.category, "production", spec.prefix],
      });
    }
  }

  return list;
}

function formatCategoryLabel(cat: ModelCategory): string {
  switch (cat) {
    case "general": return "General-Purpose AI";
    case "reasoning": return "Advanced Reasoning";
    case "coding": return "Coding & Software Engineering";
    case "agentic": return "Agentic Coding & Tools";
    case "research": return "Research & Analysis";
    case "math_science": return "Mathematics & Science";
    case "multilingual": return "Multilingual & Indic AI";
    case "vision": return "Vision & Document Intelligence";
    case "fast": return "Fast-Response AI";
    case "long_context": return "Long-Context AI";
    case "creative": return "Creative Writing";
    case "business": return "Business & Productivity";
  }
}
