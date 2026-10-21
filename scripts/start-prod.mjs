/**
 * Production launcher: runs the API and the web app in one container.
 *
 * The web app rewrites /v1/* and /api/* to the API on the same host, so both
 * processes must be alive for https://<domain>/v1 to serve requests.
 * Render provides $PORT for the public listener; the API stays on loopback.
 *
 * The rewrite destination is baked into the Next.js build, so the API must
 * listen on exactly that port. We read it back from the build manifest rather
 * than assuming, so the two can never drift apart.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Port the built web app will proxy /v1 and /api to. */
function bakedApiPort() {
  const manifest = path.resolve("apps/web/.next/routes-manifest.json");
  try {
    const data = JSON.parse(readFileSync(manifest, "utf8"));
    for (const rule of data.rewrites?.afterFiles ?? []) {
      if (!rule.source.startsWith("/v1/")) continue;
      const port = new URL(rule.destination).port;
      if (port) return port;
    }
  } catch {
    /* no build manifest — fall back to the default */
  }
  return null;
}

const apiPort = bakedApiPort() || process.env.API_PORT || "4000";
const children = [];
let stopping = false;

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));

function run(name, args, { cwd, env, fatal } = {}) {
  const child = spawn("npm", args, {
    stdio: "inherit",
    cwd,
    // Windows cannot spawn npm.cmd directly (EINVAL) — it needs a shell.
    shell: true,
    env: { ...process.env, ...env },
  });
  child.on("exit", (code) => {
    console.error(`[prorouter] ${name} exited with code ${code}`);
    // A dead API only breaks /v1 and /api; the site itself should stay up so
    // the failure is visible and fixable. A dead web process is fatal.
    if (fatal) shutdown(code ?? 1);
  });
  children.push(child);
}

console.log(`[prorouter] API will listen on port ${apiPort}`);

run("api", ["run", "start", "-w", "@uno/api"], {
  env: { API_PORT: apiPort },
  fatal: false,
});

run("web", ["run", "start", "-w", "@uno/web"], {
  env: {
    PORT: process.env.PORT || "3000",
    PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL || "https://prorouter.in",
  },
  fatal: true,
});
