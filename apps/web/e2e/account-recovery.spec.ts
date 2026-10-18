import { expect, test, type Page } from "@playwright/test";

import { API_URL_PATTERN, expectPageReady, fulfillJson, mockMapTiles, watchConsole } from "./helpers";

type Handler = { status: number; body: unknown };

/** Route the listed API paths; everything else fails like an unreachable API. */
async function mockAccountApi(page: Page, handlers: Record<string, Handler>, seen: Record<string, unknown>[] = []) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const handler = handlers[path];
    if (!handler) {
      await route.abort("failed");
      return;
    }
    seen.push({ path, body: route.request().postDataJSON() });
    await fulfillJson(route, handler.body, handler.status);
  });
  return seen;
}

test("privacy policy is public and linked from sign-in", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockAccountApi(page, {});

  await page.goto("/login");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByRole("link", { name: "سياسة الخصوصية" }).click();

  await expectPageReady(page, "سياسة الخصوصية");
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: "حقوقك" })).toBeVisible();
  await expect(page.getByText("81/2018").first()).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("registration that needs email verification shows a check-your-email screen", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockAccountApi(page, {
    "/auth/register": { status: 202, body: { verification_required: true, email: "rania@example.com" } },
    "/auth/verify-email/resend": { status: 202, body: { status: "accepted" } },
  });

  await page.goto("/register");
  await expectPageReady(page, "إنشاء حساب جديد");
  await page.getByLabel("الاسم الكامل").fill("رانيا حداد");
  await page.getByLabel("البريد الإلكتروني").fill("rania@example.com");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("Harbour-Lights-2026!");
  await page.getByLabel("تأكيد كلمة المرور").fill("Harbour-Lights-2026!");
  await page.getByRole("checkbox", { name: /أوافق على معالجة بياناتي/ }).check();
  await page.getByRole("button", { name: "إنشاء حساب" }).click();

  await expectPageReady(page, "تحقق من بريدك الإلكتروني");
  await page.getByRole("button", { name: "إعادة إرسال رابط التأكيد" }).click();
  await expect(page.getByText("إذا كان هذا البريد بانتظار التأكيد")).toBeVisible();

  consoleWatcher.assertNoErrors();
});

test("forgot password answers the same way for any address", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  const seen = await mockAccountApi(page, {
    "/auth/password/forgot": { status: 202, body: { status: "accepted" } },
  });

  await page.goto("/login");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByRole("link", { name: "نسيت كلمة المرور؟" }).click();
  await expectPageReady(page, "نسيت كلمة المرور");
  await page.getByLabel("البريد الإلكتروني").fill("resident@example.com");
  await page.getByRole("button", { name: "أرسل رابط إعادة التعيين" }).click();

  await expect(page.getByText("إذا كان هذا البريد مسجّلًا لدينا")).toBeVisible();
  expect(seen).toEqual([{ path: "/auth/password/forgot", body: { email: "resident@example.com" } }]);

  consoleWatcher.assertNoErrors();
});

test("reset link sets a new password and removes the token from the address bar", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  const seen = await mockAccountApi(page, {
    "/auth/password/reset": { status: 200, body: { reset: true, email: "resident@example.com" } },
  });

  await page.goto("/reset-password#token=e2e-reset-token-value-1234567890");
  await expectPageReady(page, "تعيين كلمة مرور جديدة");
  await expect(page).toHaveURL(/\/reset-password$/);

  await page.getByLabel("كلمة المرور الجديدة", { exact: true }).fill("Castle-Guard-Mina-88");
  await page.getByLabel("تأكيد كلمة المرور الجديدة").fill("Castle-Guard-Mina-88");
  await page.getByRole("button", { name: "حفظ كلمة المرور الجديدة" }).click();

  await expectPageReady(page, "تم تغيير كلمة المرور");
  expect(seen[0]).toEqual({
    path: "/auth/password/reset",
    body: { token: "e2e-reset-token-value-1234567890", password: "Castle-Guard-Mina-88" },
  });

  consoleWatcher.assertNoErrors();
});

test("expired reset links explain what to do next", async ({ page }) => {
  await mockAccountApi(page, {
    "/auth/password/reset": { status: 400, body: { detail: "This link is invalid or has expired. Request a new one." } },
  });

  await page.goto("/reset-password#token=e2e-expired-token-value-123456");
  await expectPageReady(page, "تعيين كلمة مرور جديدة");
  await page.getByLabel("كلمة المرور الجديدة", { exact: true }).fill("Castle-Guard-Mina-88");
  await page.getByLabel("تأكيد كلمة المرور الجديدة").fill("Castle-Guard-Mina-88");
  await page.getByRole("button", { name: "حفظ كلمة المرور الجديدة" }).click();

  await expect(page.getByText("الرابط غير صالح أو انتهت صلاحيته")).toBeVisible();
  await expect(page.getByRole("link", { name: "اطلب رابطًا جديدًا" })).toBeVisible();
});

test("verification link activates the account", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockAccountApi(page, {
    "/auth/verify-email": { status: 200, body: { verified: true, email: "rania@example.com" } },
  });

  await page.goto("/verify-email#token=e2e-verify-token-value-1234567890");
  await expect(page.getByText("تم تأكيد بريدك الإلكتروني وتفعيل حسابك")).toBeVisible();
  await expect(page).toHaveURL(/\/verify-email$/);

  consoleWatcher.assertNoErrors();
});

test("signing in before verifying offers to resend the link", async ({ page }) => {
  await mockAccountApi(page, {
    "/auth/login": { status: 403, body: { detail: "Email address is not verified." } },
  });

  await page.goto("/login");
  await expectPageReady(page, "دخول CityMind Tripoli");
  await page.getByLabel("البريد الإلكتروني").fill("rania@example.com");
  await page.getByLabel("كلمة المرور").fill("Harbour-Lights-2026!");
  await page.getByRole("button", { name: "دخول" }).click();

  await expect(page.getByText("لم يتم تأكيد بريدك الإلكتروني بعد")).toBeVisible();
  await expect(page.getByRole("button", { name: "إعادة إرسال رابط التأكيد" })).toBeVisible();
});
