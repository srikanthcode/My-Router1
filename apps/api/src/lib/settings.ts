import { getDb, systemSettings, featureFlags } from "@pro/database";

type SettingsMap = Map<string, unknown>;
type FlagsMap = Map<string, boolean>;

let settings: SettingsMap | null = null;
let flags: FlagsMap | null = null;
let loadedAt = 0;
const TTL_MS = 15_000;

export async function loadSettings(force = false): Promise<SettingsMap> {
  if (!force && settings && Date.now() - loadedAt < TTL_MS) return settings;
  const db = await getDb();
  const rows = await db.select().from(systemSettings);
  settings = new Map(rows.map((r) => [r.key, r.value]));
  const flagRows = await db.select().from(featureFlags);
  flags = new Map(flagRows.map((r) => [r.key, r.enabled]));
  loadedAt = Date.now();
  return settings;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await loadSettings();
  return (s.has(key) ? s.get(key) : fallback) as T;
}

export async function getNumber(key: string, fallback: number): Promise<number> {
  const v = await getSetting<unknown>(key, fallback);
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export async function getFlag(key: string, fallback = false): Promise<boolean> {
  await loadSettings();
  return flags?.has(key) ? flags.get(key)! : fallback;
}