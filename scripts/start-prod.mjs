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

console.log("[prorouter-backend] Building fresh dist/server.mjs bundle...");
const buildScript = path.resolve(here, "build.mjs");
const buildRes = spawnSync("node", [buildScript], { stdio: "inherit" });
if (buildRes.status !== 0) {
  console.error("[prorouter-backend] Build failed with exit code", buildRes.status);
}

console.log(`[prorouter-backend] Starting API Gateway via dist/server.mjs...`);
await import(pathToFileURL(distFile).href);
