import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — smoke tests for the prod build.
 *
 * Targets the running production server on http://localhost:3001.
 * Run with:  npm run test:e2e
 *
 * We don't run a full multi-browser matrix for a solo-founder project —
 * chromium-only is the right cost/coverage tradeoff. Add firefox/webkit
 * when team size grows.
 *
 * For CI, set BASE_URL to the deploy preview URL.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Don't auto-start the server. The npm script starts it first.
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3001",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
});
