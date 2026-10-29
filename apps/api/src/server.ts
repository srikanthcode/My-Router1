import { buildApp } from "./app.js";
import { env } from "@pro/shared";
import { runMigrations, seedDatabase } from "@pro/database";

try {
  const app = await buildApp();
  await app.listen({ port: env.apiPort, host: "0.0.0.0" });
  console.log(`[prorouter] API listening on http://0.0.0.0:${env.apiPort}`);

  // Run migrations and seed database in background without blocking port detection
  runMigrations().then(async () => {
    console.log("[prorouter] Migrations completed successfully.");
    try {
      await seedDatabase(false);
      console.log("[prorouter] Catalog seeded successfully.");
    } catch (e: any) {
      console.warn("[prorouter] Seed notice:", e?.message || e);
    }
  }).catch((err) => {
    console.warn("[prorouter] Migrations non-fatal warning:", err?.message || err);
  });
} catch (err) {
  console.error("[prorouter] Failed to start API:", err);
  process.exit(1);
}
