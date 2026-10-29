import { buildApp } from "./app.js";
import { env } from "@pro/shared";
import { runMigrations } from "@pro/database";

try {
  await runMigrations();
  const app = await buildApp();
  await app.listen({ port: env.apiPort, host: "0.0.0.0" });
  console.log(`[prorouter] API listening on http://localhost:${env.apiPort}`);
} catch (err) {
  console.error("[prorouter] Failed to start API:", err);
  process.exit(1);
}