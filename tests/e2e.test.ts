import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";

/**
 * End-to-end acceptance tests (§74, §97) run against the REAL Fastify app,
 * a REAL embedded PostgreSQL database and a REAL local HTTP provider that
 * streams genuine SSE — nothing is mocked.
 */

const TEST_DB = ".data/test-db";
const STUB_PORT = 5051;
const STUB_URL = `http://127.0.0.1:${STUB_PORT}/v1`;

process.env.DATABASE_DIR = TEST_DB;
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";
process.env.STUB_PORT = String(STUB_PORT);

type App = Awaited<ReturnType<typeof import("../apps/api/src/app.js")["buildApp"]>>;
let app: App;
let stub: ChildProcess;
let db: Awaited<ReturnType<typeof import("@uno/database")["getDb"]>>;
let adminSession: Session;

interface Session {
  cookie: string;
  userId: string;
  email: string;
}

function extractCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
  const session = list.find((c) => c.startsWith("uno_session="));
  if (!session) throw new Error("No session cookie set");
  return `uno_session=${session.split(";")[0].slice("uno_session=".length)}`;
}

async function register(email: string, password = "Password123!"): Promise<Session> {
  const res = await app.inject({ method: "POST", url: "/auth/register", payload: { email, password, name: email.split("@")[0] } });
  expect(res.statusCode).toBe(201);
  const cookie = extractCookie(res as never);
  const body = res.json() as { user: { id: string } };
  return { cookie, userId: body.user.id, email };
}

function auth(cookie: string) {
  return { cookie };
}

beforeAll(async () => {
  const t0 = Date.now();
  const log = (m: string) => console.log(`[e2e +${Date.now() - t0}ms] ${m}`);
  log("setup starting");
  // Fresh database for this test run
  fs.rmSync(path.resolve(TEST_DB), { recursive: true, force: true });
  log("old db removed");

  // Start the local OpenAI-compatible provider (real HTTP + SSE)
  stub = spawn(process.execPath, ["scripts/stub-provider.mjs"], { env: { ...process.env, STUB_PORT: String(STUB_PORT) }, stdio: "ignore", detached: false });
  await new Promise((r) => setTimeout(r, 800));
  log("stub provider started");

  const dbModule = await import("@uno/database");
  log("@uno/database imported");
  await dbModule.runMigrations();
  log("migrations done");
  db = await dbModule.getDb();
  log("db connected");

  // Minimal seed data used by the flows under test
  const { plans, astraCampaigns } = await import("@uno/database");
  await db.insert(plans).values({ slug: "free", name: "Free", tagline: "", pricePaise: 0, freeRpm: 1, freeRph: 30, freeRpd: 300, concurrency: 1, queuePriority: 5, features: [], active: true, sortOrder: 10 });
  await db.insert(astraCampaigns).values({ slug: "astra-test", name: "Astra 7-Day Access", originalPricePaise: 400000, discountPercent: 80, promoPricePaise: 80000, trialDays: 7, allowMultiRedeem: true, active: true });
  log("seed rows inserted");

  const { buildApp } = await import("../apps/api/src/app.js");
  log("app module imported");
  app = await buildApp();
  log("app built");
}, 120000);

afterAll(async () => {
  await app?.close();
  stub?.kill();
  const { closeDb } = await import("@uno/database");
  await closeDb();
});

describe("platform foundation", () => {
  it("serves health with a request id", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toBeTruthy();
    expect((res.json() as { status: string }).status).toBe("ok");
  });

  it("returns normalized errors for unknown routes (§78)", async () => {
    const res = await app.inject({ method: "GET", url: "/nope" });
    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string; request_id: string } };
    expect(body.error.code).toBe("not_found");
    expect(body.error.request_id).toBeTruthy();
  });
});

describe("admin provisions a provider and models", () => {
  let admin: Session;
  let providerId: string;

  it("allows role elevation and provider creation", async () => {
    admin = await register("admin@uno.test");
    adminSession = admin;
    const { users, getDb } = await import("@uno/database");
    const d = await getDb();
    await d.update(users).set({ role: "admin" }).where(eq(users.id, admin.userId));

    const res = await app.inject({
      method: "POST",
      url: "/admin/providers",
      headers: auth(admin.cookie),
      payload: { name: "Local Dev Provider", slug: "local-stub", endpointUrl: STUB_URL, adapterType: "openai", priority: 50, region: "local", description: "Local OpenAI-compatible provider", capabilities: ["chat"] },
    });
    expect(res.statusCode).toBe(201);
    providerId = (res.json() as { provider: { id: string } }).provider.id;
  });

  it("runs a live health check and marks the provider active (§43)", async () => {
    const res = await app.inject({ method: "POST", url: `/admin/providers/${providerId}/check`, headers: auth(admin.cookie) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { available: boolean; status: string };
    expect(body.available).toBe(true);
    expect(body.status).toBe("active");
  });

  it("creates free and paid models linked to the provider (§41)", async () => {
    const free = await app.inject({
      method: "POST", url: "/admin/models", headers: auth(admin.cookie),
      payload: { slug: "e2e-free", name: "E2E Free", description: "Free test model", isFree: true, inputPerMillion: 0, outputPerMillion: 0, links: [{ providerSlug: "local-stub", providerModelId: "local/uno-test-8b" }] },
    });
    expect(free.statusCode).toBe(201);

    const paid = await app.inject({
      method: "POST", url: "/admin/models", headers: auth(admin.cookie),
      payload: { slug: "e2e-paid", name: "E2E Paid", description: "Paid test model", isFree: false, inputPerMillion: 10000, outputPerMillion: 20000, links: [{ providerSlug: "local-stub", providerModelId: "local/uno-test-mini" }] },
    });
    expect(paid.statusCode).toBe(201);

    const astra = await app.inject({
      method: "POST", url: "/admin/models", headers: auth(admin.cookie),
      payload: { slug: "uno-gpt-astra", name: "ProRouter GPT Astra", description: "Flagship", isFree: false, inputPerMillion: 0, outputPerMillion: 0, links: [{ providerSlug: "local-stub", providerModelId: "local/uno-test-8b" }] },
    });
    expect(astra.statusCode).toBe(201);
  });

  it("lists available models through the public catalog", async () => {
    const res = await app.inject({ method: "GET", url: "/models" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: Array<{ slug: string; available: boolean; isFree: boolean }> };
    const free = body.items.find((m) => m.slug === "e2e-free");
    expect(free).toBeTruthy();
    expect(free!.available).toBe(true);
    expect(free!.isFree).toBe(true);
  });
});

describe("chat completions pipeline (§13, §14, §54)", () => {
  let user: Session;
  let apiKey: string;

  it("registers a user and creates an API key (raw key shown once)", async () => {
    user = await register("chat@uno.test");
    const res = await app.inject({ method: "POST", url: "/keys", headers: auth(user.cookie), payload: { name: "test key" } });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { secret: string; key: { prefix: string; requestCount: number } };
    expect(body.secret).toMatch(/^pro_sk_live_/);
    expect(body.key.prefix).toBe(body.secret.slice(0, 16));
    apiKey = body.secret;

    // The raw key must not be retrievable again
    const list = await app.inject({ method: "GET", url: "/keys", headers: auth(user.cookie) });
    expect(JSON.stringify(list.json())).not.toContain(body.secret);
  });

  it("returns a non-streaming completion with usage and zero cost for free models", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${apiKey}`, "x-request-id": "e2e-nonstream-1" },
      payload: { model: "e2e-free", messages: [{ role: "user", content: "Hello ProRouter" }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-request-id"]).toBe("e2e-nonstream-1");
    const body = res.json() as { choices: Array<{ message: { content: string } }>; usage: { total_tokens: number }; uno: { cost_paise: number; provider: string; is_free: boolean } };
    expect(body.choices[0].message.content.length).toBeGreaterThan(10);
    expect(body.usage.total_tokens).toBeGreaterThan(0);
    expect(body.uno.cost_paise).toBe(0);
    expect(body.uno.is_free).toBe(true);
    expect(body.uno.provider).toBe("local-stub");
  });

  it("enforces the free-model per-minute quota (§51)", async () => {
    const res = await app.inject({
      method: "POST", url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${apiKey}` },
      payload: { model: "e2e-free", messages: [{ role: "user", content: "again" }] },
    });
    expect(res.statusCode).toBe(429);
    const body = res.json() as { error: { code: string } };
    expect(body.error.code).toBe("free_quota_exceeded");
    expect(res.headers["retry-after"]).toBeTruthy();
  });

  it("does not let concurrent requests bypass the free quota (§51)", async () => {
    const burstUser = await register("burst@uno.test");
    const keyRes = await app.inject({ method: "POST", url: "/keys", headers: auth(burstUser.cookie), payload: { name: "burst" } });
    const burstKey = (keyRes.json() as { secret: string }).secret;
    const results = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        app.inject({ method: "POST", url: "/v1/chat/completions", headers: { authorization: `Bearer ${burstKey}` }, payload: { model: "e2e-free", messages: [{ role: "user", content: "burst" }] } }),
      ),
    );
    const successes = results.filter((r) => r.statusCode === 200).length;
    expect(successes).toBe(1);
    expect(results.filter((r) => r.statusCode === 429).length).toBe(4);
  });

  it("streams true SSE tokens with progressive chunks (§14)", async () => {
    const streamUser = await register("stream@uno.test");
    const keyRes = await app.inject({ method: "POST", url: "/keys", headers: auth(streamUser.cookie), payload: { name: "stream" } });
    const streamKey = (keyRes.json() as { secret: string }).secret;
    const res = await app.inject({
      method: "POST", url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${streamKey}` },
      payload: { model: "e2e-free", stream: true, messages: [{ role: "user", content: "Stream please" }] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.body).toContain("data: ");
    expect(res.body).toContain('"object":"chat.completion.chunk"');
    expect(res.body).toContain("data: [DONE]");
    const chunks = res.body.split("\n").filter((l) => l.startsWith("data: ") && l.includes('"delta"'));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("rejects paid requests with insufficient balance before reaching a provider (§54)", async () => {
    const broke = await register("broke@uno.test");
    const keyRes = await app.inject({ method: "POST", url: "/keys", headers: auth(broke.cookie), payload: { name: "broke" } });
    const brokeKey = (keyRes.json() as { secret: string }).secret;
    const res = await app.inject({
      method: "POST", url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${brokeKey}` },
      payload: { model: "e2e-paid", messages: [{ role: "user", content: "paid" }] },
    });
    expect(res.statusCode).toBe(402);
    expect((res.json() as { error: { code: string } }).error.code).toBe("insufficient_balance");
    // No request record should exist for a blocked paid call
    const { requests } = await import("@uno/database");
    const rows = await db.select().from(requests).where(eq(requests.userId, broke.userId));
    expect(rows).toHaveLength(0);
  });

  it("charges a paid request from the wallet (§24, §48)", async () => {
    const adjust = await app.inject({ method: "POST", url: `/admin/users/${user.userId}/wallet`, headers: auth(adminSession.cookie), payload: { amountPaise: 50000, reason: "test top-up" } });
    expect(adjust.statusCode).toBe(200);

    const walletBefore = (await app.inject({ method: "GET", url: "/wallet", headers: auth(user.cookie) })).json() as { balancePaise: number };
    expect(walletBefore.balancePaise).toBeGreaterThan(0);

    const res = await app.inject({
      method: "POST", url: "/v1/chat/completions",
      headers: { authorization: `Bearer ${apiKey}` },
      payload: { model: "e2e-paid", messages: [{ role: "user", content: "bill me" }] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { uno: { cost_paise: number }; usage: { prompt_tokens: number; completion_tokens: number } };
    expect(body.uno.cost_paise).toBeGreaterThan(0);

    const walletAfter = (await app.inject({ method: "GET", url: "/wallet", headers: auth(user.cookie) })).json() as { balancePaise: number; transactions: Array<{ type: string; amountPaise: number }> };
    expect(walletAfter.balancePaise).toBe(walletBefore.balancePaise - body.uno.cost_paise);
    expect(walletAfter.transactions[0].type).toBe("usage");
    expect(walletAfter.transactions[0].amountPaise).toBe(-body.uno.cost_paise);
  });

  it("records activity with tokens, cost and provider (§17)", async () => {
    const res = await app.inject({ method: "GET", url: "/dashboard/activity", headers: auth(user.cookie) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { items: Array<{ model: string; costPaise: number; totalTokens: number; provider: string }> };
    expect(body.items.length).toBeGreaterThan(0);
    const paid = body.items.find((i) => i.model === "e2e-paid");
    expect(paid?.costPaise).toBeGreaterThan(0);
    expect(paid?.totalTokens).toBeGreaterThan(0);
    expect(paid?.provider).toBe("local-stub");
  });
});

describe("Astra referral redemption rules (§26, §49, §50)", () => {
  let userA: Session;
  let userB: Session;
  let code: string;

  it("issues each user a personal referral code", async () => {
    userA = await register("referra@uno.test");
    userB = await register("referrb@uno.test");
    const res = await app.inject({ method: "GET", url: "/promotions/astra/referral", headers: auth(userA.cookie) });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { code: string; sharePath: string };
    expect(body.code).toMatch(/^PRO-[A-Z0-9]{6}$/);
    expect(body.sharePath).toContain(body.code);
    code = body.code;
  });

  it("lets ANOTHER user redeem the code for 7 days of Astra", async () => {
    const res = await app.inject({ method: "POST", url: "/promotions/astra/redeem", headers: auth(userB.cookie), payload: { code } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { success: boolean; entitlement: { daysLeft: number; expiresAt: string } };
    expect(body.success).toBe(true);
    expect(body.entitlement.daysLeft).toBe(7);
  });

  it("blocks the owner from redeeming their OWN code (§50)", async () => {
    const res = await app.inject({ method: "POST", url: "/promotions/astra/redeem", headers: auth(userA.cookie), payload: { code } });
    expect(res.statusCode).toBe(403);
    expect((res.json() as { error: { code: string } }).error.code).toBe("self_redemption_not_allowed");
  });

  it("blocks the same user redeeming the same code twice (§26)", async () => {
    const res = await app.inject({ method: "POST", url: "/promotions/astra/redeem", headers: auth(userB.cookie), payload: { code } });
    expect(res.statusCode).toBe(409);
    expect((res.json() as { error: { code: string } }).error.code).toBe("already_redeemed");
  });

  it("rejects unknown codes", async () => {
    const res = await app.inject({ method: "POST", url: "/promotions/astra/redeem", headers: auth(userA.cookie), payload: { code: "PRO-ZZZZZZ" } });
    expect(res.statusCode).toBe(404);
    expect((res.json() as { error: { code: string } }).error.code).toBe("invalid_code");
  });

  it("gates Astra model access behind an active entitlement (§49)", async () => {
    const denied = await app.inject({
      method: "POST", url: "/v1/chat/completions", headers: auth(userA.cookie),
      payload: { model: "uno-gpt-astra", messages: [{ role: "user", content: "hi" }] },
    });
    expect(denied.statusCode).toBe(403);
    expect((denied.json() as { error: { code: string } }).error.code).toBe("astra_entitlement_required");

    const allowed = await app.inject({
      method: "POST", url: "/v1/chat/completions", headers: auth(userB.cookie),
      payload: { model: "uno-gpt-astra", messages: [{ role: "user", content: "hi" }] },
    });
    expect(allowed.statusCode).toBe(200);
    expect((allowed.json() as { choices: Array<{ message: { content: string } }> }).choices[0].message.content.length).toBeGreaterThan(5);
  });
});

describe("payment webhook idempotency (§55)", () => {
  it("credits the wallet exactly once for repeated webhook deliveries", async () => {
    const payee = await register("payee@uno.test");
    const { payments } = await import("@uno/database");
    await db.insert(payments).values({
      userId: payee.userId,
      gateway: "razorpay",
      gatewayOrderId: "order_idem_1",
      amountPaise: 99900,
      status: "created",
      invoiceNumber: "PRO-IDEM-1",
      metadata: { bonusPaise: 5100 },
    });

    const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_x1", order_id: "order_idem_1" } } } });
    const signature = createHmac("sha256", "whsec_test").update(rawBody).digest("hex");
    const headers = { "content-type": "application/json", "x-razorpay-signature": signature };

    const first = await app.inject({ method: "POST", url: "/payments/razorpay/webhook", headers, payload: rawBody });
    expect(first.statusCode).toBe(200);
    expect((first.json() as { status: string }).status).toBe("credited");

    const wallet1 = (await app.inject({ method: "GET", url: "/wallet", headers: auth(payee.cookie) })).json() as { balancePaise: number };
    expect(wallet1.balancePaise).toBe(99900 + 5100);

    // Identical delivery again (gateways retry) — must NOT double-credit
    const second = await app.inject({ method: "POST", url: "/payments/razorpay/webhook", headers, payload: rawBody });
    expect(second.statusCode).toBe(200);
    expect(["duplicate_ignored", "already_credited"]).toContain((second.json() as { status: string }).status);

    const wallet2 = (await app.inject({ method: "GET", url: "/wallet", headers: auth(payee.cookie) })).json() as { balancePaise: number };
    expect(wallet2.balancePaise).toBe(wallet1.balancePaise);
  });

  it("rejects webhooks with an invalid signature", async () => {
    const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_bad", order_id: "order_none" } } } });
    const res = await app.inject({
      method: "POST",
      url: "/payments/razorpay/webhook",
      headers: { "content-type": "application/json", "x-razorpay-signature": "invalid" },
      payload: rawBody,
    });
    expect(res.statusCode).toBe(403);
  });
});