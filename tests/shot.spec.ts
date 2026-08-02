import { test } from "@playwright/test";
test("shot", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto("/campaigns");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: process.env.SHOT! });
});
