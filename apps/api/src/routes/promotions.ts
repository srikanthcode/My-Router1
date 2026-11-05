import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { and, desc, eq, gt, lt, sql } from "drizzle-orm";
import { astraCampaigns, astraEntitlements, auditLogs, getDb, giftCodeRedemptions, giftCodes, notifications, promotionalActivations, users } from "@pro/database";
import { ApiError, formatMoney, randomCode, PROMO_DURATION_MS, isPromotionActive, PROMOTIONAL_48H_MODELS, resolvePromotionalCanonicalId, isStrictlyPromotionalEligible, checkPromotionStatus } from "@pro/shared";
import { requireUser } from "../lib/auth.js";
import { getFlag } from "../lib/settings.js";

async function getActiveCampaign() {
  const db = await getDb();
  const now = new Date();
  const rows = await db.select().from(astraCampaigns).where(and(eq(astraCampaigns.active, true), lt(astraCampaigns.startsAt, now))).orderBy(desc(astraCampaigns.startsAt));
  return rows.find((c) => !c.endsAt || c.endsAt > now) ?? null;
}

/** Every eligible user has a personal code (§29) — created lazily on first view. */
async function getOrCreatePersonalCode(userId: string, campaignId: string): Promise<string> {
  const db = await getDb();
  const existing = await db.select().from(giftCodes).where(and(eq(giftCodes.ownerUserId, userId), eq(giftCodes.campaignId, campaignId)));
  if (existing[0]) return existing[0].code;
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = `PRO-${randomCode(6)}`;
    const clash = await db.select({ id: giftCodes.id }).from(giftCodes).where(eq(giftCodes.code, code));
    if (clash.length === 0) {
      await db.insert(giftCodes).values({ campaignId, code, ownerUserId: userId, status: "active" });
      return code;
    }
  }
  throw new ApiError("internal_error", "Could not allocate a referral code. Please retry.");
}

export async function promotionRoutes(app: FastifyInstance) {
  // Public campaign info (for the landing/promo UI)
  app.get("/promotions/astra", async (request) => {
    const enabled = await getFlag("astra_promotion", true);
    const campaign = await getActiveCampaign();
    if (!enabled || !campaign) return { available: false, campaign: null };
    let entitlement: { activatedAt: string; expiresAt: string; daysLeft: number } | null = null;
    let myCode: string | null = null;
    try {
      const user = await requireUser(request);
      const db = await getDb();
      const ent = await db.select().from(astraEntitlements).where(and(eq(astraEntitlements.userId, user.id), eq(astraEntitlements.status, "active"), gt(astraEntitlements.expiresAt, new Date()))).orderBy(desc(astraEntitlements.activatedAt));
      if (ent[0]) {
        const msLeft = ent[0].expiresAt.getTime() - Date.now();
        entitlement = { activatedAt: ent[0].activatedAt.toISOString(), expiresAt: ent[0].expiresAt.toISOString(), daysLeft: Math.max(0, Math.ceil(msLeft / 86400_000)) };
      }
      myCode = await getOrCreatePersonalCode(user.id, campaign.id);
    } catch {
      /* unauthenticated — public view */
    }
    return {
      available: true,
      campaign: {
        name: campaign.name,
        originalPricePaise: campaign.originalPricePaise,
        originalPriceFormatted: formatMoney(campaign.originalPricePaise),
        discountPercent: campaign.discountPercent,
        promoPricePaise: campaign.promoPricePaise,
        promoPriceFormatted: formatMoney(campaign.promoPricePaise),
        trialDays: campaign.trialDays,
        endsAt: campaign.endsAt?.toISOString() ?? null,
        active: campaign.active,
      },
      entitlement,
      myCode,
    };
  });

  // Redeem a referral/gift code (§26, §49, §50)
  app.post("/promotions/astra/redeem", async (request, reply) => {
    const user = await requireUser(request);
    const enabled = await getFlag("astra_promotion", true);
    if (!enabled) throw new ApiError("campaign_inactive", "The Astra promotion is currently inactive.");
    const body = z.object({ code: z.string().min(4).max(32) }).parse(request.body);
    const rawCode = body.code.trim().toUpperCase();
    const db = await getDb();

    const campaign = await getActiveCampaign();
    if (!campaign) throw new ApiError("campaign_inactive", "No active Astra campaign.");
    const codes = await db.select().from(giftCodes).where(eq(giftCodes.code, rawCode));
    const code = codes[0];
    if (!code) throw new ApiError("invalid_code", "This code is not valid.");
    if (code.status !== "active") throw new ApiError("invalid_code", "This code has been suspended or revoked.");
    if (code.expiresAt && code.expiresAt < new Date()) throw new ApiError("code_expired", "This code has expired.");

    // Server-side self-redemption check — owner id NEVER comes from client (§50)
    if (code.ownerUserId && code.ownerUserId === user.id) {
      throw new ApiError("self_redemption_not_allowed", "You cannot redeem your own referral code. Share it with a friend instead.");
    }

    const already = await db.select().from(giftCodeRedemptions).where(and(eq(giftCodeRedemptions.codeId, code.id), eq(giftCodeRedemptions.redeemerUserId, user.id)));
    if (already.length > 0) throw new ApiError("already_redeemed", "You have already redeemed this code.");

    const maxPerCode = code.maxRedemptions ?? campaign.maxRedemptionsPerCode ?? null;
    if (!campaign.allowMultiRedeem && code.redemptionCount > 0) {
      throw new ApiError("already_redeemed", "This code has already been used.");
    }
    if (maxPerCode !== null && code.redemptionCount >= maxPerCode) {
      throw new ApiError("invalid_code", "This code has reached its redemption limit.");
    }

    // Everything in one transaction: redemption + entitlement + counter (§47)
    const activatedAt = new Date();
    const expiresAt = new Date(activatedAt.getTime() + campaign.trialDays * 86400_000);
    try {
      await db.transaction(async (tx: any) => {
        await tx.insert(giftCodeRedemptions).values({ campaignId: campaign.id, codeId: code.id, redeemerUserId: user.id });
        await tx.update(giftCodes).set({ redemptionCount: sql`${giftCodes.redemptionCount} + 1` }).where(eq(giftCodes.id, code.id));
        await tx.insert(astraEntitlements).values({ userId: user.id, campaignId: campaign.id, sourceCodeId: code.id, activatedAt, expiresAt, status: "active" });
        await tx.insert(notifications).values({
          userId: user.id,
          type: "astra_activated",
          title: "🎉 Astra activated!",
          body: `Your GPT Astra access is active for ${campaign.trialDays} days.`,
          href: "/dashboard/astra",
        });
        await tx.insert(auditLogs).values({ actorUserId: user.id, action: "astra.redeem", targetType: "gift_code", targetId: code.id, metadata: { campaign: campaign.slug } });
      });
    } catch (err) {
      if (String((err as Error).message).includes("redemptions_code_user_uq")) {
        throw new ApiError("already_redeemed", "You have already redeemed this code.");
      }
      if (String((err as Error).message).includes("astra_entitlements_code_user_uq")) {
        throw new ApiError("already_redeemed", "You have already redeemed this code.");
      }
      throw err;
    }

    return reply.send({
      success: true,
      entitlement: { activatedAt: activatedAt.toISOString(), expiresAt: expiresAt.toISOString(), daysLeft: campaign.trialDays },
      message: "Astra activated!",
    });
  });

  // Referral dashboard data (§29)
  app.get("/promotions/astra/referral", async (request) => {
    const user = await requireUser(request);
    const enabled = await getFlag("referral_system", true);
    if (!enabled) throw new ApiError("forbidden", "Referral system is disabled.");
    const campaign = await getActiveCampaign();
    if (!campaign) throw new ApiError("campaign_inactive", "No active campaign.");
    const db = await getDb();
    const code = await getOrCreatePersonalCode(user.id, campaign.id);
    const codes = await db.select().from(giftCodes).where(eq(giftCodes.code, code));
    const codeRow = codes[0];
    const redemptions = await db.select({ count: sql<number>`count(*)::int` }).from(giftCodeRedemptions).where(eq(giftCodeRedemptions.codeId, codeRow!.id));
    const activeCount = await db.select({ count: sql<number>`count(*)::int` }).from(astraEntitlements).where(and(eq(astraEntitlements.sourceCodeId, codeRow!.id), eq(astraEntitlements.status, "active"), gt(astraEntitlements.expiresAt, new Date())));
    return {
      code,
      sharePath: `/redeem?code=${code}`,
      successfulRedemptions: redemptions[0]?.count ?? 0,
      activeAstraUsers: activeCount[0]?.count ?? 0,
      trialDays: campaign.trialDays,
    };
  });

  // ── 48-Hour Promotional Launch Special (§Phase 4) ──
  const getPromoStatusHandler = async (request: any) => {
    const q = (request.query || {}) as { modelId?: string };
    const queryModel = q.modelId?.trim();
    const isModelEligible = queryModel ? isStrictlyPromotionalEligible(queryModel) : true;

    let status = {
      campaign: "launch-48h-special",
      name: "Launch Special: 48 Hours Free",
      eligibleModels: ["deepseek-v4.1-flash", "qwen3.8-27b"],
      durationHours: 48,
      modelId: queryModel ?? null,
      isModelEligible,
      activated: false,
      active: false,
      activatedAt: null as string | null,
      expiresAt: null as string | null,
      remainingMs: 0,
      remainingFormatted: "Not activated",
      quota: {
        maxRequestsPerDay: 50,
        requestsConsumed: 0,
        maxTokensPerDay: 500000,
        tokensConsumed: 0,
        quotaExceeded: false,
      },
    };

    try {
      const user = await requireUser(request);
      const db = await getDb();
      const rows = await db
        .select()
        .from(promotionalActivations)
        .where(
          and(
            eq(promotionalActivations.userId, user.id),
            eq(promotionalActivations.campaignSlug, "launch-48h-special")
          )
        );
      if (rows[0]) {
        const promoCalc = checkPromotionStatus(rows[0].activatedAt);
        const quotaExceeded = rows[0].requestCount >= 50 || rows[0].tokensConsumed >= 500000;

        status = {
          ...status,
          activated: true,
          active: promoCalc.active && !quotaExceeded,
          activatedAt: rows[0].activatedAt.toISOString(),
          expiresAt: rows[0].expiresAt.toISOString(),
          remainingMs: promoCalc.remainingMs,
          remainingFormatted: promoCalc.remainingFormatted,
          quota: {
            maxRequestsPerDay: 50,
            requestsConsumed: rows[0].requestCount,
            maxTokensPerDay: 500000,
            tokensConsumed: rows[0].tokensConsumed,
            quotaExceeded,
          },
        };
      }
    } catch {
      // unauthenticated
    }

    return status;
  };

  const activatePromoHandler = async (request: any) => {
    const user = await requireUser(request);
    const body = (request.body || {}) as { canonicalModelId?: string; modelId?: string };
    const modelToActivate = body.canonicalModelId || body.modelId;

    if (modelToActivate) {
      const canonical = resolvePromotionalCanonicalId(modelToActivate);
      if (!canonical) {
        throw new ApiError(
          "not_eligible",
          `Model '${modelToActivate}' is not eligible for the 48-hour free promotion. Only DeepSeek V4.1 Flash and Qwen3.8-27B qualify.`
        );
      }
    }

    const db = await getDb();

    // Check if user already activated
    const existing = await db
      .select()
      .from(promotionalActivations)
      .where(
        and(
          eq(promotionalActivations.userId, user.id),
          eq(promotionalActivations.campaignSlug, "launch-48h-special")
        )
      );

    if (existing[0]) {
      const promoCalc = checkPromotionStatus(existing[0].activatedAt);
      const quotaExceeded = existing[0].requestCount >= 50 || existing[0].tokensConsumed >= 500000;

      return {
        ok: true,
        alreadyActivated: true,
        active: promoCalc.active && !quotaExceeded,
        activatedAt: existing[0].activatedAt.toISOString(),
        expiresAt: existing[0].expiresAt.toISOString(),
        remainingMs: promoCalc.remainingMs,
        remainingFormatted: promoCalc.remainingFormatted,
        eligibleModels: ["deepseek-v4.1-flash", "qwen3.8-27b"],
        quota: {
          maxRequestsPerDay: 50,
          requestsConsumed: existing[0].requestCount,
          maxTokensPerDay: 500000,
          tokensConsumed: existing[0].tokensConsumed,
          quotaExceeded,
        },
      };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROMO_DURATION_MS);

    await db.insert(promotionalActivations).values({
      userId: user.id,
      campaignSlug: "launch-48h-special",
      activatedAt: now,
      expiresAt,
      requestCount: 0,
      tokensConsumed: 0,
      active: true,
    });

    return {
      ok: true,
      alreadyActivated: false,
      active: true,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingMs: PROMO_DURATION_MS,
      remainingFormatted: "48h 0m left",
      eligibleModels: ["deepseek-v4.1-flash", "qwen3.8-27b"],
      quota: {
        maxRequestsPerDay: 50,
        requestsConsumed: 0,
        maxTokensPerDay: 500000,
        tokensConsumed: 0,
        quotaExceeded: false,
      },
    };
  };

  app.get("/promotions/launch-48h", getPromoStatusHandler);
  app.get("/promotions/status", getPromoStatusHandler);
  app.get("/api/promotions/status", getPromoStatusHandler);

  app.post("/promotions/launch-48h/activate", activatePromoHandler);
  app.post("/promotions/activate", activatePromoHandler);
  app.post("/api/promotions/activate", activatePromoHandler);
}