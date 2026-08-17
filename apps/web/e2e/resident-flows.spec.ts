import { expect, test } from "@playwright/test";

import {
  blockApi,
  expectPageReady,
  mockCitizenReportsApi,
  mockCitizenReportSubmitFailure,
  mockStoredCitizenSession,
  mockStoredOwnerSession,
  watchConsole,
} from "./helpers";

test("citizen home exposes public actions on mobile", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await blockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await expectPageReady(page, "خدمات المواطنين في CityMind Tripoli");
  await expect(page.getByRole("link", { name: "بلّغ عن مشكلة" }).first()).toBeVisible();
  await expect(page.getByText("الإبلاغ عن ازدحام مروري")).toBeVisible();
  await expect(page.getByText("الإبلاغ عن حفرة أو ضرر في الطريق")).toBeVisible();
  await expect(page.getByText("الإبلاغ عن مشكلة نفايات")).toBeVisible();
  await expect(page.getByText("الإبلاغ عن حادث أمني أو سلامة عامة")).toBeVisible();
  await expect(page.getByText("إرسال بلاغ طبي للمراجعة")).toBeVisible();
  await expect(page.getByText("الإبلاغ عن خطر حريق")).toBeVisible();
  await expect(page.getByText("تحليل الصور الآلي")).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("citizen report form validates, handles GPS denial, previews photo honestly, and submits via service", async ({
  page,
}) => {
  const consoleWatcher = watchConsole(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });
  });
  await mockStoredCitizenSession(page);
  await mockCitizenReportsApi(page);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/reports");
  await expectPageReady(page, "بلّغ عن مشكلة في طرابلس");
  await expect(page.getByText("تحليل الصور الآلي غير مهيأ بعد.")).toBeVisible();

  await page.getByRole("button", { name: "إرسال البلاغ" }).click();
  await expect(page.getByText("أضف ملخصًا قصيرًا من 3 أحرف")).toBeVisible();
  await expect(page.getByText("اكتب وصفًا للمشكلة من 10 أحرف")).toBeVisible();
  await expect(page.getByText("أضف موقعًا يدويًا أو شارك/حدد موقعًا")).toBeVisible();

  await page.getByRole("button", { name: "استخدم موقعي عبر GPS" }).click();
  await expect(page.getByText("تم رفض إذن الموقع أو أنه غير متاح")).toBeVisible();

  await page.getByLabel("الفئة").selectOption("pothole");
  await expect(page.getByText("المراجعة المتوقعة: مراجعة البلدية لقسم الأشغال والصيانة.")).toBeVisible();
  await page.getByLabel("ملخص قصير").fill("ضرر في الطريق قرب التل");
  await page
    .getByLabel("الوصف")
    .fill("هناك ضرر في سطح الطريق قرب المعبر والسائقون ينحرفون حوله.");
  await page.getByLabel("المنطقة القريبة").selectOption("el-tal");
  await page.getByLabel("صورة اختيارية").setInputFiles({
    name: "road-damage.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  });
  await expect(page.getByText("معاينة محلية فقط. تخزين الصور غير مهيأ.")).toBeVisible();

  await page.getByRole("button", { name: "إرسال البلاغ" }).click();
  await expect(page.getByRole("heading", { name: "تم إرسال البلاغ" })).toBeVisible();
  await expect(page.locator("dd", { hasText: "TRP-E2E-CITIZEN" })).toBeVisible();
  await expect(page.getByText("موقع محدد على خريطة طرابلس")).toBeVisible();
  await expect(page.locator("dd", { hasText: "مراجعة البلدية لقسم الأشغال والصيانة" })).toBeVisible();
  await expect(page.getByText("بيانات معاينة محلية فقط")).toBeVisible();
  await expect(page.getByText("غير مهيأ").first()).toBeVisible();
  await expect(page.getByText("تم إرسال هذا البلاغ من دون تحليل صور آلي")).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("citizen report service failure does not look like success", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await mockCitizenReportSubmitFailure(page);

  await page.goto("/reports");
  await expectPageReady(page, "بلّغ عن مشكلة في طرابلس");

  await page.getByLabel("الفئة").selectOption("waste");
  await page.getByLabel("ملخص قصير").fill("نفايات تعيق الممر");
  await page
    .getByLabel("الوصف")
    .fill("أكياس نفايات تعيق ممرًا ضيقًا ويحتاج السكان إلى دعم في الجمع.");
  await page.getByLabel("عنوان أو مكان يدوي").fill("قرب دوار الميناء، طرابلس");
  await page.getByRole("button", { name: "إرسال البلاغ" }).click();

  await expect(page.getByText("لم يتم إرسال البلاغ إلى خدمة CityMind.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "تم إرسال البلاغ" })).toHaveCount(0);

  consoleWatcher.assertNoErrors();
});

test("municipality data review prompt buttons and offline answer state work", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredOwnerSession(page);
  await blockApi(page);

  await page.goto("/ask-city");
  await expectPageReady(page, "أسئلة بلدية على بيانات طرابلس");

  await page.getByRole("button", { name: "أين قابلية المشي هي الأضعف؟" }).click();
  await expect(page.locator("input").last()).toHaveValue("أين قابلية المشي هي الأضعف؟");
  await page.getByRole("button", { name: "راجع" }).click();

  await expect(page.getByText("غير متاح أثناء توقف خدمة CityMind.")).toBeVisible();
  await expect(page.getByText("احتياطي محلي").first()).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("mobility controls are clearly labeled as demo and unavailable for official routing", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredCitizenSession(page);
  await blockApi(page);

  await page.goto("/mobility");
  await expectPageReady(page, "مسارات المشي والمسارات البديلة");
  await expect(page.getByText("توصية مسارات المشي غير مهيأة بعد.")).toBeVisible();
  await expect(page.getByText("مزود توجيه المرور غير مهيأ")).toBeVisible();
  await expect(page.getByText("احتياطي تجريبي محلي").first()).toBeVisible();

  await page.getByLabel("نقطة الانطلاق").selectOption("Qoubbeh");
  await page.getByRole("button", { name: /تجريبي: الأسرع/ }).click();

  await expect(page.getByText("تجريبي: الأسرع").first()).toBeVisible();
  await expect(page.getByText("هذه نتيجة اختبار/تجربة فقط من بيانات البذور.")).toBeVisible();

  consoleWatcher.assertNoErrors();
});
