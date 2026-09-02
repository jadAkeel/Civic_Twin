import { expect, test } from "@playwright/test";

import { expectPageReady, mockAgencySession, mockCitizenRegistration, mockDeniedAuth, mockMapTiles, mockOwnerSession, watchConsole } from "./helpers";

test("shell sign-in does not expose role selection and rejects invalid credentials", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockDeniedAuth(page);

  await page.goto("/");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await expect(page.getByText("رئيس البلدية / Owner")).toHaveCount(0);
  await expect(page.getByText("أدمن بلدية")).toHaveCount(0);
  await expect(page.getByText("مواطن عادي")).toHaveCount(0);
  await page.getByLabel("البريد الإلكتروني").fill("unknown@example.com");
  await page.getByLabel("كلمة المرور").fill("wrong-password");
  await page.getByRole("button", { name: "دخول" }).click();

  await expect(page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة")).toBeVisible();
  await expect(page.getByRole("link", { name: /الإدارة/ })).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});

test("visitor can open register page and create a citizen account", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockCitizenRegistration(page);

  await page.goto("/login");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByRole("link", { name: "إنشاء حساب" }).click();
  await expectPageReady(page, "إنشاء حساب جديد");
  await page.getByLabel("الاسم الكامل").fill("مواطن جديد");
  await page.getByLabel("البريد الإلكتروني").fill("new.citizen@example.com");
  await page.getByLabel("كلمة المرور").fill("citizen-pass");
  await page.getByRole("button", { name: "إنشاء حساب" }).click();

  await expectPageReady(page, "خدمات المواطنين في CityMind Tripoli");

  consoleWatcher.assertNoErrors();
});

test("admin page loads after owner email and password auth succeeds", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockMapTiles(page);
  await mockOwnerSession(page);

  await page.goto("/admin");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByLabel("البريد الإلكتروني").fill("owner.demo@citymind.local");
  await page.getByLabel("كلمة المرور").fill("owner-demo");
  await page.getByRole("button", { name: "دخول" }).click();

  await expectPageReady(page, "عمليات بلدية طرابلس");
  await expect(page.getByText("إدارة الصلاحيات")).toBeVisible();

  await page.getByPlaceholder("الاسم الكامل").fill("E2E Analyst");
  await page.getByPlaceholder("email@example.com").fill("analyst@example.com");
  await page.getByPlaceholder("كلمة مرور مؤقتة").fill("analyst-demo");
  await page.getByRole("button", { name: "حفظ الصلاحية" }).click();
  await expect(page.getByRole("cell", { name: "analyst@example.com" })).toBeVisible();

  await page.getByText("إدارة حالات البلاغات").scrollIntoViewIfNeeded();
  await expect(page.getByText("إدارة حالات البلاغات")).toBeVisible();
  await expect(page.getByRole("cell", { name: "TRP-E2E-1" })).toBeVisible();
  await expect(page.getByLabel("Map marker").filter({ hasText: "R" })).toBeVisible();
  await expect(page.getByText("بلاغ كتابي فقط")).toBeVisible();

  await page.getByRole("row", { name: /TRP-E2E-1/ }).getByRole("combobox").selectOption("resolved");
  await expect(page.getByRole("row", { name: /TRP-E2E-1/ }).getByRole("combobox")).toHaveValue("resolved");

  await page.getByRole("row", { name: /E2E street light/ }).getByRole("combobox").selectOption("planned");
  await expect(page.getByRole("row", { name: /E2E street light/ }).getByRole("combobox")).toHaveValue("planned");

  consoleWatcher.assertNoErrors();
});

test("agency portals show filtered queues, maps, monthly summaries, and no fake dispatch status", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockMapTiles(page);
  await mockAgencySession(page, "police");

  await page.goto("/admin");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByLabel("البريد الإلكتروني").fill("police.demo@citymind.local");
  await page.getByLabel("كلمة المرور").fill("agency-demo");
  await page.getByRole("button", { name: "دخول" }).click();
  await expectPageReady(page, "عمليات بلدية طرابلس");

  await expect(page.getByText("بوابة الشرطة").first()).toBeVisible();
  await expect(page.locator("p").filter({ hasText: /^حادث أمني أو سلامة عامة$/ })).toBeVisible();
  await expect(page.getByText("الإشعارات: غير مهيأ. GIS: غير مهيأ.")).toBeVisible();
  await expect(page.getByText(/1 بلاغات، 1 مفتوحة/)).toBeVisible();
  await expect(page.getByText("مناطق ساخنة")).toBeVisible();
  await expect(page.getByText("خريطة وتفاصيل مفلترة حسب الجهة")).toBeVisible();
  await expect(page.getByRole("cell", { name: "حادث أمني أو سلامة عامة" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "ازدحام مروري" })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "نفايات / قمامة" })).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});

test("red cross and civil defense portals hide unrelated report categories", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockMapTiles(page);
  await mockAgencySession(page, "red_cross");

  await page.goto("/admin");
  await page.getByLabel("البريد الإلكتروني").fill("redcross.demo@citymind.local");
  await page.getByLabel("كلمة المرور").fill("agency-demo");
  await page.getByRole("button", { name: "دخول" }).click();
  await expectPageReady(page, "عمليات بلدية طرابلس");

  await expect(page.getByText("بوابة الصليب الأحمر اللبناني").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "حالة طبية / مراجعة الصليب الأحمر" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "حادث أمني أو سلامة عامة" })).toHaveCount(0);

  await page.evaluate(() => window.localStorage.clear());
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockMapTiles(page);
  await mockAgencySession(page, "civil_defense");
  await page.goto("/admin");
  await page.getByLabel("البريد الإلكتروني").fill("civildefense.demo@citymind.local");
  await page.getByLabel("كلمة المرور").fill("agency-demo");
  await page.getByRole("button", { name: "دخول" }).click();
  await expectPageReady(page, "عمليات بلدية طرابلس");

  await expect(page.getByText("بوابة الدفاع المدني / الحريق").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "خطر حريق / مراجعة الدفاع المدني" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "حفرة أو ضرر في الطريق" })).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});
