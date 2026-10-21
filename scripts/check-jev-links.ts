import { eq } from "drizzle-orm";
import { getDb, closeDb, modelProviders, models, providers } from "@uno/database";

const db = await getDb();
const rows = await db
  .select({ link: modelProviders, model: models.slug, prov: providers.slug, provStatus: providers.status })
  .from(modelProviders)
  .innerJoin(models, eq(models.id, modelProviders.modelId))
  .innerJoin(providers, eq(providers.id, modelProviders.providerId))
  .where(eq(models.slug, "jev-1.13"));
for (const r of rows) {
  console.log(r.model, "->", r.prov, "upstream=" + r.link.providerModelId, "priority=" + r.link.priority, "linkStatus=" + r.link.status, "provStatus=" + r.provStatus);
}
await closeDb();
