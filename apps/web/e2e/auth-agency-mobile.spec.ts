import { expect, test } from "@playwright/test";

import { mockAgencySession, watchConsole } from "./helpers";

async function loginAgency(page: Parameters<typeof mockAgencySession>[0], email: string) {
  await page.goto("/admin");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill("agency-demo");
  await page.locator('input[type="password"]').press("Enter");
}

test("agency mobile portals keep filtered report details and map markers usable", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await mockAgencySession(page, "police");
  await loginAgency(page, "police.demo@citymind.local");

  await expect(page.getByText("E2E traffic security incident")).toBeVisible();
  await expect(page.locator('[aria-label^="Map marker:"]')).toHaveCount(1);
  await expect(page.getByText("E2E broken sidewalk")).toHaveCount(0);

  await page.evaluate(() => window.localStorage.clear());
  await page.unrouteAll({ behavior: "ignoreErrors" });

  await mockAgencySession(page, "red_cross");
  await loginAgency(page, "redcross.demo@citymind.local");

  await expect(page.getByText("E2E medical assistance request")).toBeVisible();
  await expect(page.locator('[aria-label^="Map marker:"]')).toHaveCount(1);
  await expect(page.getByText("E2E broken sidewalk")).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});
