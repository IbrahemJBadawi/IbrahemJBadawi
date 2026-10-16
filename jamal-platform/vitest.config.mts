import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Each test file gets a fresh in-memory PGlite database.
    env: { PGLITE_DATA_DIR: "memory://", DATABASE_URL: "" },
  },
});
