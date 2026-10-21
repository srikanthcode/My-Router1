import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./packages/database/src/schema/index.ts",
  out: "./packages/database/migrations",
  dialect: "postgresql",
  verbose: true,
  strict: false,
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://uno:uno@localhost:5432/uno",
  },
});