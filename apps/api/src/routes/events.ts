import type { FastifyInstance, FastifyRequest } from "fastify";
import { eventHub } from "../lib/events.js";
import { resolveApiKey, resolveSessionUser } from "../lib/auth.js";
import { getAvailableBalance, getBalance } from "../lib/wallet.js";
import { formatMoney, ApiError } from "@pro/shared";

async function authenticateEventStream(request: FastifyRequest) {
  // 1. Try session cookie first (Browser EventSource)
  const sessionUser = await resolveSessionUser(request);
  if (sessionUser) return sessionUser;

  // 2. Try Bearer API key
  const keyAuth = await resolveApiKey(request);
  if (keyAuth) return keyAuth.user;

  // 3. Try query token parameter for EventSource if headers not supported
  const query = request.query as { token?: string };
  if (query.token) {
    const bearerReq = {
      ...request,
      headers: { ...request.headers, authorization: `Bearer ${query.token}` },
    } as FastifyRequest;
    try {
      const qAuth = await resolveApiKey(bearerReq);
      if (qAuth) return qAuth.user;
    } catch {
      // Fall through to unauthorized
    }
  }

  throw new ApiError("unauthenticated", "Authentication required to subscribe to dashboard events.");
}

export async function eventRoutes(app: FastifyInstance) {
  const handler = async (request: FastifyRequest, reply: any) => {
    const user = await authenticateEventStream(request);

    // Set SSE response headers
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders();

    const lastEventId = request.headers["last-event-id"] as string | undefined;
    eventHub.subscribe(user.id, reply, lastEventId);

    // Immediately push initial wallet snapshot
    const [balancePaise, availablePaise] = await Promise.all([
      getBalance(user.id),
      getAvailableBalance(user.id),
    ]);

    reply.raw.write(
      `event: wallet.balance.updated\ndata: ${JSON.stringify({
        balancePaise,
        availablePaise,
        balanceFormatted: formatMoney(balancePaise),
        currency: "INR",
      })}\n\n`
    );

    // Keep the stream alive, Fastify shouldn't auto-close
    await new Promise(() => {});
  };

  app.get("/dashboard/events", handler);
  app.get("/v1/dashboard/events", handler);
}
