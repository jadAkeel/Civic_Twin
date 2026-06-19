import { defineConfig, devices } from "@playwright/test";

const localBrowserExecutable = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const port = process.env.PLAYWRIGHT_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "apps/web/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  workers: process.env.CI ? 2 : 2,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: ".codex-runtime/playwright-report" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: localBrowserExecutable ? { executablePath: localBrowserExecutable } : undefined,
      },
    },
  ],
  webServer: {
    command: `corepack pnpm --filter @citymind/web exec next dev -H 127.0.0.1 -p ${port}`,
    url: `${baseURL}/map`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
