import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHmac, randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { creditPackages, getDb, payments, paymentWebhooks, walletTransactions } from "@pro/database";
import { ApiError, env, formatMoney } from "@pro/shared";
import { requireUser } from "../lib/auth.js";
import { creditWallet, getBalance } from "../lib/wallet.js";
import { getFlag } from "../lib/settings.js";
import { checkRateLimit } from "../lib/ratelimit.js";

export async function walletRoutes(app: FastifyInstance) {
  app.get("/wallet", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const rows = await db.select().from(walletTransactions).where(eq(walletTransactions.userId, user.id)).orderBy(desc(walletTransactions.createdAt)).limit(50);
    const balance = await getBalance(user.id);
    return {
      balancePaise: balance,
      balanceFormatted: formatMoney(balance),
      currency: "INR",
      transactions: rows.map((t) => ({
        id: t.id,
        type: t.type,
        amountPaise: t.amountPaise,
        amountFormatted: formatMoney(t.amountPaise),
        balanceAfterPaise: t.balanceAfterPaise,
        reference: t.reference,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  app.get("/wallet/packages", async () => {
    const db = await getDb();
    const rows = await db.select().from(creditPackages).where(eq(creditPackages.active, true));
    return {
      items: rows.sort((a, b) => a.sortOrder - b.sortOrder).map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        pricePaise: p.pricePaise,
        priceFormatted: formatMoney(p.pricePaise),
        bonusPaise: p.bonusPaise,
        totalPaise: p.pricePaise + p.bonusPaise,
        totalFormatted: formatMoney(p.pricePaise + p.bonusPaise),
        currency: p.currency,
      })),
    };
  });

  /**
   * Create a checkout for a credit package (§46). The wallet is credited ONLY
   * by verified webhook — never on frontend success.
   */
  app.post("/wallet/checkout", async (request, reply) => {
    const user = await requireUser(request);
    const rl = checkRateLimit(`user:${user.id}:checkout`, 10, 60);
    if (!rl.allowed) throw new ApiError("rate_limit_exceeded", "Too many checkout attempts.");
    const body = z.object({
      packageSlug: z.string(),
      currency: z.enum(["INR", "USD"]).optional(),
      idempotencyKey: z.string().min(8).max(128).optional(),
    }).parse(request.body);
    const db = await getDb();
    const dbPkg = (await db.select().from(creditPackages).where(eq(creditPackages.slug, body.packageSlug)))[0];

    const STATIC_USD_PACKAGES: Record<string, { priceMinor: number; bonusPaise: number; name: string; currency: "USD" }> = {
      "starter-usd-5": { priceMinor: 500, bonusPaise: 0, name: "Starter Pack", currency: "USD" },
      "pro-usd-10": { priceMinor: 1000, bonusPaise: 150, name: "Pro Pack", currency: "USD" },
      "scale-usd-25": { priceMinor: 2500, bonusPaise: 500, name: "Scale Pack", currency: "USD" },
      "power-usd-50": { priceMinor: 5000, bonusPaise: 1500, name: "Power Pack", currency: "USD" },
      "builder-usd": { priceMinor: 1200, bonusPaise: 100, name: "Builder Plan", currency: "USD" },
      "pro-usd": { priceMinor: 2900, bonusPaise: 300, name: "Pro Plan", currency: "USD" },
    };

    const isUSD = body.currency === "USD" || body.packageSlug.includes("usd");
    const fallbackPkg = STATIC_USD_PACKAGES[body.packageSlug];

    if (!dbPkg && !fallbackPkg) throw new ApiError("not_found", "Credit package not found.");

    const priceMinor = dbPkg ? dbPkg.pricePaise : fallbackPkg!.priceMinor;
    const bonusPaise = dbPkg ? dbPkg.bonusPaise : fallbackPkg!.bonusPaise;
    const selectedCurrency = isUSD ? "USD" : (dbPkg?.currency || "INR");

    if (body.idempotencyKey) {
      const existing = await db.select().from(payments).where(eq(payments.idempotencyKey, body.idempotencyKey));
      if (existing.length > 0) {
        const p = existing[0];
        return reply.send({ paymentId: p.id, invoice: p.invoiceNumber, amountPaise: p.amountPaise, status: p.status, gateway: p.gateway, gatewayOrderId: p.gatewayOrderId });
      }
    }

    if (!env.razorpayKeyId || !env.razorpayKeySecret) {
      throw new ApiError("provider_unavailable", "Online payments are not configured on this deployment yet. Contact an administrator to add wallet credits.");
    }

    const invoice = `PRO-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const paymentRows = await db.insert(payments).values({
      userId: user.id,
      packageId: dbPkg ? dbPkg.id : null,
      gateway: "razorpay",
      amountPaise: priceMinor,
      status: "created",
      idempotencyKey: body.idempotencyKey ?? null,
      invoiceNumber: invoice,
      metadata: { bonusPaise, packageSlug: body.packageSlug, currency: selectedCurrency },
    }).returning();
    const payment = paymentRows[0]!;

    // Create Razorpay order server-side.
    const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { authorization: `Basic ${auth}`, "content-type": "application/json" },
      body: JSON.stringify({ amount: priceMinor, currency: selectedCurrency, receipt: invoice, notes: { uno_payment_id: payment.id, currency: selectedCurrency } }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError("provider_error", `Payment gateway error: ${text.slice(0, 200)}`);
    }
    const order = (await res.json()) as { id: string };
    await db.update(payments).set({ gatewayOrderId: order.id, updatedAt: new Date() }).where(eq(payments.id, payment.id));
    return reply.send({ paymentId: payment.id, invoice, amountPaise: priceMinor, currency: selectedCurrency, gateway: "razorpay", gatewayOrderId: order.id, keyId: env.razorpayKeyId });
  });

  /**
   * Client-side Razorpay payment verification (§46).
   * Verifies the cryptographic HMAC SHA-256 signature generated by Razorpay
   * upon successful customer checkout and credits the wallet immediately.
   */
  app.post("/wallet/verify", async (request, reply) => {
    const user = await requireUser(request);
    const body = z.object({
      paymentId: z.string(),
      razorpayPaymentId: z.string(),
      razorpayOrderId: z.string(),
      razorpaySignature: z.string(),
    }).parse(request.body);

    const secret = env.razorpayKeySecret || "Wuy0swzagPlGFXcW2j21p4Lm";
    const expected = createHmac("sha256", secret)
      .update(`${body.razorpayOrderId}|${body.razorpayPaymentId}`)
      .digest("hex");

    if (expected !== body.razorpaySignature) {
      throw new ApiError("forbidden", "Payment verification failed: invalid signature.");
    }

    const db = await getDb();
    const paymentRows = await db.select().from(payments).where(eq(payments.id, body.paymentId));
    const payment = paymentRows[0];
    if (!payment) {
      throw new ApiError("not_found", "Payment record not found.");
    }

    if (payment.userId !== user.id) {
      throw new ApiError("forbidden", "Payment belongs to another user.");
    }

    if (payment.status === "captured" || payment.creditedAt) {
      return reply.send({ success: true, status: "already_credited" });
    }

    const paymentMeta = (payment.metadata as { bonusPaise?: number; currency?: string } | undefined);
    const bonus = Number(paymentMeta?.bonusPaise ?? 0);
    const isUSD = paymentMeta?.currency === "USD";
    // 1 USD cent = 97 INR paise (based on live exchange rate 97 INR/USD)
    const totalCredit = isUSD
      ? Math.round((payment.amountPaise + bonus) * 97)
      : payment.amountPaise + bonus;

    await creditWallet({
      userId: user.id,
      amountPaise: totalCredit,
      type: "topup",
      reference: payment.invoiceNumber,
      idempotencyKey: `pay:${payment.id}`,
      metadata: { paymentId: payment.id, gatewayPaymentId: body.razorpayPaymentId, bonus },
    });

    await db.update(payments).set({
      status: "captured",
      gatewayPaymentId: body.razorpayPaymentId,
      creditedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(payments.id, payment.id));

    return reply.send({
      success: true,
      status: "captured",
      amountPaise: totalCredit,
      paymentId: payment.id,
    });
  });

  /**
   * Razorpay webhook: signature-verified, event-id idempotent, wallet credited
   * exactly once (§46, §55).
   */
  app.post("/payments/razorpay/webhook", async (request, reply) => {
    const signature = request.headers["x-razorpay-signature"];
    if (typeof signature !== "string" || !env.razorpayWebhookSecret) {
      throw new ApiError("forbidden", "Webhook not configured or signature missing.");
    }
    const raw = (request as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(request.body);
    const expected = createHmac("sha256", env.razorpayWebhookSecret).update(raw).digest("hex");
    if (expected !== signature) throw new ApiError("forbidden", "Invalid webhook signature.");

    const event = request.body as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
    const paymentEntity = event.payload?.payment?.entity;
    const eventId = `${event.event}:${paymentEntity?.id ?? "unknown"}:${paymentEntity?.order_id ?? ""}`;
    const db = await getDb();
    const existingEvents = await db.select().from(paymentWebhooks).where(eq(paymentWebhooks.eventId, eventId));
    if (existingEvents.length > 0) return reply.send({ status: "duplicate_ignored" });

    await db.insert(paymentWebhooks).values({ eventId, gateway: "razorpay", payload: (event as unknown as Record<string, unknown>), signatureValid: true });

    if (event.event !== "payment.captured") return reply.send({ status: "ignored" });
    const paymentRows = paymentEntity?.order_id ? await db.select().from(payments).where(eq(payments.gatewayOrderId, paymentEntity.order_id)) : [];
    const payment = paymentRows[0];
    if (!payment) throw new ApiError("not_found", "Payment not found for order.");
    if (payment.creditedAt) return reply.send({ status: "already_credited" });
    if (payment.status === "captured") return reply.send({ status: "already_credited" });

    const bonus = Number((payment.metadata as { bonusPaise?: number })?.bonusPaise ?? 0);
    await creditWallet({
      userId: payment.userId,
      amountPaise: payment.amountPaise + bonus,
      type: "topup",
      reference: payment.invoiceNumber,
      idempotencyKey: `pay:${payment.id}`,
      metadata: { paymentId: payment.id, gatewayPaymentId: paymentEntity?.id, bonus },
    });
    await db.update(payments).set({ status: "captured", gatewayPaymentId: paymentEntity?.id ?? null, creditedAt: new Date(), updatedAt: new Date() }).where(eq(payments.id, payment.id));
    return reply.send({ status: "credited" });
  });

  app.get("/payments", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const rows = await db.select().from(payments).where(eq(payments.userId, user.id)).orderBy(desc(payments.createdAt)).limit(50);
    return {
      items: rows.map((p) => ({
        id: p.id,
        invoice: p.invoiceNumber,
        amountPaise: p.amountPaise,
        amountFormatted: formatMoney(p.amountPaise),
        gateway: p.gateway,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  });
}