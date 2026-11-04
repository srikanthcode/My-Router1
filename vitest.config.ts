import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./apps/web"),
    },
  },
  test: {
    hookTimeout: 120_000,
    testTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
    pool: "forks",
    fileParallelism: false,
  },
});
