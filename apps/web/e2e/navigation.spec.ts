import { expect, test } from "@playwright/test";

import { blockApi, expectPageReady, mockOwnerSession, mockStoredCitizenSession, watchConsole } from "./helpers";

test("resident navigation exposes public modules and hides municipal routes", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await blockApi(page);

  await page.goto("/map");
  await expectPageReady(page, "استكشف بلاغات طرابلس وأحياءها وأصول المدينة");
  await expect(page.getByRole("navigation", { name: "وحدات CityMind" })).toContainText("للمواطنين");
  await expect(page.getByRole("link", { name: /بلاغ جديد/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /المؤشر الأخضر/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /التنقل/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /اسأل المدينة/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /لوحة المدينة/ })).toHaveCount(0);

  await page.getByRole("link", { name: /بلاغ جديد/ }).click();
  await expectPageReady(page, "بلّغ عن مشكلة في طرابلس");

  await page.getByRole("link", { name: /اسأل المدينة/ }).click();
  await expectPageReady(page, "مساعد طرابلس المعتمد على بيانات المنصة");

  consoleWatcher.assertNoErrors();
});

test("owner sign-in unlocks municipality navigation", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockOwnerSession(page);

  await page.goto("/");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByLabel("البريد الإلكتروني").fill("owner.demo@citymind.local");
  await page.getByLabel("كلمة المرور").fill("owner-demo");
  await page.getByRole("button", { name: "دخول" }).click();

  await expect(page.getByText("وصول الجهات والبلدية")).toBeVisible();
  await expect(page.getByText("رئيس البلدية").first()).toBeVisible();
  await expect(page.getByRole("link", { name: /لوحة المدينة/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /المحاكاة/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /التوقعات/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /الإدارة/ })).toBeVisible();

  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expectPageReady(page, "دخول CityMind Tripoli");
  await expect(page.getByRole("link", { name: /الإدارة/ })).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});
