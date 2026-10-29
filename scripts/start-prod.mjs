/**
 * Production launcher for ProRouter Backend API Gateway.
 * Render/Railway/Koyeb provides $PORT for the public listener.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const distFile = path.resolve(here, "../dist/server.mjs");

if (!fs.existsSync(distFile)) {
  console.log("[prorouter-backend] dist/server.mjs not found, building...");
  const buildScript = path.resolve(here, "build.mjs");
  spawnSync("node", [buildScript], { stdio: "inherit" });
}

console.log(`[prorouter-backend] Starting API Gateway via dist/server.mjs...`);
await import(pathToFileURL(distFile).href);
