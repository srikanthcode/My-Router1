import { closeDb, getDb, models } from "@pro/database";

const db = await getDb();

const before = await db.select({ id: models.id }).from(models);
await db.delete(models);
const after = await db.select({ id: models.id }).from(models);

console.log(`[uno] models before: ${before.length}`);
console.log(`[uno] models after:  ${after.length}`);

await closeDb();
