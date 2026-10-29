import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { apiKeys, getDb, sessions, users, astraEntitlements } from "@pro/database";
import { generateSessionToken, hashToken, ApiError, env } from "@pro/shared";

const SESSION_COOKIE = "uno_session";

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin" | "support";
  status: "active" | "suspended" | "pending";
}

export async function createSession(user: AuthedUser, reply: FastifyReply, ip?: string, userAgent?: string) {
  const { token, hash } = generateSessionToken();
  const db = await getDb();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 3600_000);
  await db.insert(sessions).values({ userId: user.id, tokenHash: hash, expiresAt, ip, userAgent });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export async function resolveSessionUser(request: FastifyRequest): Promise<AuthedUser | null> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())));
  const row = rows[0];
  if (!row) return null;
  if (row.user.status === "suspended") return null;
  if (Date.now() - row.session.lastSeenAt.getTime() > 60_000) {
    void db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.session.id));
  }
  return {
    id: row.user.id,
    email: row.user.email,
    name: row.user.name,
    role: row.user.role,
    status: row.user.status,
  };
}

export interface ApiKeyAuth {
  user: AuthedUser;
  apiKey: typeof apiKeys.$inferSelect;
}

/** Authenticate `Authorization: Bearer pro_sk_live_…` (§15). */
export async function resolveApiKey(request: FastifyRequest): Promise<ApiKeyAuth | null> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const raw = header.slice(7).trim();
  if (!raw) return null;
  const db = await getDb();
  const rows = await db
    .select({ key: apiKeys, user: users })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(eq(apiKeys.keyHash, hashToken(raw)));
  const row = rows[0];
  if (!row) throw new ApiError("invalid_api_key", "Invalid API key provided.");
  if (row.key.revokedAt) throw new ApiError("invalid_api_key", "This API key has been revoked.");
  if (row.key.expiresAt && row.key.expiresAt < new Date()) throw new ApiError("invalid_api_key", "This API key has expired.");
  if (row.user.status === "suspended") throw new ApiError("forbidden", "Account suspended. Contact support.");
  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
      status: row.user.status,
    },
    apiKey: row.key,
  };
}

/** Require a signed-in user (session cookie or API key). */
export async function requireUser(request: FastifyRequest): Promise<AuthedUser> {
  const fromKey = await resolveApiKey(request).catch(() => null);
  if (fromKey) return fromKey.user;
  const user = await resolveSessionUser(request);
  if (!user) throw new ApiError("unauthenticated", "You must be signed in.");
  return user;
}

export async function requireRole(request: FastifyRequest, roles: Array<"admin" | "support">): Promise<AuthedUser> {
  const user = await requireUser(request);
  if (!roles.includes(user.role as "admin" | "support")) {
    throw new ApiError("forbidden", "Administrator access required.");
  }
  return user;
}

/** Active (non-expired) GPT Astra entitlement, if any (§49). */
export async function getActiveAstra(userId: string): Promise<{ expiresAt: Date } | null> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(astraEntitlements)
    .where(and(eq(astraEntitlements.userId, userId), eq(astraEntitlements.status, "active"), gt(astraEntitlements.expiresAt, new Date())));
  const row = rows[0];
  return row ? { expiresAt: row.expiresAt } : null;
}

export { SESSION_COOKIE };