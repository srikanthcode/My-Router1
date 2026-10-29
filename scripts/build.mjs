import esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "../dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log("[build] Bundling API Gateway with esbuild...");
await esbuild.build({
  entryPoints: [path.resolve(here, "../apps/api/src/server.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: path.resolve(distDir, "server.mjs"),
  external: [
    "@electric-sql/pglite",
    "@fastify/cookie",
    "@fastify/cors",
    "fastify",
    "pg",
    "mongodb",
    "drizzle-orm",
    "zod",
  ],
});
console.log("[build] Built dist/server.mjs successfully!");
