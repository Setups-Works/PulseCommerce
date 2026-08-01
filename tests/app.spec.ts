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
  // Scalar loads from a CDN; assert the mount point and the spec URL are wired,
  // rather than depending on a third-party script in CI.
  await expect(page.locator("#api-reference")).toHaveAttribute("data-url", "/api/openapi");
});

test("dashboard pages ask for a store rather than rendering empty charts", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText(/connect|woocommerce/i).first()).toBeVisible({ timeout: 15_000 });
});
