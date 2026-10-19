import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build: `npm run build && npm run test:e2e`.
 * No external services are needed; the contact form runs without delivery
 * keys, so the tests check that it honestly reports "not set up".
 */
const port = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { RESEND_API_KEY: "", TELEGRAM_BOT_TOKEN: "" },
  },
});
