import { expect, test } from "@playwright/test";

import { expectPageReady, mockDelayedDashboardSummary, mockStoredCitizenSession, mockStoredOwnerSession, watchConsole } from "./helpers";

test("dashboard shows loading first, then API-backed empty state", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredOwnerSession(page);
  await mockDelayedDashboardSummary(page);

  await page.goto("/dashboard");
  await expect(page.getByText("جارٍ التحميل").first()).toBeVisible();
  await expectPageReady(page, "نظرة تشغيلية ذكية على طرابلس");

  await expect(page.getByText("API").first()).toBeVisible();
  await expect(page.getByText("لا توجد بيانات", { exact: true })).toBeVisible();
  await expect(page.getByText("إجمالي البلاغات")).toBeVisible();
  await expect(page.getByText("0").first()).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("desktop and mobile layouts expose the right navigation surfaces", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await page.route(/127\.0\.0\.1:8000|localhost:8000/, (route) => route.abort("failed"));

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/map");
  await expectPageReady(page, "استكشف بلاغات طرابلس وأحياءها وأصول المدينة");
  await expect(page.getByRole("navigation", { name: "وحدات CityMind" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "التنقل على الجوال" })).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("navigation", { name: "وحدات CityMind" })).toBeHidden();
  await expect(page.getByRole("navigation", { name: "التنقل على الجوال" })).toBeVisible();
  await page.getByRole("navigation", { name: "التنقل على الجوال" }).getByRole("link", { name: /بلاغ جديد/ }).click();
  await expectPageReady(page, "بلّغ عن مشكلة في طرابلس");

  consoleWatcher.assertNoErrors();
});
