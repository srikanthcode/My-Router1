import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzleNode, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "./schema/index.js";
import { env } from "@uno/shared";

export * from "./schema/index.js";

// ── MongoDB (primary store when MONGODB_URI is set) ───────────────────
export {
  mongoConfigured,
  getMongoDb,
  pingMongo,
  closeMongo,
  withMongoTx,
  resetMongoFailure,
  getLastError as getMongoLastError,
} from "./mongo/client.js";
export { ensureIndexes } from "./mongo/indexes.js";
export { getCollections, type Collections } from "./mongo/collections.js";
export * from "./mongo/types.js";

// ── DataStore contract (dual-backend: SQL fallback + MongoDB primary) ──
export type { DataStore } from "./store/types.js";

const moduleDir = fileURLToPath(new URL("./", import.meta.url));
/** Monorepo root: packages/database/src → ../../../ */
export const repoRoot = path.resolve(moduleDir, "../../..");

export type Database = PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>;

let db: Database | null = null;
let pglite: PGlite | null = null;
let pool: Pool | null = null;

/**
 * Returns the singleton database handle.
 * - DATABASE_URL set   → real PostgreSQL via node-postgres (production)
 * - DATABASE_URL empty → embedded PGlite (zero-install development, §64)
 */
export async function getDb(): Promise<Database> {
  if (db) return db;
  if (env.databaseUrl) {
    pool = new Pool({ connectionString: env.databaseUrl, max: 10 });
    db = drizzleNode(pool, { schema });
  } else {
    const dir = path.isAbsolute(env.databaseDir) ? env.databaseDir : path.join(repoRoot, env.databaseDir);
    fs.mkdirSync(dir, { recursive: true });
    pglite = new PGlite(dir);
    db = drizzlePglite(pglite, { schema });
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (pglite) await pglite.close();
  if (pool) await pool.end();
  db = null;
  pglite = null;
  pool = null;
}

/** Run pending SQL migrations from packages/database/migrations. */
export async function runMigrations(): Promise<void> {
  const database = await getDb();
  const migrationsFolder = path.join(repoRoot, "packages", "database", "migrations");
  if (env.databaseUrl) {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(database as NodePgDatabase<typeof schema>, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(database as PgliteDatabase<typeof schema>, { migrationsFolder });
  }
}

export { schema };