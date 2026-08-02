import { expect, test } from "@playwright/test";

/**
 * The application shell, with nothing connected.
 *
 * A fresh clone must be usable enough to explain itself. These check that it
 * says what is missing rather than showing an empty dashboard or an error page.
 */

test("the root page invites you to connect a store", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/PulseCommerce/i);
  await expect(page.getByRole("button", { name: /continue to woocommerce/i })).toBeVisible();
});

test("the connect form refuses a plainly invalid URL", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel(/store url/i);
  await input.fill("x");
  await page.getByRole("button", { name: /continue to woocommerce/i }).click();

  // The form guards with HTML constraint validation rather than a disabled
  // button, so the assertion is that submission is blocked: still on the
  // connect page, and the browser considers the field invalid.
  await expect(page).toHaveURL(/\/$/);
  expect(await input.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);
});

test("the API reference renders the spec", async ({ page }) => {
  await page.goto("/api-docs");

  /*
   * Swagger UI is served from the bundle, not a CDN, so this asserts the
   * rendered result rather than the wiring: a real operation from the real
   * document, which fails if the spec stops parsing or the viewer stops
   * mounting. Neither was checkable while it depended on a third-party script.
   */
  await expect(page.getByText("/api/whatsapp/broadcast").first()).toBeVisible({
    timeout: 20_000,
  });
});

test("dashboard pages ask for a store rather than rendering empty charts", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText(/connect|woocommerce/i).first()).toBeVisible({ timeout: 15_000 });
});
