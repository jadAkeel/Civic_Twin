import { expect, test } from "@playwright/test";

function scriptSrc(policy: string | undefined) {
  return (policy ?? "")
    .split(";")
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith("script-src"));
}

test("production web responses include baseline browser security headers", async ({ request }) => {
  const response = await request.get("/login");
  const headers = response.headers();

  expect(response.status()).toBe(200);
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["strict-transport-security"]).toContain("max-age=63072000");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("scripts are only allowed through a fresh per-request nonce", async ({ request }) => {
  const first = scriptSrc((await request.get("/login")).headers()["content-security-policy"]);
  const second = scriptSrc((await request.get("/login")).headers()["content-security-policy"]);

  expect(first).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(first).toContain("'strict-dynamic'");
  expect(first).not.toContain("'unsafe-inline'");
  expect(first).not.toContain("'unsafe-eval'");
  expect(first).not.toEqual(second);
});

test("rendered pages carry the nonce on their scripts and run without CSP violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });

  const response = await page.goto("/login");
  const nonce = scriptSrc(response?.headers()["content-security-policy"])?.match(/'nonce-([^']+)'/)?.[1];

  await expect(page.getByRole("heading", { name: "دخول CityMind Tripoli" })).toBeVisible();
  expect(nonce).toBeTruthy();
  const scriptsWithoutNonce = await page.$$eval("script", (scripts) =>
    scripts.filter((script) => !script.nonce && !script.src.includes("/_next/")).length,
  );
  expect(scriptsWithoutNonce).toBe(0);
  expect(violations).toEqual([]);
});
