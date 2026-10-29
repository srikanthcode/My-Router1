import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import { ZodError } from "zod";
import { ApiError, env, isApiError } from "@pro/shared";
import { authRoutes } from "./routes/auth.js";
import { keyRoutes } from "./routes/keys.js";
import { catalogRoutes } from "./routes/catalog.js";
import { chatRoutes } from "./routes/chat.js";
import { walletRoutes } from "./routes/wallet.js";
import { promotionRoutes } from "./routes/promotions.js";
import { adminRoutes } from "./routes/admin.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { planRoutes } from "./routes/plans.js";
import { usageRoutes } from "./routes/usage.js";
import { randomBytes } from "node:crypto";

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = [
    env.webBaseUrl,
    env.apiBaseUrl,
    env.publicApiBaseUrl,
    "https://prorouter.in",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    "http://localhost:4000",
    "http://127.0.0.1:4000",
    "http://localhost:4100",
    "http://127.0.0.1:4100",
  ];
  return allowed.includes(origin);
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.logLevel,
    },
    trustProxy: true,
    bodyLimit: 4 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
    exposedHeaders: ["x-request-id", "retry-after", "x-prorouter-usage-source"],
  });

  await app.register(cookie, { secret: env.authSecret });

  // Keep the raw body for payment webhook signature verification (§46)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as { rawBody?: string }).rawBody = typeof body === "string" ? body : body.toString("utf8");
    try {
      done(null, JSON.parse((req as { rawBody?: string }).rawBody!));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Every request gets an id (§52)
  app.addHook("onRequest", async (request, reply) => {
    const incoming = request.headers["x-request-id"];
    const rid = typeof incoming === "string" && /^[\w-]{8,64}$/.test(incoming) ? incoming : `req_${randomBytes(12).toString("hex")}`;
    (request as { requestId?: string }).requestId = rid;
    reply.header("x-request-id", rid);
  });

  // CSRF hardening for cookie-authenticated mutations: enforce Origin (§45)
  app.addHook("onRequest", async (request) => {
    if (request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS") return;
    if (request.headers.authorization) return; // API-key requests are not cookie CSRF targets
    const origin = request.headers.origin;
    if (!origin) return; // non-browser clients
    if (!isAllowedOrigin(origin)) {
      throw new ApiError("forbidden", "Cross-origin request blocked.");
    }
  });

  app.setErrorHandler((err, request, reply) => {
    const rid = (request as { requestId?: string }).requestId ?? "unknown";
    if (err instanceof ZodError) {
      return reply.status(400).send({
        error: { code: "invalid_request", message: "Request validation failed.", request_id: rid, details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      });
    }
    if (isApiError(err)) {
      if (err.retryAfter !== undefined) reply.header("retry-after", String(err.retryAfter));
      request.log.warn({ code: err.code, status: err.status, rid }, "api error");
      return reply.status(err.status).send(err.toBody(rid));
    }
    const fastifyErr = err as { statusCode?: number; code?: string };
    if (fastifyErr.statusCode === 413) {
      return reply.status(413).send(new ApiError("payload_too_large", "Request body too large.").toBody(rid));
    }
    if (fastifyErr.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
      return reply.status(400).send(new ApiError("invalid_request", "Content-Type must be application/json.").toBody(rid));
    }
    request.log.error({ err, rid }, "unhandled error");
    return reply.status(500).send(new ApiError("internal_error", "An unexpected error occurred.").toBody(rid));
  });

  app.setNotFoundHandler((request, reply) => {
    const rid = (request as { requestId?: string }).requestId ?? "unknown";
    return reply.status(404).send({ error: { code: "not_found", message: `Route ${request.method} ${request.url} not found.`, request_id: rid } });
  });

  // ── Health / status ───────────────────────────────────────────────
  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  // ── API routes ────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(keyRoutes);
  await app.register(catalogRoutes);
  await app.register(planRoutes);
  await app.register(chatRoutes);
  await app.register(usageRoutes);
  await app.register(walletRoutes);
  await app.register(promotionRoutes);
  await app.register(adminRoutes);
  await app.register(dashboardRoutes);

  return app;
}