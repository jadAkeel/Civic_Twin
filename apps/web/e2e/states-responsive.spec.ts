import { expect, test } from "@playwright/test";

import { blockApi, expectPageReady, mockDelayedDashboardSummary, mockStoredCitizenSession, mockStoredOwnerSession, watchConsole } from "./helpers";

test("dashboard shows loading first, then service-backed empty state", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredOwnerSession(page);
  await mockDelayedDashboardSummary(page);

  await page.goto("/dashboard");
  await expect(page.getByText("جارٍ التحميل").first()).toBeVisible();
  await expectPageReady(page, "نظرة تشغيلية على بلاغات طرابلس");

  await expect(page.getByText("مصدر متصل").first()).toBeVisible();
  await expect(page.getByText("لا توجد بيانات", { exact: true })).toBeVisible();
  await expect(page.getByText("إجمالي البلاغات")).toBeVisible();
  await expect(page.getByText("0").first()).toBeVisible();
  await expect(page.getByText("لا توجد مناطق أولوية في البيانات الحالية.")).toBeVisible();
  await expect(page.getByText("لا توجد بلاغات حديثة في البيانات الحالية.")).toBeVisible();
  await expect(page.getByText("GIS الرسمي والإشعارات الخارجية غير مهيأة")).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("desktop and mobile layouts expose the right navigation surfaces", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await blockApi(page);

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

test("map renders ready state, legend meanings, and marker details", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await blockApi(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/map");
  await expectPageReady(page, "استكشف بلاغات طرابلس وأحياءها وأصول المدينة");
  await expect(page.getByText("الخريطة جاهزة")).toBeVisible();
  await expect(page.getByText("مفتاح الخريطة")).toBeVisible();
  await expect(page.getByText("الصليب الأحمر اللبناني", { exact: true })).toBeVisible();
  await expect(page.getByText("البلدية", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("الشرطة", { exact: true })).toBeVisible();
  await expect(page.getByText("المواطن", { exact: true })).toBeVisible();
  await expect(page.getByText("الدفاع المدني", { exact: true })).toBeVisible();
  await expect(page.getByText("أصل بلدي", { exact: true })).toBeVisible();

  const markers = page.getByRole("button", { name: /^Map marker:/ });
  await expect(markers.first()).toBeVisible();
  expect(await markers.count()).toBeGreaterThanOrEqual(4);
  await markers.first().click();
  await expect(page.getByText("التصعيد المقترح").first()).toBeVisible();
  await expect(page.getByText("الإشعار الخارجي غير مهيأ").first()).toBeVisible();

  consoleWatcher.assertNoErrors();
});
