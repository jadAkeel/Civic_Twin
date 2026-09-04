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
  await expect(page.getByRole("link", { name: /التنقل/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /المؤشر الأخضر/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /مراجعة البيانات/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /لوحة المدينة/ })).toHaveCount(0);

  await page.getByRole("link", { name: /بلاغ جديد/ }).click();
  await expectPageReady(page, "بلّغ عن مشكلة في طرابلس");

  await page.goto("/green-score");
  await expectPageReady(page, "خدمات المواطنين في CityMind Tripoli");

  await page.goto("/digital-twin");
  await expectPageReady(page, "خدمات المواطنين في CityMind Tripoli");

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
  await expect(page.getByRole("link", { name: /المؤشر الأخضر/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /المحاكاة/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /إشارات المخاطر/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /مراجعة البيانات/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /الإدارة/ })).toBeVisible();

  await page.goto("/predictions");
  await expectPageReady(page, "قائمة مراجعة إشارات المخاطر");
  await expect(page.getByText("ليست توقعات رسمية أو إنذارات تشغيلية")).toBeVisible();

  await page.goto("/digital-twin");
  await expectPageReady(page, "نموذج طرابلس ثلاثي الأبعاد");
  await expect(page.getByText("غير مهيأ رسميًا").first()).toBeVisible();
  await expect(page.getByText("إعداد رمز")).toHaveCount(0);

  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expectPageReady(page, "دخول CityMind Tripoli");
  await expect(page.getByRole("link", { name: /الإدارة/ })).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});
