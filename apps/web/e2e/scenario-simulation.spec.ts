import { expect, test } from "@playwright/test";

import { scenarioResultFixture } from "./fixtures";
import { expectPageReady, mockMapTiles, mockStoredOwnerSession, watchConsole } from "./helpers";

test("municipality simulation sends auth and renders calibrated result metadata", async ({ page }) => {
  const consoleWatcher = watchConsole(page);
  await mockStoredOwnerSession(page);
  await mockMapTiles(page);

  await page.route(/\/scenarios\/results$/, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );

  let submitted: Record<string, unknown> | null = null;
  await page.route(/\/scenarios\/simulate$/, async (route) => {
    const request = route.request();
    submitted = request.postDataJSON() as Record<string, unknown>;
    // The browser authenticates with the HttpOnly cookie and proves intent with the
    // CSRF token; it never holds a bearer token.
    expect(request.headers().authorization).toBeUndefined();
    expect(request.headers()["x-csrf-token"]).toBe("e2e-owner-csrf");
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ...scenarioResultFixture,
        id: "scenario-result-e2e",
        scenario_name: submitted.name,
        intensity: submitted.intensity,
        execution_mode: submitted.execution_mode,
        budget: { limit: submitted.budget_limit, within_budget: false, variance: -10000 },
        methodology: {
          ...scenarioResultFixture.methodology,
          version: "scenario-v2.0",
          data_quality_score: 0.68,
        },
        warnings: ["The estimated cost exceeds the supplied budget limit."],
        persistence_backend: "database",
      }),
    });
  });

  await page.goto("/simulator");
  await expectPageReady(page, "تقدير أثر التدخلات في طرابلس");
  await expect(page.getByText("لا توجد نتيجة محاكاة بعد")).toBeVisible();
  await page.getByLabel("نطاق التدخل").selectOption("expanded");
  await page.getByLabel("نمط التنفيذ").selectOption("parallel");
  await page.getByLabel("سقف الميزانية بالدولار").fill("50000");
  await page.getByRole("button", { name: "احسب الأثر التقديري" }).click();

  await expect.poll(() => submitted).not.toBeNull();
  expect(submitted).toMatchObject({
    neighborhood_slug: "bab-al-tebbaneh",
    intensity: "expanded",
    execution_mode: "parallel",
    budget_limit: 50000,
  });
  await expect(page.getByText("scenario-v2.0").first()).toBeVisible();
  await expect(page.getByText("الكلفة التقديرية تتجاوز سقف الميزانية المحدد.")).toBeVisible();

  consoleWatcher.assertNoErrors();
});
