import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    // Each test file gets a fresh in-memory embedded Postgres (PGlite)
    // with the real migrations: RLS is exercised for real, no server needed.
    env: { PGLITE_DATA_DIR: "memory://", DATABASE_URL: "" },
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      { extends: true, test: { name: "db", include: ["tests/db/**/*.test.ts"], fileParallelism: false } },
    ],
  },
});
