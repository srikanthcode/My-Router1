import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { apiKeys, auditLogs, getDb } from "@pro/database";
import { ApiError, generateApiKey } from "@pro/shared";
import { requireUser } from "../lib/auth.js";
import { getNumber } from "../lib/settings.js";

const createSchema = z.object({
  name: z.string().min(1).max(64),
  expiresInDays: z.number().int().min(1).max(3650).nullable().optional(),
  spendingLimitPaise: z.number().int().min(0).nullable().optional(),
  allowedModels: z.array(z.string()).max(50).nullable().optional(),
});

function keyDto(k: typeof apiKeys.$inferSelect) {
  return {
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt.toISOString(),
    expiresAt: k.expiresAt?.toISOString() ?? null,
    revokedAt: k.revokedAt?.toISOString() ?? null,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    requestCount: k.requestCount,
    spendPaise: k.spendPaise,
    spendingLimitPaise: k.spendingLimitPaise,
    allowedModels: k.allowedModels,
  };
}

export async function keyRoutes(app: FastifyInstance) {
  app.get("/keys", async (request) => {
    const user = await requireUser(request);
    const db = await getDb();
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.userId, user.id)).orderBy(desc(apiKeys.createdAt));
    return { items: rows.map(keyDto) };
  });

  app.post("/keys", async (request, reply) => {
    const user = await requireUser(request);
    const body = createSchema.parse(request.body ?? {});
    const db = await getDb();
    const existing = await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.userId, user.id));
    const maxKeys = await getNumber("MAX_API_KEYS", 20);
    if (existing.length >= maxKeys) throw new ApiError("invalid_request", `You have reached the maximum of ${maxKeys} API keys. Revoke one to continue.`);
    const gen = generateApiKey();
    const expiresAt = body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86400_000) : null;
    const rows = await db.insert(apiKeys).values({ userId: user.id, name: body.name, prefix: gen.prefix, keyHash: gen.hash, expiresAt, spendingLimitPaise: body.spendingLimitPaise ?? null, allowedModels: body.allowedModels ?? null }).returning();
    await db.insert(auditLogs).values({ actorUserId: user.id, action: "apikey.create", targetType: "api_key", targetId: rows[0]!.id, metadata: { name: body.name } });
    return reply.status(201).send({ key: keyDto(rows[0]!), secret: gen.key });
  });

  app.post("/keys/:id/rotate", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const db = await getDb();
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    const row = rows[0];
    if (!row || row.userId !== user.id) throw new ApiError("not_found", "API key not found.");
    const gen = generateApiKey();
    const updated = await db.update(apiKeys).set({ keyHash: gen.hash, prefix: gen.prefix, revokedAt: null }).where(eq(apiKeys.id, id)).returning();
    await db.insert(auditLogs).values({ actorUserId: user.id, action: "apikey.rotate", targetType: "api_key", targetId: id });
    return reply.send({ key: keyDto(updated[0]!), secret: gen.key });
  });

  app.delete("/keys/:id", async (request, reply) => {
    const user = await requireUser(request);
    const { id } = request.params as { id: string };
    const db = await getDb();
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    const row = rows[0];
    if (!row || row.userId !== user.id) throw new ApiError("not_found", "API key not found.");
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
    await db.insert(auditLogs).values({ actorUserId: user.id, action: "apikey.revoke", targetType: "api_key", targetId: id });
    return reply.send({ ok: true });
  });
}