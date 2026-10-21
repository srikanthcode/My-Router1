/**
 * Production launcher: runs the API and the web app in one container.
 *
 * The web app rewrites /v1/* and /api/* to the API on the same host, so both
 * processes must be alive for https://<domain>/v1 to serve requests.
 * Render provides $PORT for the public listener; the API stays on API_PORT
 * (default 4000) and is reached over loopback.
 */
import { spawn } from "node:child_process";

const apiPort = process.env.API_PORT || "4000";
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

function run(name, args, { cwd, env } = {}) {
  const child = spawn("npm", args, {
    stdio: "inherit",
    cwd,
    // Windows cannot spawn npm.cmd directly (EINVAL) — it needs a shell.
    shell: true,
    env: { ...process.env, ...env },
  });
  child.on("exit", (code) => {
    console.error(`[prorouter] ${name} exited with code ${code}`);
    shutdown(code ?? 1);
  });
  children.push(child);
}

run("api", ["run", "start", "-w", "@uno/api"], { env: { API_PORT: apiPort } });
run("web", ["run", "start", "-w", "@uno/web"], {
  env: {
    PORT: process.env.PORT || "3000",
    // Must match the API port so the rewrite destination resolves.
    API_BASE_URL: `http://localhost:${apiPort}`,
    PUBLIC_API_BASE_URL: process.env.PUBLIC_API_BASE_URL || "https://prorouter.in",
  },
});
