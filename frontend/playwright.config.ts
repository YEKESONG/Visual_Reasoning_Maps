import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:8000",
    viewport: { width: 1440, height: 1000 },
    headless: true,
  },
  reporter: "list",
});
