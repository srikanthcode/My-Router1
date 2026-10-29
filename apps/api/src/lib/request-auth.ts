import type { FastifyRequest } from "fastify";
import { apiKeys } from "@pro/database";
import { ApiError } from "@pro/shared";
import { resolveApiKey, resolveSessionUser, type AuthedUser } from "./auth.js";
import { checkRateLimit } from "./ratelimit.js";

export interface AuthContext {
  user: AuthedUser;
  apiKey: (typeof apiKeys.$inferSelect) | null;
}

export function authenticateRequest(request: FastifyRequest): Promise<AuthContext>;
export function authenticateRequest(request: FastifyRequest, opts: { optional?: false }): Promise<AuthContext>;
export function authenticateRequest(request: FastifyRequest, opts: { optional: true }): Promise<AuthContext | null>;
export async function authenticateRequest(
  request: FastifyRequest,
  opts: { optional?: boolean } = {},
): Promise<AuthContext | null> {
  const fromKey = await resolveApiKey(request);
  if (fromKey) return { user: fromKey.user, apiKey: fromKey.apiKey };
  const session = await resolveSessionUser(request);
  if (session) return { user: session, apiKey: null };
  if (opts.optional) return null;
  const hasBearer = !!request.headers.authorization;
  throw new ApiError(
    hasBearer ? "invalid_api_key" : "unauthenticated",
    hasBearer ? "Invalid API key provided." : "Authentication required. Use an API key or sign in.",
  );
}

export function enforceRateLimits(request: FastifyRequest, auth: AuthContext) {
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
