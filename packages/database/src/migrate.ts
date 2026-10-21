import { runMigrations, closeDb, repoRoot } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const migrationsFolder = path.join(repoRoot, "packages", "database", "migrations");

if (!fs.existsSync(migrationsFolder) || fs.readdirSync(migrationsFolder).length === 0) {
  console.error(
    `[prorouter] No migrations found in ${migrationsFolder}\n` +
      `Run "npm run db:generate" first to generate them from the schema.`,
  );
  process.exit(1);
}

console.log("[prorouter] Running migrations…");
await runMigrations();
console.log("[prorouter] Migrations complete.");
await closeDb();