import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { desc, eq, sql } from "drizzle-orm";
import { apiKeys, getDb, modelProviders, models, plans, providers, requestAttempts, requests, subscriptions } from "@uno/database";
import { ApiError, requestCost, env, type ChatMessage, type Usage } from "@uno/shared";
import { estimateTokens } from "@uno/providers";
import { routeRequest } from "@uno/routing";
import { getActiveAstra, requireUser, resolveApiKey, resolveSessionUser, type AuthedUser } from "../lib/auth.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { consumeFreeQuota } from "../lib/freequota.js";
import { acquireSlot, probeQueue, releaseSlot, type QueueStatus } from "../lib/queue.js";
import { assertAffordable, debitWallet } from "../lib/wallet.js";
import { extractHints, executeChat, hydrateCandidates, loadModelContext, resolveAutoModel, resolveModelInput, streamChat } from "../lib/pipeline.js";
import { getFlag, getNumber } from "../lib/settings.js";
import { randomBytes } from "node:crypto";

const bodySchema = z.looseObject({
  model: z.string().min(1),
  messages: z.array(z.looseObject({ role: z.string() })).min(1).max(500),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  max_completion_tokens: z.number().int().positive().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.unknown().optional(),
  response_format: z.unknown().optional(),
  seed: z.number().optional(),
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
  // ── OpenAI-compatible model listing ─────────────────────────────────
  app.get("/v1/models", async (request) => {
    await authenticate(request, { optional: false });
    const db = await getDb();
    const rows = await db.select().from(models).where(eq(models.status, "active"));
    return {
      object: "list",
      data: rows.map((m) => ({ id: m.slug, object: "model", created: Math.floor(m.createdAt.getTime() / 1000), owned_by: "uno" })),
    };
  });

  app.get("/v1/models/:id", async (request, reply) => {
    await authenticate(request, { optional: false });
    const { id } = request.params as { id: string };
    const db = await getDb();
    const slug = id.startsWith("uno/") ? id.slice(4) : id;
    const rows = await db.select().from(models).where(eq(models.slug, slug));
    const m = rows[0];
    if (!m) throw new ApiError("model_not_found", `Model '${id}' not found.`);
    return reply.send({ id: m.slug, object: "model", created: Math.floor(m.createdAt.getTime() / 1000), owned_by: "prorouter" });
  });

  // ── Chat completions (§13) ──────────────────────────────────────────
  app.post("/v1/chat/completions", async (request, reply) => {
    const requestId = (request as { requestId?: string }).requestId || newRequestId();
    reply.header("x-request-id", requestId);
    const startedAt = Date.now();

    const auth = await authenticate(request, { optional: false });
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
    const isFree = ctx.model.isFree;
    const stream = body.stream === true;
    let queueWaitMs = 0;
    let acquired = false;
    let acquiredKey = "";
    let slotServiceStart = 0;
    let sseStarted = false;

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
      // Paid: affordability pre-check BEFORE any provider call (§54)
      const inputTokens = countMessageTokens(messages);
      const maxOut = Math.min(body.max_tokens ?? body.max_completion_tokens ?? 4096, ctx.model.maxOutputTokens);
      const feePercent = await getNumber("PLATFORM_FEE_PERCENT", 0);
      const estimated = requestCost({
        inputTokens,
        outputTokens: maxOut,
        inputPricePerMillion: ctx.pricing?.inputPerMillion ?? 0,
        outputPricePerMillion: ctx.pricing?.outputPerMillion ?? 0,
        platformFeePercent: feePercent,
      });
      await assertAffordable(auth.user.id, estimated);
    }

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
      messages,
      stream,
      temperature: body.temperature,
      topP: body.top_p,
      maxTokens: body.max_tokens ?? body.max_completion_tokens,
      stop: Array.isArray(body.stop) ? body.stop : body.stop ? [body.stop] : undefined,
      tools: body.tools,
      toolChoice: body.tool_choice,
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
      ip: request.ip,
    });

    const finalize = async (params: { usage: Usage; providerId: string; providerSlug: string; ttftMs: number | null; errorCode?: string; errorMessage?: string; httpStatus?: number; status?: "success" | "error" }) => {
      const usage = params.usage;
      let cost = 0;
      if (!isFree && !params.errorCode && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
        const feePercent = await getNumber("PLATFORM_FEE_PERCENT", 0);
        cost = requestCost({
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          inputPricePerMillion: ctx.pricing?.inputPerMillion ?? 0,
          outputPricePerMillion: ctx.pricing?.outputPerMillion ?? 0,
          platformFeePercent: feePercent,
        });
        const debit = await debitWallet({ userId: auth.user.id, amountPaise: cost, reference: requestId, metadata: { model: slug, provider: params.providerSlug } });
        cost = debit.deductedPaise;
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
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        providerId: params.providerId,
      }).where(eq(requests.id, requestId));
      if (auth.apiKey) {
        await db.update(apiKeys).set({ requestCount: sql`${apiKeys.requestCount} + 1`, spendPaise: sql`${apiKeys.spendPaise} + ${cost}`, lastUsedAt: new Date() }).where(eq(apiKeys.id, auth.apiKey.id));
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
        const result = await executeChat(decision, adapterParams);
        for (const a of result.attempts) {
          await db.insert(requestAttempts).values({ requestId, providerId: null, attempt: result.attempts.indexOf(a) + 1, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error });
        }
        const cost = await finalize({ usage: result.usage, providerId: decision.primary.providerId, providerSlug: result.providerSlug, ttftMs: null });
        const created = Math.floor(Date.now() / 1000);
        return reply.send({
          id: requestId,
          object: "chat.completion",
          created,
          model: slug,
          choices: [{ index: 0, message: { role: "assistant", content: result.content, tool_calls: result.toolCalls.length ? result.toolCalls : undefined }, finish_reason: result.finishReason }],
          usage: result.usage,
          uno: {
            request_id: requestId,
            provider: result.providerSlug,
            route: decision.trace,
            queue_wait_ms: queueWaitMs,
            cost_paise: cost,
            is_free: isFree,
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
        id: chunkId, object: "chat.completion.chunk", created, model: slug,
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

      write(oaiChunk({ role: "assistant", content: "" }));
      let usage: Usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      let ttftMs: number | null = null;
      let contentSoFar = "";
      let finishReason = "stop";
      let providerSlug = decision.primary.providerSlug;

      try {
        const outcome = await (async () => {
          const iterator = streamChat(decision, adapterParams);
          while (true) {
            const step = await iterator.next();
            if (step.done) return step.value;
            const ev = step.value;
            if (ev.type === "start") {
              write({ uno_start: { provider: decision.primary.providerSlug } });
            } else if (ev.type === "delta") {
              if (ttftMs === null) ttftMs = Date.now() - startedAt;
              contentSoFar += ev.text;
              write(oaiChunk({ content: ev.text }));
            } else if (ev.type === "reasoning_delta") {
              write({ id: chunkId, object: "chat.completion.chunk", created, model: slug, choices: [], uno_reasoning: ev.text });
            } else if (ev.type === "tool_call_delta") {
              write(oaiChunk({ tool_calls: [{ index: ev.index, id: ev.id, type: "function", function: { name: ev.name, arguments: ev.arguments ?? "" } }] }));
            } else if (ev.type === "usage") {
              usage = ev.usage;
            } else if (ev.type === "done") {
              finishReason = ev.finishReason;
            }
          }
        })();
        providerSlug = outcome.providerSlug;
        usage = outcome.usage;
        finishReason = outcome.finishReason;
        for (const a of outcome.attempts) {
          await db.insert(requestAttempts).values({ requestId, attempt: outcome.attempts.indexOf(a) + 1, status: a.status, httpStatus: a.httpStatus, latencyMs: a.latencyMs, error: a.error });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Provider error";
        write({ error: { code: "provider_error", message, request_id: requestId } });
        await finalize({ usage, providerId: decision.primary.providerId, providerSlug, ttftMs, errorCode: err instanceof ApiError ? err.code : "provider_error", errorMessage: message, httpStatus: 502, status: "error" }).catch(() => undefined);
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
      }
      const cost = await finalize({ usage, providerId: decision.primary.providerId, providerSlug, ttftMs });
      write({ id: chunkId, object: "chat.completion.chunk", created, model: slug, choices: [], usage, uno: { request_id: requestId, provider: providerSlug, cost_paise: cost, is_free: isFree, queue_wait_ms: queueWaitMs, route: decision.trace } });
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : err instanceof Error && (err as { code?: string }).code === "rate_limited" ? new ApiError("provider_error", err.message) : new ApiError("provider_error", (err as Error)?.message ?? "Provider error");
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
      if (acquired) releaseSlot(acquiredKey, slotServiceStart ? Date.now() - slotServiceStart : 0);
    }
  });
}

interface AuthContext {
  user: AuthedUser;
  apiKey: (typeof apiKeys.$inferSelect) | null;
}

async function authenticate(request: FastifyRequest, opts: { optional: boolean }): Promise<AuthContext> {
  const fromKey = await resolveApiKey(request).catch((e) => { throw e; });
  if (fromKey) return { user: fromKey.user, apiKey: fromKey.apiKey };
  const session = await resolveSessionUser(request);
  if (session) return { user: session, apiKey: null };
  if (opts.optional) throw new ApiError("unauthenticated", "Authentication required.");
  const hasBearer = !!request.headers.authorization;
  throw new ApiError(hasBearer ? "invalid_api_key" : "unauthenticated", hasBearer ? "Invalid API key provided." : "Authentication required. Use an API key or sign in.");
}

function enforceRateLimits(request: FastifyRequest, auth: AuthContext) {
  const ip = request.ip || "unknown";
  const checks = [
    { key: `ip:${ip}`, limit: 120, window: 60 },
    { key: `user:${auth.user.id}`, limit: 60, window: 60 },
  ];
  if (auth.apiKey) checks.push({ key: `key:${auth.apiKey.id}`, limit: 60, window: 60 });
  for (const c of checks) {
    const r = checkRateLimit(c.key, c.limit, c.window);
    if (!r.allowed) {
      throw new ApiError("rate_limit_exceeded", `Rate limit exceeded. Try again in ${r.retryAfterSec}s.`, { retryAfter: r.retryAfterSec });
    }
  }
}