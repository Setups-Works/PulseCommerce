import { expect, test } from "@playwright/test";

/**
 * Smoke tests for a real deployment.
 *
 * Run against a live URL after a deploy, so they cannot assume the empty state
 * the rest of the suite relies on — a production instance has a store connected
 * and possibly a gateway. These check that the deployment is genuinely serving,
 * not that it is unconfigured.
 *
 * Nothing here writes anything, sends a message, or reads customer data.
 */

test("the API description is served", async ({ request }) => {
  const res = await request.get("/api/openapi");
  expect(res.ok()).toBeTruthy();
  const doc = await res.json();
  expect(doc.info.title).toBe("PulseCommerce API");
});

test("the app shell renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBeLessThan(400);
  await expect(page).toHaveTitle(/PulseCommerce/i);
});

test("settings answers without erroring", async ({ request }) => {
  // Whether a store is connected depends on the deployment; that it answers at
  // all does not.
  const res = await request.get("/api/settings");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toHaveProperty("connected");
});

test("analytics either returns data or says no store is connected", async ({ request }) => {
  const res = await request.get("/api/analytics", { timeout: 120_000 });
  if (res.status() === 409) {
    expect((await res.json()).code).toBe("not_connected");
    return;
  }
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  // Never leak a phone number to a client, whatever the deployment holds.
  const serialised = JSON.stringify(body.customers?.records?.slice(0, 50) ?? []);
  expect(serialised).not.toMatch(/"phone"\s*:/);
});

test("the API reference page is reachable", async ({ page }) => {
  const response = await page.goto("/api-docs");
  expect(response?.status()).toBeLessThan(400);
});
