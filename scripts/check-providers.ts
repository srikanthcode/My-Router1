import { getDb, closeDb, models, providers, modelProviders, providerCredentials } from "@pro/database";

const db = await getDb();
const provs = await db.select().from(providers);
console.log("providers (gateway/fallback):");
for (const p of provs.filter((p) => ["uno-gateway", "freemodels"].includes(p.slug))) {
  console.log("  ", p.slug.padEnd(14), p.status.padEnd(8), "priority", String(p.priority).padEnd(4), p.endpointUrl);
}
const creds = await db.select().from(providerCredentials);
console.log("stored encrypted credentials:", creds.length, creds.map((c) => c.keyName).join(", "));
const links = await db.select().from(modelProviders);
console.log("model-provider links:", links.length, "(expect 17 = 8 models x2 + jev x1)");
const m = await db.select().from(models);
console.log("models:", m.length);
await closeDb();
