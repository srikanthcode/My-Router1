import { eq } from "drizzle-orm";
import { getDb, closeDb, modelProviders, providerCredentials, providers } from "@uno/database";

const db = await getDb();
const stale = await db.select().from(providers).where(eq(providers.slug, "uno-gateway"));
for (const p of stale) {
  await db.delete(modelProviders).where(eq(modelProviders.providerId, p.id));
  await db.delete(providerCredentials).where(eq(providerCredentials.providerId, p.id));
  await db.delete(providers).where(eq(providers.id, p.id));
  console.log("removed stale provider:", p.slug);
}
const remaining = await db.select().from(providers);
console.log("providers now:", remaining.map((p) => p.slug).join(", "));
const links = await db.select().from(modelProviders);
console.log("model-provider links:", links.length);
await closeDb();
