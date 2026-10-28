import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1440, height: 960 },
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : undefined,
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.E2E_PRODUCTION ? "npm start" : "npm run dev",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
  },
  workers: 1,
});
