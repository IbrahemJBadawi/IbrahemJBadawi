import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a running app (see docs/TESTING.md):
 *   E2E_BASE_URL=http://localhost:3000 npm run test:e2e
 * Flow tests need a real Supabase backend (cloud project or the local
 * stack in scripts/local-stack) with email auto-confirm enabled.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "ar",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /public\.spec\.ts/ },
  ],
});
