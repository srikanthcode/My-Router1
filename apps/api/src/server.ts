import { buildApp } from "./app.js";
import { env } from "@pro/shared";
import { runMigrations } from "@pro/database";

try {
  const app = await buildApp();
  await app.listen({ port: env.apiPort, host: "0.0.0.0" });
  console.log(`[prorouter] API listening on http://0.0.0.0:${env.apiPort}`);

  // Run migrations without blocking initial port detection
  runMigrations().then(() => {
    console.log("[prorouter] Migrations completed successfully.");
  }).catch((err) => {
    console.warn("[prorouter] Migrations non-fatal warning:", err?.message || err);
  });
} catch (err) {
  console.error("[prorouter] Failed to start API:", err);
  process.exit(1);
}