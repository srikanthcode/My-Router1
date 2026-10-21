import { desc, eq } from "drizzle-orm";
import { getDb, closeDb, requestAttempts, requests, providers, models } from "@uno/database";

const db = await getDb();
const rows = await db
  .select({ req: requests, model: models.slug })
  .from(requests)
  .leftJoin(models, eq(models.id, requests.modelId))
  .orderBy(desc(requests.createdAt))
  .limit(12);

const provs = await db.select().from(providers);
const byId = new Map(provs.map((p) => [p.id, p.slug]));

for (const r of rows.reverse()) {
  const attempts = await db.select().from(requestAttempts).where(eq(requestAttempts.requestId, r.req.id));
  const summary = attempts.map((a) => `${a.status}${a.httpStatus ? "/" + a.httpStatus : ""}${a.error ? "(" + a.error.slice(0, 40) + ")" : ""}`).join(" -> ");
  console.log(`${String(r.model ?? "?").padEnd(24)} ${r.req.status.padEnd(8)} provider=${byId.get(r.req.providerId ?? "") ?? "-"}  ${summary}`);
}
await closeDb();
