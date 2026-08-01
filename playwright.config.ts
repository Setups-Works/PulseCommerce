import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * These run against a production build with no WooCommerce store connected and
 * no WhatsApp gateway configured, which is deliberate: that is the state a fresh
 * clone is in, and it is the state most likely to be broken by a change nobody
 * tested from scratch. Tests assert what the app does when it has nothing —
 * that it says so clearly rather than crashing, and that every endpoint refuses
 * work it cannot do instead of half-attempting it.
 *
 * Nothing here touches a real store or sends a message.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: process.env.BASE_URL
    ? undefined
    : {
        // A production build, because dev-only behaviour is not what ships.
        command: "npm run build && npm run start -- --port 3100",
        url: "http://127.0.0.1:3100/api/openapi",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          // No store, no gateway, no password: the fresh-clone state.
          //
          // These are blanked deliberately. Next loads .env.local at startup,
          // and a developer's real Redis credentials there would connect the
          // test run to a live store — which is both a false pass and a way to
          // exercise a real WooCommerce account from a test suite. dotenv does
          // not overwrite a key already present in the environment, so setting
          // them empty here wins.
          NODE_ENV: "production",
          KV_REST_API_URL: "",
          KV_REST_API_TOKEN: "",
          UPSTASH_REDIS_REST_URL: "",
          UPSTASH_REDIS_REST_TOKEN: "",
          WHATSAPP_API_URL: "",
          WHATSAPP_API_KEY: "",
          APP_PASSWORD: "",
        },
      },
});
