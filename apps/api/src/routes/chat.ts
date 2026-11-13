import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { apiKeys, getDb, modelProviders, models, plans, promotionalActivations, providers, requestAttempts, requests, subscriptions } from "@pro/database";
import { ApiError, requestCost, env, type ChatMessage, type Usage, type UsageSource, applyPersonaToMessages, sanitizeModelOutput, resolvePromotionalCanonicalId } from "@pro/shared";
import { estimateTokens } from "@pro/providers";
import { routeRequest, ModelProfileRegistry, ModelBehaviorEngine } from "@pro/routing";
import { getActiveAstra } from "../lib/auth.js";
import { authenticateRequest, enforceRateLimits } from "../lib/request-auth.js";
import { consumeFreeQuota } from "../lib/freequota.js";
import { acquireSlot, probeQueue, releaseSlot, type QueueStatus } from "../lib/queue.js";
import { assertAffordable, debitWallet, reserveBalance, settleReservation, releaseReservation } from "../lib/wallet.js";
import { eventHub } from "../lib/events.js";
import { extractHints, executeChat, hydrateCandidates, loadModelContext, resolveAutoModel, resolveModelInput, streamChat } from "../lib/pipeline.js";
import { getFlag, getNumber } from "../lib/settings.js";
import { getUsdToInrRate, resolveEffectivePricing } from "../lib/pricing.js";
import { randomBytes } from "node:crypto";

const bodySchema = z.looseObject({
  model: z.string().min(1),
  messages: z.array(z.looseObject({ role: z.string() })).min(1).max(500),
  stream: z.boolean().optional(),
  stream_options: z.unknown().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.unknown().optional(),
  parallel_tool_calls: z.boolean().optional(),
  response_format: z.unknown().optional(),
  seed: z.number().optional(),
  user: z.string().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  logit_bias: z.unknown().optional(),
  logprobs: z.boolean().optional(),
  top_logprobs: z.number().int().optional(),
  n: z.number().int().positive().optional(),
});

interface PlanInfo {
  slug: string;
  name: string;
  freeRpm: number;
  freeRph: number;
  freeRpd: number;
  concurrency: number;
  queuePriority: number;
}

async function getUserPlan(userId: string): Promise<PlanInfo> {
  const db = await getDb();
  const rows = await db.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.userId, userId));
  const sub = rows.find((r) => r.plan && r.plan.active);
  if (sub) return { slug: sub.plan.slug, name: sub.plan.name, freeRpm: sub.plan.freeRpm, freeRph: sub.plan.freeRph, freeRpd: sub.plan.freeRpd, concurrency: sub.plan.concurrency, queuePriority: sub.plan.queuePriority };
  return { slug: "free", name: "Free", freeRpm: 1, freeRph: 20, freeRpd: 100, concurrency: 1, queuePriority: 5 };
}

function countMessageTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else if (Array.isArray(m.content)) for (const p of m.content) if (p.text) chars += p.text.length;
    chars += 8;
  }
  return Math.max(1, Math.ceil(chars / 4));
}

function newRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}

export async function chatRoutes(app: FastifyInstance) {
  // ── OpenAI-compatible model listing (Official Pro Router 5 Text Models) ──
  const PRO_MODELS_DATA = [
    {
      id: "pr-echo",
      name: "Pro Router Echo",
      object: "model",
      created: 1710000000,
      owned_by: "prorouter",
      tier: "Starter",
      description: "A basic, affordable text-to-text model for everyday questions, short answers, summaries, and simple chat.",
      pricing: { input_usd_per_million: 0.20, output_usd_per_million: 0.80 },
    },
    {
      id: "pr-swift",
      name: "Pro Router Swift",
      object: "model",
      created: 1710000000,
      owned_by: "prorouter",
      tier: "Fast",
      description: "Designed for quick responses, customer support, chatbots, and high-volume applications.",
      pricing: { input_usd_per_million: 0.30, output_usd_per_million: 1.20 },
    },
    {
      id: "pr-nova",
      name: "Pro Router Nova",
      object: "model",
      created: 1710000000,
      owned_by: "prorouter",
      tier: "Chat",
      description: "Your general-purpose premium model for detailed answers, writing, reasoning, and everyday development assistance.",
      pricing: { input_usd_per_million: 0.50, output_usd_per_million: 2.00 },
    },
    {
      id: "pr-aura",
      name: "Pro Router Aura",
      object: "model",
      created: 1710000000,
      owned_by: "prorouter",
      tier: "Writing",
      description: "Positioned for more advanced reasoning, long-form content, complex instructions, and coding assistance, depending on the configured backend.",
      pricing: { input_usd_per_million: 0.75, output_usd_per_million: 3.00 },
    },
    {
      id: "pr-zenith",
      name: "Pro Router Zenith",
      object: "model",
      created: 1710000000,
      owned_by: "prorouter",
      tier: "Flagship",
      description: "Your flagship tier for the most demanding text tasks, complex analysis, and coding workflows supported by your chosen backend.",
      pricing: { input_usd_per_million: 1.00, output_usd_per_million: 4.00 },
    },
  ];

  app.get("/v1/models", async (_request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    return {
      object: "list",
      data: PRO_MODELS_DATA,
    };
  });

  app.get("/v1/models/:id", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    const { id } = request.params as { id: string };
    const clean = id.toLowerCase().trim();
    const found = PRO_MODELS_DATA.find((m) => m.id === clean || clean.includes(m.id.replace("pr-", ""))) || PRO_MODELS_DATA[2];
    return reply.send({
      ...found,
      id: clean || found.id,
    });
  });

  // ── Chat completions (§13) ──────────────────────────────────────────
  app.post("/v1/chat/completions", async (request, reply) => {
    const requestId = (request as { requestId?: string }).requestId || newRequestId();
    reply.header("x-request-id", requestId);
    const startedAt = Date.now();

    const auth = await authenticateRequest(request);
    enforceRateLimits(request, auth);

    const body = bodySchema.parse(request.body);
    const messages = body.messages as unknown as ChatMessage[];

    // Resolve model (direct, provider-forced, or uno/auto)
    const resolved = await resolveModelInput(body.model);
    let slug = resolved.slug;
    if (resolved.auto) {
      const hints = extractHints(messages);
      hints.preferFree = true;
      const autoSlug = await resolveAutoModel(hints);
      if (!autoSlug) throw new ApiError("provider_unavailable", "No models are currently available for auto routing.");
      slug = autoSlug;
    }
    const ctx = await loadModelContext(slug);
    if (!ctx) throw new ApiError("model_not_found", `Model '${body.model}' not found.`);
    if (ctx.model.status === "coming_soon") throw new ApiError("provider_unavailable", `'${ctx.model.name}' is coming soon and not yet available.`);
    if (ctx.model.status !== "active") throw new ApiError("model_not_found", `Model '${slug}' is not available.`);

    // Pricing status lifecycle: models with pricing_pending block customer usage
    const pricingStatus = ctx.pricingStatus || "approved";
    if (pricingStatus === "pricing_pending") {
      if (auth.user.role !== "admin") {
        throw new ApiError(
          "pricing_pending",
          `Pricing pending administrative review for model '${ctx.model.name}'. Customer usage is locked until admin approval.`
        );
      }
    }

    const effectivePricing = resolveEffectivePricing(ctx.model, ctx.pricing, ctx.tier, await getUsdToInrRate());

    // GPT Astra requires an active entitlement (§49)
    const requiresAstra = slug === "uno-gpt-astra" || (ctx.model.metadata as { requiresAstra?: boolean })?.requiresAstra === true;
    if (requiresAstra && (await getFlag("astra_promotion", true))) {
      const astra = await getActiveAstra(auth.user.id);
      if (!astra) throw new ApiError("astra_entitlement_required", "GPT Astra requires an active 7-day access entitlement. Redeem an Astra code to continue.");
    }

    // API key model restrictions (§15)
    if (auth.apiKey?.allowedModels?.length && !auth.apiKey.allowedModels.includes(slug)) {
      throw new ApiError("forbidden", "This API key is not permitted to use the requested model.");
    }

    const candidates = await hydrateCandidates(ctx.model.id, resolved.forcedProvider);
    if (candidates.length === 0) {
      throw new ApiError("provider_unavailable", `No providers are configured for '${ctx.model.name}'.`);
    }

    const plan = await getUserPlan(auth.user.id);
    const fallbackEnabled = await getFlag("provider_fallback", true);

    // Strict 48-Hour Promotional Policy: ONLY deepseek-v4.1-flash & qwen3.8-27b can ever be free
    const canonicalPromoId = resolvePromotionalCanonicalId(slug);
    let isPromotionalActive = false;
    let activePromoActivationId: string | null = null;

    if (canonicalPromoId !== null) {
      const db = await getDb();
      const promoRows = await db
        .select()
        .from(promotionalActivations)
        .where(
          and(
            eq(promotionalActivations.userId, auth.user.id),
            eq(promotionalActivations.campaignSlug, "launch-48h-special"),
            eq(promotionalActivations.active, true),
            gt(promotionalActivations.expiresAt, new Date())
          )
        );
      const promo = promoRows[0];
      // Promotional quota limit: 50 requests/day and 500,000 tokens/day per user
      if (promo && promo.requestCount < 50 && promo.tokensConsumed < 500_000) {
        isPromotionalActive = true;
        activePromoActivationId = promo.id;
      }
    }

    // Free if marked isFree in catalog OR eligible promotional model with active promo
    const isFree = Boolean(ctx.model.isFree || isPromotionalActive);
    const stream = body.stream === true;
    let queueWaitMs = 0;
    let acquired = false;
    let acquiredKey = "";
    let slotServiceStart = 0;
    let sseStarted = false;

    let hasReservation = false;
    // Free model: quota + queue (§21, §22)
    if (isFree) {
      const modelLimitsRow = ctx.limits;
      const quota = await consumeFreeQuota(auth.user.id, {
        perMinute: plan.freeRpm,
        perHour: (modelLimitsRow?.perHour ?? 30) * plan.freeRpm,
        perDay: (modelLimitsRow?.perDay ?? 200) * plan.freeRpm,
      });
      if (!quota.allowed) {
        throw new ApiError("free_quota_exceeded", `Free ${quota.window} quota reached (${quota.limit}). Upgrade your plan or try again later.`, { retryAfter: quota.retryAfterSec });
      }
    } else {
      // Paid: affordability pre-check and atomic reservation (§54)
      const inputTokens = countMessageTokens(messages);
      const maxOut = Math.min(body.max_tokens ?? body.max_completion_tokens ?? 4096, ctx.model.maxOutputTokens);
      const feePercent = await getNumber("PLATFORM_FEE_PERCENT", 0);
      const estimated = requestCost({
        inputTokens,
        outputTokens: maxOut,
        inputPricePerMillion: effectivePricing.pricing.inputPerMillion,
        outputPricePerMillion: effectivePricing.pricing.outputPerMillion,
        platformFeePercent: feePercent,
      });
      await reserveBalance({ userId: auth.user.id, requestId, amountPaise: estimated });
      hasReservation = true;
    }

    eventHub.publish(auth.user.id, "usage.request.started", {
      requestId,
      model: slug,
      stream,
    });

    // Routing (§11)
    const decision = routeRequest(candidates, {
      planSlug: plan.slug,
      fallbackEnabled,
      preferFree: isFree,
    });
    if (!decision) {
      throw new ApiError("provider_unavailable", `All providers for '${ctx.model.name}' are currently unhealthy. Please retry shortly.`);
    }

    const adapterParams = {
      model: decision.primary.upstreamModelId,
      // Pass client messages verbatim. Never inject synthetic personas, behavioral directives,
      // or identity instructions that conflict with coding agents or user prompts.
      messages: messages as unknown as ChatMessage[],
      stream,
      temperature: body.temperature,
      topP: body.top_p,
      maxTokens: body.max_tokens ?? body.max_completion_tokens,
      stop: Array.isArray(body.stop) ? body.stop : body.stop ? [body.stop] : undefined,
      tools: body.tools,
      toolChoice: body.tool_choice,
      parallelToolCalls: (body as any).parallel_tool_calls,
      responseFormat: body.response_format,
      seed: body.seed,
      raw: body as never,
    };

    // Insert the request record up-front so attempts can reference it.
    const db = await getDb();
    await db.insert(requests).values({
      id: requestId,
      userId: auth.user.id,
      apiKeyId: auth.apiKey?.id ?? null,
      modelId: ctx.model.id,
      providerId: decision.primary.providerId,
      status: "queued",
      route: resolved.auto ? "auto" : resolved.forcedProvider ? "direct" : "direct",
      streaming: stream,
      isFree,
      usageSource: "none",
      ip: request.ip,
    });

    const finalize = async (params: { usage: Usage; usageSource?: UsageSource; providerId: string; providerSlug: string; ttftMs: number | null; errorCode?: string; errorMessage?: string; httpStatus?: number; status?: "success" | "error" }) => {
      const usage = params.usage;
      const usageSource = params.usageSource ?? "none";
      const billEstimated = usageSource === "estimated" ? await getFlag("BILL_ESTIMATED_USAGE", false) : false;
      let cost = 0;
      if (!isFree && !params.errorCode && (usage.prompt_tokens > 0 || usage.completion_tokens > 0) && (usageSource === "upstream" || billEstimated)) {
        const feePercent = await getNumber("PLATFORM_FEE_PERCENT", 0);
        cost = requestCost({
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          inputPricePerMillion: effectivePricing.pricing.inputPerMillion,
          outputPricePerMillion: effectivePricing.pricing.outputPerMillion,
          platformFeePercent: feePercent,
        });
        if (hasReservation) {
          const settlement = await settleReservation({
            userId: auth.user.id,
            requestId,
            actualAmountPaise: cost,
            reference: requestId,
            metadata: { model: slug, provider: params.providerSlug },
          });
          cost = settlement.deductedPaise;
          hasReservation = false;
        } else {
          const debit = await debitWallet({ userId: auth.user.id, amountPaise: cost, reference: requestId, idempotencyKey: `usage:${requestId}`, metadata: { model: slug, provider: params.providerSlug } });
          cost = debit.deductedPaise;
        }
      } else if (hasReservation) {
        await releaseReservation({ userId: auth.user.id, requestId }).catch(() => { });
        hasReservation = false;
      }

      if (activePromoActivationId && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
        const totalToks = usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens);
        await db
          .update(promotionalActivations)
          .set({
            requestCount: sql`${promotionalActivations.requestCount} + 1`,
            tokensConsumed: sql`${promotionalActivations.tokensConsumed} + ${totalToks}`,
          })
          .where(eq(promotionalActivations.id, activePromoActivationId))
          .catch(() => { });
      }

      await db.update(requests).set({
        status: params.status ?? (params.errorCode ? "error" : "success"),
        httpStatus: params.httpStatus ?? (params.errorCode ? 502 : 200),
        latencyMs: Date.now() - startedAt,
        ttftMs: params.ttftMs,
        queueWaitMs,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        costPaise: cost,
        usageSource,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        providerId: params.providerId,
      }).where(eq(requests.id, requestId));
      if (auth.apiKey) {
        await db.update(apiKeys).set({ requestCount: sql`${apiKeys.requestCount} + 1`, spendPaise: sql`${apiKeys.spendPaise} + ${cost}`, lastUsedAt: new Date() }).where(eq(apiKeys.id, auth.apiKey.id));
      }

      if (params.errorCode) {
        eventHub.publish(auth.user.id, "usage.request.failed", {
          requestId,
          model: slug,
          error: params.errorMessage || params.errorCode,
        });
      } else {
        eventHub.publish(auth.user.id, "usage.request.completed", {
          requestId,
          model: slug,
          totalTokens: usage.total_tokens,
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          costPaise: cost,
          latencyMs: Date.now() - startedAt,
          ttftMs: params.ttftMs,
        });
      }

      return cost;
    };

    try {
      if (!stream) {
        // Queue for free models
        if (isFree) {
          const concurrency = ctx.limits?.concurrency ?? plan.concurrency;
          const slot = await acquireSlot(slug, concurrency, plan.queuePriority);
          acquired = true;
          acquiredKey = slug;
          queueWaitMs = slot.queueWaitMs;
          slotServiceStart = Date.now();
        }
        const result = await executeChat(decision, adapterParams, request.signal);
        for (const [i, a] of result.attempts.entries()) {
          await db.insert(requestAttempts).values({ requestId, providerId: a.providerId, attempt: i + 1, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error });
        }
        const cost = await finalize({ usage: result.usage, usageSource: result.usageSource, providerId: result.providerId, providerSlug: result.providerSlug, ttftMs: null });
        reply.header("x-prorouter-usage-source", result.usageSource);
        const created = Math.floor(Date.now() / 1000);
        const hasToolCalls = result.toolCalls.length > 0;
        // Normalize finish_reason: if upstream said "stop" but tool calls present, correct it
        const normalizedFinishReason = (result.finishReason === "stop" && hasToolCalls)
          ? "tool_calls"
          : result.finishReason;
        const sanitizedContent = (() => {
          const profile = ModelProfileRegistry.get(slug);
          const base = sanitizeModelOutput(result.content, ctx.model.name);
          return profile ? ModelBehaviorEngine.sanitizeOutput(base, profile) : base;
        })();
        return reply.send({
          id: requestId,
          object: "chat.completion",
          created,
          model: body.model || slug,
          choices: [{
            index: 0, message: {
              role: "assistant",
              // When tool calls are present and content is empty, set content to null
              // (not "") to match OpenAI spec — agents check for null to detect pure tool responses
              content: hasToolCalls && !sanitizedContent ? null : sanitizedContent,
              tool_calls: hasToolCalls ? result.toolCalls : undefined,
            }, finish_reason: normalizedFinishReason
          }],
          usage: result.usage,
          uno: {
            request_id: requestId,
            provider: result.providerSlug,
            route: decision.trace,
            queue_wait_ms: queueWaitMs,
            cost_paise: cost,
            is_free: isFree,
            usage_source: result.usageSource,
          },
        });
      }

      // ── SSE streaming (§14) ─────────────────────────────────────────
      reply.hijack();
      sseStarted = true;
      const res = reply.raw;
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-request-id": requestId,
        "x-accel-buffering": "no",
      });
      const write = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
      const chunkId = `chatcmpl-${requestId.slice(4)}`;
      const created = Math.floor(Date.now() / 1000);
      const oaiChunk = (delta: Record<string, unknown>, finish: string | null = null) => ({
        id: chunkId, object: "chat.completion.chunk", created, model: body.model || slug,
        choices: [{ index: 0, delta, finish_reason: finish }],
      });

      // Real queue status events (§59) — positions come from actual queue state.
      if (isFree) {
        const status = probeQueue(slug, plan.queuePriority);
        write({ uno_queue: { model: slug, ...status, message: status.ready ? "Ready — instant response" : "Provider capacity limited" } });
        const concurrency = ctx.limits?.concurrency ?? plan.concurrency;
        const slot = await acquireSlot(slug, concurrency, plan.queuePriority, (s: QueueStatus) => {
          write({ uno_queue: { model: slug, ...s, message: s.ready ? "Ready — instant response" : "Provider capacity limited" } });
        });
        acquired = true;
        acquiredKey = slug;
        queueWaitMs = slot.queueWaitMs;
        slotServiceStart = Date.now();
        write({ uno_queue: { model: slug, position: 0, ready: true, estimatedWaitMs: 0, waitedMs: queueWaitMs, message: "Ready — starting response" } });
      }

      // ⚠️ Do NOT emit content:"" here — it locks coding-agent parsers (Cline, Claude Code, Kilo Code)
      // into text-only mode before any tool_calls arrive. Only emit role announcement.
      write(oaiChunk({ role: "assistant" }));
      let usage: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      let usageSource: UsageSource = "none";
      let ttftMs: number | null = null;
      let contentSoFar = "";
      let finishReason = "stop";
      let hasSeenToolCalls = false;
      let providerSlug = decision.primary.providerSlug;
      let outcomeProviderId: string | null = null;

      try {
        const outcome = await (async () => {
          const iterator = streamChat(decision, adapterParams, undefined, request.signal);
          while (true) {
            const step = await iterator.next();
            if (step.done) return step.value;
            const ev = step.value;
            if (ev.type === "start") {
              write({ uno_start: { provider: decision.primary.providerSlug } });
            } else if (ev.type === "delta") {
              if (ttftMs === null) ttftMs = Date.now() - startedAt;
              const profile = ModelProfileRegistry.get(slug);
              let sanitizedText = sanitizeModelOutput(ev.text, ctx.model.name);
              if (profile) sanitizedText = ModelBehaviorEngine.sanitizeOutput(sanitizedText, profile);
              contentSoFar += sanitizedText;
              write(oaiChunk({ content: sanitizedText }));
            } else if (ev.type === "reasoning_delta") {
              if (ctx.caps?.reasoning) {
                const sanitizedReasoning = sanitizeModelOutput(ev.text, ctx.model.name);
                write({ id: chunkId, object: "chat.completion.chunk", created, model: body.model || slug, choices: [], uno_reasoning: sanitizedReasoning });
              }
            } else if (ev.type === "tool_call_delta") {
              if (ttftMs === null) ttftMs = Date.now() - startedAt;
              // Build tool_call delta preserving exact OpenAI SSE schema.
              // Only include fields that are actually present so agents can
              // distinguish name-initialization chunks from argument chunks.
              const tcFunc: Record<string, string> = {};
              if (ev.name !== undefined) tcFunc.name = ev.name;
              if (ev.arguments !== undefined) tcFunc.arguments = ev.arguments;
              const tcEntry: Record<string, unknown> = { index: ev.index, type: "function", function: tcFunc };
              if (ev.id !== undefined) tcEntry.id = ev.id;
              write(oaiChunk({ tool_calls: [tcEntry] }));
              hasSeenToolCalls = true;
            } else if (ev.type === "usage") {
              usage = ev.usage;
              usageSource = ev.usageSource;
            } else if (ev.type === "done") {
              // Normalize finish_reason: if the upstream model said "stop" but
              // tool call deltas were streamed, the actual reason is "tool_calls".
              finishReason = (ev.finishReason === "stop" && hasSeenToolCalls)
                ? "tool_calls"
                : ev.finishReason;
            }
          }
        })();
        providerSlug = outcome.providerSlug;
        outcomeProviderId = outcome.providerId;
        usage = outcome.usage;
        usageSource = outcome.usageSource;
        // Final normalize: upstream may report "stop" even after tool calls
        finishReason = (outcome.finishReason === "stop" && hasSeenToolCalls)
          ? "tool_calls"
          : outcome.finishReason;
        for (const [i, a] of outcome.attempts.entries()) {
          await db.insert(requestAttempts).values({ requestId, providerId: a.providerId, attempt: i + 1, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error });
        }
      } catch (err) {
        const aborted = request.signal.aborted;
        const message = aborted
          ? "Client disconnected"
          : err instanceof ApiError
            ? err.message
            : "Upstream provider error.";
        if (!aborted) {
          write({ error: { code: "provider_error", message, request_id: requestId } });
        }
        await finalize({ usage, usageSource, providerId: decision.primary.providerId, providerSlug, ttftMs, errorCode: aborted ? "client_aborted" : err instanceof ApiError ? err.code : "provider_error", errorMessage: message, httpStatus: aborted ? 499 : 502, status: "error" }).catch(() => undefined);
        res.end();
        return;
      }

      write(oaiChunk({}, finishReason));
      if (usage.total_tokens === 0) {
        usage = {
          prompt_tokens: countMessageTokens(messages),
          completion_tokens: estimateTokens(contentSoFar),
          total_tokens: countMessageTokens(messages) + estimateTokens(contentSoFar),
        };
        usageSource = "estimated";
      }
      const cost = await finalize({ usage, usageSource, providerId: outcomeProviderId ?? decision.primary.providerId, providerSlug, ttftMs });
      write({ id: chunkId, object: "chat.completion.chunk", created, model: body.model || slug, choices: [], usage, uno: { request_id: requestId, provider: providerSlug, cost_paise: cost, is_free: isFree, queue_wait_ms: queueWaitMs, route: decision.trace, usage_source: usageSource } });
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    } catch (err) {
      const aborted = request.signal.aborted;
      const apiErr = err instanceof ApiError
        ? err
        : new ApiError("provider_error", aborted ? "Client disconnected" : "Upstream provider error.");
      if (sseStarted) {
        try {
          reply.raw.write(`data: ${JSON.stringify({ error: apiErr.toBody(requestId).error })}\n\n`);
          reply.raw.write("data: [DONE]\n\n");
          reply.raw.end();
        } catch {
          /* connection already gone */
        }
        await finalize({ usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, providerId: decision.primary.providerId, providerSlug: decision.primary.providerSlug, ttftMs: null, errorCode: apiErr.code, errorMessage: apiErr.message, httpStatus: apiErr.status, status: "error" }).catch(() => undefined);
        return;
      }
      await finalize({ usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, providerId: decision.primary.providerId, providerSlug: decision.primary.providerSlug, ttftMs: null, errorCode: apiErr.code, errorMessage: apiErr.message, httpStatus: apiErr.status, status: "error" }).catch(() => undefined);
      throw apiErr;
    } finally {
      if (hasReservation) {
        await releaseReservation({ userId: auth.user.id, requestId }).catch(() => { });
      }
      if (acquired) releaseSlot(acquiredKey, slotServiceStart ? Date.now() - slotServiceStart : 0);
    }
  });

  // ── Bare /chat/completions (without /v1 prefix) for Claude Code and Cursor compatibility ──
  app.post("/chat/completions", async (request, reply) => {
    return app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: request.headers as Record<string, string>,
      payload: request.body as Record<string, unknown>,
    }).then((res) => {
      reply.code(res.statusCode);
      for (const [k, v] of Object.entries(res.headers)) {
        if (v !== undefined) reply.header(k, v as string);
      }
      return reply.send(res.rawPayload);
    });
  });
}

