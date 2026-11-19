import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  ApiError,
  requestCost,
  type ChatMessage,
  type Usage,
  type UsageSource,
  sanitizeModelOutput,
  resolvePromotionalCanonicalId,
} from "@pro/shared";
import { authenticateRequest, enforceRateLimits } from "../lib/request-auth.js";
import {
  loadModelContext,
  hydrateCandidates,
  executeChat,
  streamChat,
  resolveModelInput,
  type RouteCandidate,
} from "../lib/pipeline.js";
import {
  routeRequest,
  probeQueue,
  acquireSlot,
  type QueueStatus,
  ModelProfileRegistry,
  ModelBehaviorEngine,
} from "@pro/routing";
import { consumeFreeQuota } from "../lib/freequota.js";
import {
  reserveBalance,
  settleReservation,
  releaseReservation,
  debitWallet,
} from "../lib/wallet.js";
import { getDb } from "@pro/database";
import { requests, requestAttempts, apiKeys, promotionalActivations, plans, subscriptions } from "@pro/database";
import { eq, sql, and, gt } from "drizzle-orm";
import { eventHub } from "../lib/events.js";
import { getFlag, getNumber } from "../lib/settings.js";
import { getUsdToInrRate, resolveEffectivePricing } from "../lib/pricing.js";
import { randomBytes } from "node:crypto";

const anthropicBodySchema = z.looseObject({
  model: z.string().min(1),
  messages: z.array(z.unknown()).min(1).max(500),
  system: z.union([z.string(), z.array(z.unknown())]).optional(),
  max_tokens: z.number().int().positive().optional(),
  stream: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stop_sequences: z.array(z.string()).optional(),
  tools: z.array(z.unknown()).optional(),
  tool_choice: z.unknown().optional(),
});

function newRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}

function countMessageTokens(messages: ChatMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    if (typeof m.content === "string") chars += m.content.length;
    else if (Array.isArray(m.content)) {
      for (const p of m.content as Array<{ text?: string }>) {
        if (p.text) chars += p.text.length;
      }
    }
    chars += 8;
  }
  return Math.max(1, Math.ceil(chars / 4));
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function convertAnthropicToolsToOpenAI(tools?: unknown[]): unknown[] | undefined {
  if (!Array.isArray(tools) || tools.length === 0) return undefined;
  return tools.map((t: any) => {
    if (t?.type === "function" && t?.function) return t;
    return {
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema || { type: "object", properties: {} },
      },
    };
  });
}

export function convertAnthropicToolChoiceToOpenAI(choice?: unknown): unknown {
  if (!choice) return undefined;
  if (typeof choice === "string") return choice;
  const c = choice as { type?: string; name?: string };
  if (c.type === "auto") return "auto";
  if (c.type === "any") return "required";
  if (c.type === "tool" && c.name) {
    return { type: "function", function: { name: c.name } };
  }
  return choice;
}

export function convertAnthropicMessagesToCanonical(
  messages: unknown[],
  system?: unknown
): ChatMessage[] {
  const result: ChatMessage[] = [];

  let systemText = "";
  if (typeof system === "string") {
    systemText = system;
  } else if (Array.isArray(system)) {
    systemText = system
      .map((s: any) => (typeof s === "string" ? s : s?.text || ""))
      .filter(Boolean)
      .join("\n");
  }
  if (systemText.trim()) {
    result.push({ role: "system", content: systemText.trim() });
  }

  for (const m of messages as any[]) {
    const rawRole = m?.role === "assistant" ? "assistant" : "user";
    const rawContent = m?.content;

    if (typeof rawContent === "string") {
      result.push({ role: rawRole, content: rawContent });
      continue;
    }

    if (Array.isArray(rawContent)) {
      let accumulatedText = "";
      const toolCalls: any[] = [];

      for (const block of rawContent) {
        if (!block || typeof block !== "object") continue;
        if (block.type === "text" && typeof block.text === "string") {
          accumulatedText += (accumulatedText ? "\n" : "") + block.text;
        } else if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id || `toolu_${randomBytes(8).toString("hex")}`,
            type: "function",
            function: {
              name: block.name,
              arguments: typeof block.input === "string" ? block.input : JSON.stringify(block.input || {}),
            },
          });
        } else if (block.type === "tool_result") {
          const content = typeof block.content === "string"
            ? block.content
            : Array.isArray(block.content)
              ? block.content.map((c: any) => (typeof c === "string" ? c : c?.text || "")).join("\n")
              : JSON.stringify(block.content || "");
          result.push({
            role: "tool",
            tool_call_id: block.tool_use_id,
            content,
          });
        }
      }

      if (rawRole === "assistant") {
        if (toolCalls.length > 0 || accumulatedText) {
          result.push({
            role: "assistant",
            content: accumulatedText || null,
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          } as any);
        }
      } else if (accumulatedText) {
        result.push({ role: "user", content: accumulatedText });
      }
    }
  }

  return result;
}

export const messagesRoutes: FastifyPluginAsync = async (app) => {
  // ── Anthropic Token Counting ─────────────────────────────────────────
  app.post("/v1/messages/count_tokens", async (request, reply) => {
    const auth = await authenticateRequest(request);
    enforceRateLimits(request, auth);
    const body = anthropicBodySchema.parse(request.body);
    const canonical = convertAnthropicMessagesToCanonical(body.messages, body.system);
    const inputTokens = countMessageTokens(canonical);
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send({ input_tokens: inputTokens });
  });

  // ── Anthropic Messages Endpoint ──────────────────────────────────────
  app.post("/v1/messages", async (request, reply) => {
    const requestId = (request as { requestId?: string }).requestId || newRequestId();
    reply.header("x-request-id", requestId);
    reply.header("Access-Control-Allow-Origin", "*");
    const startedAt = Date.now();

    const auth = await authenticateRequest(request);
    enforceRateLimits(request, auth);

    const body = anthropicBodySchema.parse(request.body);
    const canonicalMessages = convertAnthropicMessagesToCanonical(body.messages, body.system);
    const convertedTools = convertAnthropicToolsToOpenAI(body.tools);
    const convertedToolChoice = convertAnthropicToolChoiceToOpenAI(body.tool_choice);

    const resolved = await resolveModelInput(body.model);
    let slug = resolved.slug;
    if (resolved.auto) {
      slug = "claude-sonnet";
    }

    const ctx = await loadModelContext(slug);
    if (!ctx) throw new ApiError("model_not_found", `Model '${body.model}' not found.`);
    if (ctx.model.status !== "active") throw new ApiError("model_not_found", `Model '${slug}' is not available.`);

    const pricingStatus = ctx.pricingStatus || "approved";
    if (pricingStatus === "pricing_pending" && auth.user.role !== "admin") {
      throw new ApiError(
        "pricing_pending",
        `Pricing pending administrative review for model '${ctx.model.name}'.`
      );
    }

    const effectivePricing = resolveEffectivePricing(ctx.model, ctx.pricing, ctx.tier, await getUsdToInrRate());

    if (auth.apiKey?.allowedModels?.length && !auth.apiKey.allowedModels.includes(slug)) {
      throw new ApiError("forbidden", "This API key is not permitted to use the requested model.");
    }

    const requiresTools = Boolean(convertedTools && convertedTools.length > 0);
    const candidates = await hydrateCandidates(ctx.model.id, resolved.forcedProvider, {
      tools: requiresTools,
      reasoning: Boolean(ctx.caps?.reasoning),
    });

    if (candidates.length === 0) {
      if (requiresTools) {
        throw new ApiError("provider_unavailable", `No configured upstream provider for '${ctx.model.name}' is marked as supporting native tool calls.`);
      }
      throw new ApiError("provider_unavailable", `No providers are configured for '${ctx.model.name}'.`);
    }

    const db = await getDb();
    const rows = await db.select({ plan: plans }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.userId, auth.user.id));
    const sub = rows.find((r) => r.plan && r.plan.active);
    const plan = sub ? { slug: sub.plan.slug, freeRpm: sub.plan.freeRpm, concurrency: sub.plan.concurrency, queuePriority: sub.plan.queuePriority } : { slug: "free", freeRpm: 1, concurrency: 1, queuePriority: 5 };

    const fallbackEnabled = await getFlag("provider_fallback", true);
    const isFree = Boolean(ctx.model.isFree);
    const stream = body.stream === true;
    let hasReservation = false;

    if (!isFree) {
      const inputTokens = countMessageTokens(canonicalMessages);
      const maxOut = Math.min(body.max_tokens ?? 4096, ctx.model.maxOutputTokens);
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

    const decision = routeRequest(candidates, {
      planSlug: plan.slug,
      fallbackEnabled,
      preferFree: isFree,
      requiresTools,
    });
    if (!decision) {
      throw new ApiError("provider_unavailable", `All providers for '${ctx.model.name}' are currently unhealthy.`);
    }

    const adapterParams = {
      model: decision.primary.upstreamModelId,
      messages: canonicalMessages,
      stream,
      temperature: body.temperature,
      topP: body.top_p,
      maxTokens: body.max_tokens,
      stop: body.stop_sequences,
      tools: convertedTools,
      toolChoice: convertedToolChoice,
      raw: request.body as never,
    };

    await db.insert(requests).values({
      id: requestId,
      userId: auth.user.id,
      apiKeyId: auth.apiKey?.id ?? null,
      modelId: ctx.model.id,
      providerId: decision.primary.providerId,
      status: "queued",
      route: "direct",
      streaming: stream,
      isFree,
      usageSource: "none",
      ip: request.ip,
    });

    const finalize = async (params: { usage: Usage; usageSource?: UsageSource; providerId: string; providerSlug: string; ttftMs: number | null; errorCode?: string; errorMessage?: string }) => {
      const usage = params.usage;
      const usageSource = params.usageSource ?? "none";
      let cost = 0;
      if (!isFree && !params.errorCode && (usage.prompt_tokens > 0 || usage.completion_tokens > 0)) {
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
        await releaseReservation({ userId: auth.user.id, requestId }).catch(() => {});
        hasReservation = false;
      }

      await db.update(requests).set({
        status: params.errorCode ? "error" : "success",
        httpStatus: params.errorCode ? 502 : 200,
        latencyMs: Date.now() - startedAt,
        ttftMs: params.ttftMs,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        costPaise: cost,
        usageSource,
        errorCode: params.errorCode ?? null,
        errorMessage: params.errorMessage ?? null,
        providerId: params.providerId,
      }).where(eq(requests.id, requestId));

      return cost;
    };

    const msgId = `msg_${requestId.replace(/^req_/, "").slice(0, 20)}`;

    // ── Non-streaming Anthropic Response ───────────────────────────────
    if (!stream) {
      const result = await executeChat(decision, adapterParams, request.signal);
      await finalize({ usage: result.usage, usageSource: result.usageSource, providerId: result.providerId, providerSlug: result.providerSlug, ttftMs: null });

      const contentBlocks: any[] = [];
      const sanitizedContent = sanitizeModelOutput(result.content, ctx.model.name);
      if (sanitizedContent) {
        contentBlocks.push({ type: "text", text: sanitizedContent });
      }

      const rawToolCalls = (result.toolCalls || []) as any[];
      for (const tc of rawToolCalls) {
        let parsedInput = {};
        try {
          parsedInput = typeof tc.function?.arguments === "string" ? JSON.parse(tc.function.arguments) : (tc.function?.arguments || {});
        } catch {}
        contentBlocks.push({
          type: "tool_use",
          id: tc.id || `toolu_${randomBytes(8).toString("hex")}`,
          name: tc.function?.name || "tool",
          input: parsedInput,
        });
      }

      let stopReason = "end_turn";
      if (contentBlocks.some((b) => b.type === "tool_use") || result.finishReason === "tool_calls") {
        stopReason = "tool_use";
      } else if (result.finishReason === "length") {
        stopReason = "max_tokens";
      }

      return reply.send({
        id: msgId,
        type: "message",
        role: "assistant",
        model: body.model || slug,
        content: contentBlocks,
        stop_reason: stopReason,
        stop_sequence: null,
        usage: {
          input_tokens: result.usage.prompt_tokens,
          output_tokens: result.usage.completion_tokens,
        },
      });
    }

    // ── Streaming Anthropic SSE Response ───────────────────────────────
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-request-id": requestId,
      "access-control-allow-origin": "*",
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let usage: Usage = { prompt_tokens: countMessageTokens(canonicalMessages), completion_tokens: 0, total_tokens: 0 };
    let usageSource: UsageSource = "none";
    let ttftMs: number | null = null;
    let providerSlug = decision.primary.providerSlug;
    let outcomeProviderId: string | null = null;
    let textBlockStarted = false;
    let activeToolIndex = -1;
    let currentToolId = "";
    let currentToolName = "";
    let hasSeenTools = false;
    let stopReason = "end_turn";

    sendEvent("message_start", {
      type: "message_start",
      message: {
        id: msgId,
        type: "message",
        role: "assistant",
        model: body.model || slug,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: usage.prompt_tokens, output_tokens: 1 },
      },
    });

    try {
      const iterator = streamChat(decision, adapterParams, undefined, request.signal);
      while (true) {
        const step = await iterator.next();
        if (step.done) {
          const outcome = step.value;
          providerSlug = outcome.providerSlug;
          outcomeProviderId = outcome.providerId;
          if (outcome.usage) usage = outcome.usage;
          if (outcome.finishReason === "length") stopReason = "max_tokens";
          break;
        }

        const ev = step.value;
        if (ev.type === "delta" && ev.text) {
          if (ttftMs === null) ttftMs = Date.now() - startedAt;
          if (!textBlockStarted) {
            sendEvent("content_block_start", {
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            });
            textBlockStarted = true;
          }
          sendEvent("content_block_delta", {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: ev.text },
          });
        } else if (ev.type === "tool_call_delta") {
          if (ttftMs === null) ttftMs = Date.now() - startedAt;
          hasSeenTools = true;
          stopReason = "tool_use";

          if (textBlockStarted) {
            sendEvent("content_block_stop", { type: "content_block_stop", index: 0 });
            textBlockStarted = false;
          }

          if (ev.id || ev.name) {
            if (activeToolIndex >= 0) {
              sendEvent("content_block_stop", { type: "content_block_stop", index: activeToolIndex });
            }
            activeToolIndex = (ev.index ?? 0) + 1;
            currentToolId = ev.id || `toolu_${randomBytes(8).toString("hex")}`;
            currentToolName = ev.name || "tool";
            sendEvent("content_block_start", {
              type: "content_block_start",
              index: activeToolIndex,
              content_block: {
                type: "tool_use",
                id: currentToolId,
                name: currentToolName,
                input: {},
              },
            });
          }

          if (ev.arguments) {
            const blockIdx = activeToolIndex >= 0 ? activeToolIndex : (ev.index ?? 0) + 1;
            sendEvent("content_block_delta", {
              type: "content_block_delta",
              index: blockIdx,
              delta: {
                type: "input_json_delta",
                partial_json: ev.arguments,
              },
            });
          }
        } else if (ev.type === "usage") {
          usage = ev.usage;
          usageSource = ev.usageSource;
        }
      }

      if (textBlockStarted) {
        sendEvent("content_block_stop", { type: "content_block_stop", index: 0 });
      }
      if (activeToolIndex >= 0) {
        sendEvent("content_block_stop", { type: "content_block_stop", index: activeToolIndex });
      }

      if (hasSeenTools) {
        stopReason = "tool_use";
      }

      sendEvent("message_delta", {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: Math.max(1, usage.completion_tokens) },
      });
      sendEvent("message_stop", { type: "message_stop" });

      await finalize({ usage, usageSource, providerId: outcomeProviderId ?? decision.primary.providerId, providerSlug, ttftMs });
      res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upstream provider error.";
      sendEvent("error", { type: "error", error: { type: "api_error", message } });
      await finalize({ usage, usageSource, providerId: decision.primary.providerId, providerSlug, ttftMs, errorCode: "provider_error", errorMessage: message }).catch(() => {});
      res.end();
    }
  });
};
