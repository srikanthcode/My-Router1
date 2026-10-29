import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ApiError } from "@pro/shared";
import { getProviderDetail, getModelDetail, listModels, listProviders } from "../lib/catalog.js";

const listQuery = z.object({
  q: z.string().optional(),
  provider: z.string().optional(),
  free: z.string().optional(),
  paid: z.string().optional(),
  category: z.enum(["coding", "reasoning", "vision", "image", "audio", "tools"]).optional(),
  min_context: z.coerce.number().optional(),
  sort: z.enum(["rank", "popularity", "rating", "newest", "price_asc", "price_desc", "latency"]).optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
});

function truthy(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  return v === "true" || v === "1";
}

export async function catalogRoutes(app: FastifyInstance) {
  app.get("/models", async (request) => {
    const q = listQuery.parse(request.query);
    return listModels({ q: q.q, provider: q.provider, free: truthy(q.free), paid: truthy(q.paid), category: q.category, minContext: q.min_context, sort: q.sort, limit: q.limit, offset: q.offset });
  });

  app.get("/models/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const detail = await getModelDetail(slug);
    if (!detail) throw new ApiError("model_not_found", `Model '${slug}' not found.`);
    return reply.send(detail);
  });

  app.get("/providers", async () => listProviders());

  app.get("/providers/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const detail = await getProviderDetail(slug);
    if (!detail) throw new ApiError("not_found", `Provider '${slug}' not found.`);
    return reply.send(detail);
  });
}