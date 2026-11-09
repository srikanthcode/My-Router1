import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { handleFallback } from "@/lib/builtin-gateway";

const SESSION_SECRET = "test_session_secret_0123456789";
const RAZORPAY_SECRET = "test_razorpay_secret";

const savedEnv: Record<string, string | undefined> = {};

function call(path: string, init?: { method?: string; body?: unknown; cookie?: string }) {
  const headers = new Headers();
  if (init?.body !== undefined) headers.set("content-type", "application/json");
  if (init?.cookie) headers.set("cookie", `uno_session=${init.cookie}`);
  const request = new NextRequest(`http://localhost/api${path}`, {
    method: init?.method || "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return handleFallback(request, path.split("/").filter(Boolean));
}

function sessionCookie(res: Response): string {
  const withCookies = res as Response & { cookies?: { get(name: string): { value: string } | undefined } };
  return withCookies.cookies?.get("uno_session")?.value || "";
}

async function register(email: string, password = "Password123") {
  const res = await call("/auth/register", { method: "POST", body: { email, password, name: "Fallback User" } });
  return { res, cookie: sessionCookie(res) };
}

async function login(email: string, password = "Password123") {
  const res = await call("/auth/login", { method: "POST", body: { email, password } });
  return { res, cookie: sessionCookie(res) };
}

function signPayload(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function mockRazorpayOrder(orderId: string) {
  const originalFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: unknown) => {
      if (String(input).includes("api.razorpay.com")) {
        return new Response(JSON.stringify({ id: orderId }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return originalFetch(input as RequestInfo);
    }),
  );
}

beforeAll(() => {
  for (const key of [
    "SESSION_SECRET",
    "PROROUTER_SESSION_SECRET",
    "PROROUTER_ADMIN_EMAILS",
    "PROROUTER_ENABLE_DEMO_FALLBACK",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "NEXT_PUBLIC_RAZORPAY_KEY_ID",
    "NODE_ENV",
  ]) {
    savedEnv[key] = process.env[key];
  }
  process.env.SESSION_SECRET = SESSION_SECRET;
  delete process.env.PROROUTER_SESSION_SECRET;
  process.env.PROROUTER_ADMIN_EMAILS = "";
  process.env.PROROUTER_ENABLE_DEMO_FALLBACK = "true";
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("demo fallback gating", () => {
  it("returns 503 for every route when explicitly disabled", async () => {
    process.env.PROROUTER_ENABLE_DEMO_FALLBACK = "false";
    try {
      const res = await call("/models");
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error.code).toBe("provider_unavailable");
    } finally {
      process.env.PROROUTER_ENABLE_DEMO_FALLBACK = "true";
    }
  });

  it("refuses to issue sessions in production without a configured secret", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    try {
      const res = await call("/auth/register", {
        method: "POST",
        body: { email: "prod.check1@gmail.com", password: "Password123" },
      });
      expect(res.status).toBe(503);
    } finally {
      process.env.NODE_ENV = "test";
      process.env.SESSION_SECRET = SESSION_SECRET;
    }
  });
});

describe("demo authentication", () => {
  it("rejects weak passwords and duplicate registrations", async () => {
    const weak = await call("/auth/register", {
      method: "POST",
      body: { email: "fallback.weak1@gmail.com", password: "short" },
    });
    expect(weak.status).toBe(400);

    const first = await register("fallback.dup1@gmail.com");
    expect(first.res.status).toBe(201);
    expect(first.cookie).not.toBe("");

    const duplicate = await call("/auth/register", {
      method: "POST",
      body: { email: "fallback.dup1@gmail.com", password: "Password123" },
    });
    expect(duplicate.status).toBe(409);
  });

  it("requires the correct password to log in", async () => {
    await register("fallback.login1@gmail.com");
    const wrong = await login("fallback.login1@gmail.com", "WrongPassword123");
    expect(wrong.res.status).toBe(401);
    expect(wrong.cookie).toBe("");

    const right = await login("fallback.login1@gmail.com");
    expect(right.res.status).toBe(200);
    expect(right.cookie).not.toBe("");

    const me = await call("/auth/me", { cookie: right.cookie });
    expect(me.status).toBe(200);
    expect((await me.json()).user.email).toBe("fallback.login1@gmail.com");
  });

  it("rejects unsigned and tampered session cookies", async () => {
    const forgedPayload = Buffer.from(JSON.stringify({ email: "fallback.forge1@gmail.com", role: "admin", iat: Date.now() })).toString("base64url");
    const unsigned = await call("/auth/me", { cookie: forgedPayload });
    expect(unsigned.status).toBe(401);

    const signed = signPayload({ email: "fallback.forge1@gmail.com", iat: Date.now() });
    const tampered = signed.slice(0, -1) + (signed.endsWith("A") ? "B" : "A");
    const res = await call("/auth/me", { cookie: tampered });
    expect(res.status).toBe(401);
  });

  it("ignores role claims inside signed cookies", async () => {
    const cookie = signPayload({
      email: "fallback.role1@gmail.com",
      name: "Role Test",
      role: "admin",
      iat: Date.now(),
    });
    const res = await call("/auth/me", { cookie });
    expect(res.status).toBe(200);
    expect((await res.json()).user.role).toBe("user");
  });

  it("expires old signed sessions", async () => {
    const cookie = signPayload({
      email: "fallback.expired1@gmail.com",
      iat: Date.now() - 31 * 24 * 3600 * 1000,
    });
    const res = await call("/auth/me", { cookie });
    expect(res.status).toBe(401);
  });
});

describe("demo wallet and keys", () => {
  it("requires a session and isolates wallets per user", async () => {
    const anonymous = await call("/wallet");
    expect(anonymous.status).toBe(401);

    const alpha = await register("fallback.wallet.a1@gmail.com");
    expect(alpha.res.status).toBe(201);

    const empty = await call("/wallet", { cookie: alpha.cookie });
    expect((await empty.json()).balancePaise).toBe(0);

    const redeemed = await call("/promotions/astra/redeem", {
      method: "POST",
      cookie: alpha.cookie,
      body: { code: "ASTRA-PRO" },
    });
    expect(redeemed.status).toBe(200);
    const redeemedBody = await redeemed.json();
    expect(redeemedBody.success).toBe(true);
    expect(redeemedBody.entitlement.daysLeft).toBe(30);

    const funded = await call("/wallet", { cookie: alpha.cookie });
    expect((await funded.json()).balancePaise).toBe(5000);

    const again = await call("/promotions/astra/redeem", {
      method: "POST",
      cookie: alpha.cookie,
      body: { code: "ASTRA-PRO" },
    });
    expect(again.status).toBe(400);
    expect((await again.json()).error.code).toBe("already_redeemed");

    const me = await call("/auth/me", { cookie: alpha.cookie });
    const meBody = await me.json();
    expect(meBody.balancePaise).toBe(5000);
    expect(meBody.astra.active).toBe(true);

    const beta = await register("fallback.wallet.b1@gmail.com");
    const betaWallet = await call("/wallet", { cookie: beta.cookie });
    expect((await betaWallet.json()).balancePaise).toBe(0);
  });

  it("does not fabricate API keys", async () => {
    const user = await register("fallback.keys1@gmail.com");
    const list = await call("/keys", { cookie: user.cookie });
    expect(list.status).toBe(503);
    const create = await call("/keys", { method: "POST", cookie: user.cookie, body: { name: "test" } });
    expect(create.status).toBe(503);
  });

  it("rejects checkout and verification without Razorpay configuration", async () => {
    const user = await register("fallback.pay.cfg1@gmail.com");
    const checkout = await call("/wallet/checkout", {
      method: "POST",
      cookie: user.cookie,
      body: { packageSlug: "starter-100" },
    });
    expect(checkout.status).toBe(503);

    const verify = await call("/wallet/verify", {
      method: "POST",
      cookie: user.cookie,
      body: { razorpayPaymentId: "pay_x", razorpayOrderId: "order_x", razorpaySignature: "sig" },
    });
    expect(verify.status).toBe(503);
  });

  it("rejects unknown packages and invalid payment signatures", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;
    mockRazorpayOrder("order_sig_test");
    const user = await register("fallback.pay.sig1@gmail.com");

    const unknown = await call("/wallet/checkout", {
      method: "POST",
      cookie: user.cookie,
      body: { packageSlug: "not-a-package" },
    });
    expect(unknown.status).toBe(400);

    const checkout = await call("/wallet/checkout", {
      method: "POST",
      cookie: user.cookie,
      body: { packageSlug: "starter-100", idempotencyKey: "sig-test" },
    });
    expect(checkout.status).toBe(200);
    const order = await checkout.json();

    const badSignature = await call("/wallet/verify", {
      method: "POST",
      cookie: user.cookie,
      body: {
        razorpayPaymentId: "pay_bad_sig",
        razorpayOrderId: order.gatewayOrderId,
        razorpaySignature: "deadbeef",
      },
    });
    expect(badSignature.status).toBe(403);

    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it("verifies and credits a Razorpay order exactly once", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;
    mockRazorpayOrder("order_fallback_test");

    try {
      const user = await register("fallback.pay.ok1@gmail.com");
      const checkout = await call("/wallet/checkout", {
        method: "POST",
        cookie: user.cookie,
        body: { packageSlug: "starter-100", idempotencyKey: "checkout-1" },
      });
      expect(checkout.status).toBe(200);
      const order = await checkout.json();
      expect(order.gatewayOrderId).toBe("order_fallback_test");

      const repeatedCheckout = await call("/wallet/checkout", {
        method: "POST",
        cookie: user.cookie,
        body: { packageSlug: "starter-100", idempotencyKey: "checkout-1" },
      });
      expect((await repeatedCheckout.json()).paymentId).toBe(order.paymentId);

      const paymentId = "pay_fallback_test";
      const signature = createHmac("sha256", RAZORPAY_SECRET)
        .update(`${order.gatewayOrderId}|${paymentId}`)
        .digest("hex");

      const verified = await call("/wallet/verify", {
        method: "POST",
        cookie: user.cookie,
        body: {
          paymentId: order.paymentId,
          razorpayPaymentId: paymentId,
          razorpayOrderId: order.gatewayOrderId,
          razorpaySignature: signature,
        },
      });
      expect(verified.status).toBe(200);
      const verifiedBody = await verified.json();
      expect(verifiedBody.credited).toBe(true);

      const wallet = await call("/wallet", { cookie: user.cookie });
      expect((await wallet.json()).balancePaise).toBe(10000);

      const replay = await call("/wallet/verify", {
        method: "POST",
        cookie: user.cookie,
        body: {
          paymentId: order.paymentId,
          razorpayPaymentId: paymentId,
          razorpayOrderId: order.gatewayOrderId,
          razorpaySignature: signature,
        },
      });
      expect(replay.status).toBe(200);
      const replayBody = await replay.json();
      expect(replayBody.credited).toBe(false);
      expect(replayBody.deduped).toBe(true);

      const afterReplay = await call("/wallet", { cookie: user.cookie });
      expect((await afterReplay.json()).balancePaise).toBe(10000);

      const other = await register("fallback.pay.other1@gmail.com");
      const crossUser = await call("/wallet/verify", {
        method: "POST",
        cookie: other.cookie,
        body: {
          razorpayPaymentId: "pay_other_user",
          razorpayOrderId: order.gatewayOrderId,
          razorpaySignature: signature,
        },
      });
      expect(crossUser.status).toBe(400);
    } finally {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;
    }
  });
});
