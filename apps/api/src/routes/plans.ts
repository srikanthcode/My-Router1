import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb, plans } from "@uno/database";
import { formatMoney } from "@uno/shared";

/**
 * Public plan catalogue (§23) — powers the marketing pricing page and the
 * landing-page plan strip. Only active plans are exposed, and no admin-only
 * fields leak out. Pricing stays admin-configurable (§20).
 */
export async function planRoutes(app: FastifyInstance) {
  app.get("/plans", async () => {
    const db = await getDb();
    const rows = await db.select().from(plans).where(eq(plans.active, true)).orderBy(plans.sortOrder);
    return {
      items: rows.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        pricePaise: p.pricePaise,
        priceFormatted: formatMoney(p.pricePaise),
        currency: p.currency,
        period: p.period,
        freeRpm: p.freeRpm,
        freeRph: p.freeRph,
        freeRpd: p.freeRpd,
        concurrency: p.concurrency,
        queuePriority: p.queuePriority,
        features: p.features,
        sortOrder: p.sortOrder,
      })),
    };
  });
}
