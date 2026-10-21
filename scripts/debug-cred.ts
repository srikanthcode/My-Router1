import { eq } from "drizzle-orm";
import { decryptSecret, env } from "@uno/shared";
import { getDb, closeDb, providerCredentials, providers } from "@uno/database";

const db = await getDb();
console.log("env.proRouterGatewayApiKey set:", !!env.proRouterGatewayApiKey, "len:", env.proRouterGatewayApiKey.length);
console.log("process.env PROVIDER_PROROUTER_GATEWAY_API_KEY set:", !!process.env.PROVIDER_PROROUTER_GATEWAY_API_KEY);
console.log("encryption material:", env.encryptionKey ? "ENCRYPTION_KEY" : env.authSecret ? "AUTH_SECRET" : "none");

const rows = await db.select({ cred: providerCredentials, prov: providers }).from(providerCredentials).innerJoin(providers, eq(providers.id, providerCredentials.providerId));
for (const r of rows) {
  let dec = "DECRYPT FAILED";
  try {
    dec = decryptSecret(r.cred.ciphertext, r.cred.iv, r.cred.authTag ?? "");
  } catch (e) {
    dec = "ERR: " + (e as Error).message;
  }
  console.log(r.prov.slug.padEnd(20), "cred len:", dec.length, "prefix:", dec.slice(0, 12) + "…", "active:", r.cred.active);
}
await closeDb();
