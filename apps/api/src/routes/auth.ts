import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, users, wallets, notifications, auditLogs, plans, subscriptions } from "@uno/database";
import { ApiError, hashPassword, isStrongPassword, verifyPassword } from "@uno/shared";
import { createSession, destroySession, getActiveAstra, requireUser, resolveSessionUser } from "../lib/auth.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { getBalance } from "../lib/wallet.js";

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().max(80).optional(),
});

function publicUser(u: { id: string; email: string; name: string; role: string; status: string }) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, status: u.status };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (request, reply) => {
    const ip = request.ip || "unknown";
    const rl = checkRateLimit(`ip:${ip}:register`, 12, 60);
    if (!rl.allowed) throw new ApiError("rate_limit_exceeded", "Too many sign-up attempts. Try again shortly.");
    const body = registerSchema.parse(request.body);
    if (!isStrongPassword(body.password)) {
      throw new ApiError("invalid_request", "Password must be at least 8 characters and include a letter and a number.");
    }
    const db = await getDb();
    const email = body.email.toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing.length > 0) throw new ApiError("invalid_request", "An account with this email already exists.");

    const inserted = await db.insert(users).values({ email, passwordHash: await hashPassword(body.password), name: body.name ?? "", emailVerified: false }).returning();
    const user = inserted[0]!;
    await db.insert(wallets).values({ userId: user.id, balancePaise: 0 }).onConflictDoNothing({ target: wallets.userId });

    const freePlan = (await db.select().from(plans).where(eq(plans.slug, "free")))[0];
    if (freePlan) {
      await db.insert(subscriptions).values({ userId: user.id, planId: freePlan.id, status: "active" }).onConflictDoNothing();
    }
    await db.insert(notifications).values({
      userId: user.id,
      type: "welcome",
      title: "Welcome to ProRouter",
      body: "One API. Every Model. Create an API key to start building.",
      href: "/dashboard/keys",
    });
    await db.insert(auditLogs).values({ actorUserId: user.id, action: "auth.register", targetType: "user", targetId: user.id, ip });

    const authed = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
    await createSession(authed, reply, ip, request.headers["user-agent"]);
    return reply.status(201).send({ user: publicUser(authed) });
  });

  app.post("/auth/login", async (request, reply) => {
    const ip = request.ip || "unknown";
    const rl = checkRateLimit(`ip:${ip}:login`, 10, 60);
    if (!rl.allowed) throw new ApiError("rate_limit_exceeded", "Too many sign-in attempts. Try again shortly.");
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
    const db = await getDb();
    const rows = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
    const user = rows[0];
    const ok = user ? await verifyPassword(body.password, user.passwordHash) : false;
    if (!user || !ok) throw new ApiError("unauthenticated", "Invalid email or password.");
    if (user.status === "suspended") throw new ApiError("forbidden", "This account has been suspended. Contact support.");
    const authed = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
    await createSession(authed, reply, ip, request.headers["user-agent"]);
    await db.insert(auditLogs).values({ actorUserId: user.id, action: "auth.login", targetType: "user", targetId: user.id, ip });
    return reply.send({ user: publicUser(authed) });
  });

  app.post("/auth/logout", async (request, reply) => {
    await destroySession(request, reply);
    return reply.send({ ok: true });
  });

  app.get("/auth/me", async (request, reply) => {
    const user = await resolveSessionUser(request);
    if (!user) return reply.status(401).send({ user: null });
    const db = await getDb();
    const sub = await db
      .select({ plan: plans })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, user.id));
    const activeSub = sub.find((s) => s.plan) ?? null;
    const astra = await getActiveAstra(user.id);
    return reply.send({
      user: publicUser(user),
      balancePaise: await getBalance(user.id),
      plan: activeSub ? { slug: activeSub.plan.slug, name: activeSub.plan.name, pricePaise: activeSub.plan.pricePaise, freeRpm: activeSub.plan.freeRpm, queuePriority: activeSub.plan.queuePriority } : null,
      astra: astra ? { active: true, expiresAt: astra.expiresAt.toISOString() } : { active: false, expiresAt: null },
    });
  });

  app.patch("/auth/profile", async (request, reply) => {
    const user = await requireUser(request);
    const body = z.object({ name: z.string().max(80).optional() }).parse(request.body);
    const db = await getDb();
    await db.update(users).set({ name: body.name ?? "", updatedAt: new Date() }).where(eq(users.id, user.id));
    return reply.send({ ok: true });
  });

  app.post("/auth/password", async (request, reply) => {
    const user = await requireUser(request);
    const body = z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }).parse(request.body);
    if (!isStrongPassword(body.newPassword)) {
      throw new ApiError("invalid_request", "New password must be at least 8 characters and include a letter and a number.");
    }
    const db = await getDb();
    const rows = await db.select().from(users).where(eq(users.id, user.id));
    const ok = await verifyPassword(body.currentPassword, rows[0]!.passwordHash);
    if (!ok) throw new ApiError("unauthenticated", "Current password is incorrect.");
    await db.update(users).set({ passwordHash: await hashPassword(body.newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    await db.insert(auditLogs).values({ actorUserId: user.id, action: "auth.password_changed", targetType: "user", targetId: user.id });
    return reply.send({ ok: true });
  });
}