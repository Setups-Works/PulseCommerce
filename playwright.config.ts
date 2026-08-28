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
 *
 * ─── Why requests still carry an API key ───────────────────────────────────
 *
 * "Nothing configured" and "nobody signed in" are different states, and
 * src/proxy.ts treats them differently on purpose: with no database at all it
 * fails closed with 503 before checking who's asking, because a misconfigured
 * deployment must never look like "no auth required" (see the comment there).
 * So reaching the *actual* thing this suite tests — what a real, signed-in
 * tenant with no store sees — needs a real identity, seeded once per CI run
 * by scripts/seed-ci-test-identity.mjs against a dedicated test Supabase
 * project. CI_TEST_API_KEY is that identity's key; unset locally, so a
 * developer running this without CI's secrets gets the true "nothing
 * configured" 503 state instead, which is a valid thing to have tested too.
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

  projects: [
    {
      // The default suite: a build with nothing configured, started locally.
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // See the file header. Absent locally; only real in CI, where it's
        // the seeded test identity's key — never a developer's own.
        extraHTTPHeaders: process.env.CI_TEST_API_KEY
          ? { Authorization: `Bearer ${process.env.CI_TEST_API_KEY}` }
          : undefined,
      },
      testIgnore: /production-smoke/,
    },
    {
      // Run against a deployed URL after a release. Kept separate because a
      // production instance has a store connected, so the empty-state
      // assertions the main suite makes would rightly fail there.
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /production-smoke/,
    },
  ],

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
          // Same reasoning for the assistant: a real key here would spend the
          // developer's Groq credit on every test run and, worse, make the
          // "unavailable without a key" test pass or fail depending on whose
          // machine it ran on.
          GROQ_API_KEY: "",
          WHATSAPP_API_URL: "",
          WHATSAPP_API_KEY: "",
          APP_PASSWORD: "",
        },
      },
});
