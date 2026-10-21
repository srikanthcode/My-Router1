/**
 * MongoDB connection — primary data store when MONGODB_URI is configured.
 *
 * Network notes (observed on the dev machine, kept for production safety):
 * - `family: 4` forces the IPv4 path. Some NAT64/DNS64 networks hand the
 *   driver a synthetic IPv6 address that Atlas's TLS terminator rejects.
 * - When the environment's c-ares DNS cannot answer Atlas SRV queries, use a
 *   direct `mongodb://host:27017,...?tls=true&replicaSet=...` URI in
 *   MONGODB_URI instead of `mongodb+srv://`.
 */

import { MongoClient, type Db, type ClientSession } from "mongodb";
import { env } from "@uno/shared";

let client: MongoClient | null = null;
let db: Db | null = null;
let connecting: Promise<Db> | null = null;
/** Cached failure so we do not retry the full handshake on every request. */
let lastError: Error | null = null;
let disabled = false;

export function mongoConfigured(): boolean {
  return Boolean(env.mongoUri) && !disabled;
}

/** Connect lazily; concurrent callers share one in-flight handshake. */
export async function getMongoDb(): Promise<Db> {
  if (db) return db;
  if (disabled) throw lastError ?? new Error("MongoDB disabled after earlier failure");
  if (connecting) return connecting;

  connecting = (async () => {
    const c = new MongoClient(env.mongoUri, {
      family: 4,
      retryWrites: true,
      serverSelectionTimeoutMS: 15_000,
      maxPoolSize: 10,
      minPoolSize: 0,
      // TLS is implicit for mongodb+srv; explicit for direct mongodb:// URIs.
      ...(env.mongoUri.startsWith("mongodb+srv://") ? {} : { tls: true }),
    });
    await c.connect();
    await c.db("admin").command({ ping: 1 });
    client = c;
    db = c.db(env.mongoDb);
    lastError = null;
    return db;
  })();

  try {
    return await connecting;
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    throw lastError;
  } finally {
    connecting = null;
  }
}

/**
 * Boot probe: try to connect once. Returns true when Mongo is usable.
 * On failure the process continues on the SQL fallback (PGlite/Postgres) —
 * Mongo is the primary store, not a hard dependency.
 */
export async function pingMongo(): Promise<boolean> {
  if (!env.mongoUri) return false;
  try {
    await getMongoDb();
    return true;
  } catch (err) {
    lastError = err instanceof Error ? err : new Error(String(err));
    console.warn(`[prorouter] MongoDB unavailable, falling back to embedded SQL: ${lastError.message}`);
    disabled = true;
    return false;
  }
}

/** Re-enable after a failure (used by the connection retry helper / tests). */
export function resetMongoFailure(): void {
  disabled = false;
  lastError = null;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    connecting = null;
  }
}

/** Run `fn` inside a MongoDB multi-document transaction (requires replica set). */
export async function withMongoTx<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const database = await getMongoDb();
  // Client sessions come from the MongoClient, not the Db handle.
  const session = (database as unknown as { client: MongoClient }).client.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

export function getLastError(): Error | null {
  return lastError;
}
