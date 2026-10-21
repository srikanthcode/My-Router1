/**
 * Environment configuration. Secrets live here; business configuration lives
 * in the system_settings table and is editable from Admin → System.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load the repo-root `.env` once, before any value below is read. The file is
 * gitignored and is the only place upstream credentials are configured; they
 * stay in the API process and are never sent to the browser.
 */
(function loadRootEnv() {
  try {
    const here = fileURLToPath(new URL(".", import.meta.url)); // packages/shared/src/
    const root = path.resolve(here, "../../..");
    const candidates = [path.join(root, ".env"), path.resolve(process.cwd(), ".env")];
    for (const file of candidates) {
      if (fs.existsSync(file)) {
        process.loadEnvFile(file);
        return;
      }
    }
  } catch {
    /* .env is optional — process env still applies */
  }
})();

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const v = Number(raw);
  return Number.isFinite(v) ? v : fallback;
}

function str(name: string, fallback = ""): string {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : raw;
}

export const env = {
  nodeEnv: str("NODE_ENV", "development"),
  isProd: str("NODE_ENV", "development") === "production",
  apiPort: num("API_PORT", 4000),
  webPort: num("WEB_PORT", 3000),
  apiBaseUrl: str("API_BASE_URL", "http://localhost:4000"),
  webBaseUrl: str("WEB_BASE_URL", "http://localhost:3000"),
  publicApiBaseUrl: str("PUBLIC_API_BASE_URL", "http://localhost:4000"),

  databaseUrl: str("DATABASE_URL"),
  databaseDir: str("DATABASE_DIR", ".data/db"),
  redisUrl: str("REDIS_URL"),

  authSecret: str("AUTH_SECRET", "dev-secret-change-me"),
  sessionTtlHours: num("SESSION_TTL_HOURS", 720),

  encryptionKey: str("ENCRYPTION_KEY"),

  razorpayKeyId: str("RAZORPAY_KEY_ID"),
  razorpayKeySecret: str("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: str("RAZORPAY_WEBHOOK_SECRET"),
  stripeSecretKey: str("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: str("STRIPE_WEBHOOK_SECRET"),

  openaiApiKey: str("OPENAI_API_KEY"),
  anthropicApiKey: str("ANTHROPIC_API_KEY"),
  googleApiKey: str("GOOGLE_API_KEY"),
  groqApiKey: str("GROQ_API_KEY"),
  mistralApiKey: str("MISTRAL_API_KEY"),
  /** Server-only credential for the ProRouter gateway upstream. Never exposed to the web app. */
  proRouterGatewayApiKey: str("PROVIDER_PROROUTER_GATEWAY_API_KEY"),

  emailApiKey: str("EMAIL_API_KEY"),
  emailFrom: str("EMAIL_FROM", "noreply@prorouter.com"),
  sentryDsn: str("SENTRY_DSN"),
  logLevel: str("LOG_LEVEL", "info"),

  adminEmail: str("ADMIN_EMAIL"),
  adminPassword: str("ADMIN_PASSWORD"),
} as const;