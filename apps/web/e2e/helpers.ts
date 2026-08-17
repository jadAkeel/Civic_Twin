import { expect, type Page, type Route } from "@playwright/test";

const API_URL_PATTERN = /127\.0\.0\.1:(8000|8100)|localhost:(8000|8100)|\/api-proxy\//;

type ConsoleWatcher = {
  errors: string[];
  assertNoErrors: () => void;
};

export function watchConsole(page: Page): ConsoleWatcher {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  return {
    errors,
    assertNoErrors: () => {
      expect(errors.filter(isRelevantConsoleError)).toEqual([]);
    },
  };
}

export async function blockApi(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, (route) => route.abort("failed"));
}

export async function mockMapTiles(page: Page) {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64",
      ),
    }),
  );
}

export async function mockDelayedDashboardSummary(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, async (route) => {
    const url = route.request().url();
    if (url.includes("/dashboard/summary")) {
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyDashboardSummary),
      });
      return;
    }

    await route.abort("failed");
  });
}

export async function mockOwnerSession(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, async (route) => {
    const request = route.request();
    const url = request.url();

    if (url.endsWith("/auth/login")) {
      await fulfillJson(route, ownerSession);
      return;
    }

    if (url.endsWith("/admin/overview")) {
      await fulfillJson(route, overviewFor(ownerSession.user.role, [apiReport], 1));
      return;
    }

    if (url.endsWith("/admin/reports")) {
      await fulfillJson(route, [apiReport]);
      return;
    }

    if (url.includes("/admin/reports/") && url.endsWith("/status")) {
      await fulfillJson(route, { ...apiReport, status: "resolved", updated_at: new Date().toISOString() });
      return;
    }

    if (url.endsWith("/admin/assets")) {
      await fulfillJson(route, [adminAsset]);
      return;
    }

    if (url.includes("/admin/assets/") && url.endsWith("/status")) {
      await fulfillJson(route, { ...adminAsset, status: "planned" });
      return;
    }

    if (url.endsWith("/admin/users")) {
      if (request.method() === "POST") {
        await fulfillJson(route, request.postDataJSON());
        return;
      }

      await fulfillJson(route, [ownerSession.user]);
      return;
    }

    await route.abort("failed");
  });
}

export async function mockAgencySession(page: Page, role: "police" | "red_cross" | "civil_defense") {
  await mockMapTiles(page);
  const session = sessionsByRole[role];
  const reportsByRole = {
    police: [policeReport],
    red_cross: [medicalReport],
    civil_defense: [fireReport],
  };
  const reports = reportsByRole[role];

  await page.route(API_URL_PATTERN, async (route) => {
    const request = route.request();
    const url = request.url();

    if (url.endsWith("/auth/login")) {
      await fulfillJson(route, session);
      return;
    }

    if (url.endsWith("/admin/overview")) {
      await fulfillJson(route, overviewFor(role, reports, 0));
      return;
    }

    if (url.endsWith("/admin/reports")) {
      await fulfillJson(route, reports);
      return;
    }

    if (url.includes("/admin/reports/") && request.method() === "GET") {
      const report = reports.find((item) => url.endsWith(`/admin/reports/${item.id}`));
      if (report) {
        await fulfillJson(route, report);
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Report is outside this agency portal" }),
      });
      return;
    }

    if (url.includes("/admin/reports/") && url.endsWith("/status")) {
      const report = reports.find((item) => url.includes(`/admin/reports/${item.id}/`));
      if (report) {
        await fulfillJson(route, { ...report, status: "in_progress", updated_at: new Date().toISOString() });
        return;
      }
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Report is outside this agency portal" }),
      });
      return;
    }

    await route.abort("failed");
  });
}

export async function mockDeniedAuth(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, routeForStatus(403, { detail: "Access denied" }));
}

export async function mockCitizenRegistration(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, async (route) => {
    const url = route.request().url();

    if (url.endsWith("/auth/register")) {
      const body = route.request().postDataJSON();
      await fulfillJson(
        route,
        {
          access_token: "signed-new-citizen-token",
          token_type: "bearer",
          expires_in: 3600,
          production_ready: false,
          user: {
            full_name: body.full_name,
            email: body.email,
            role: "citizen",
            is_active: true,
          },
        },
        201,
      );
      return;
    }

    await route.abort("failed");
  });
}

export async function mockStoredCitizenSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("citymind.localSession", JSON.stringify(session));
  }, citizenSession);
}

export async function mockStoredOwnerSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem("citymind.localSession", JSON.stringify(session));
  }, ownerSession);
}

export async function mockCitizenReportsApi(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, async (route) => {
    const request = route.request();
    const url = request.url();

    if (url.endsWith("/reports/mine") && request.method() === "GET") {
      await fulfillJson(route, [apiReport]);
      return;
    }

    if (url.endsWith("/reports") && request.method() === "POST") {
      const body = request.postDataJSON();
      await fulfillJson(
        route,
        {
          id: "TRP-E2E-CITIZEN",
          title: body.title,
          description: body.description,
          category: body.category,
          severity: body.severity,
          status: "submitted",
          neighborhood: "El Tal",
          neighborhood_slug: body.neighborhood_slug,
          latitude: body.latitude,
          longitude: body.longitude,
          manual_location: body.manual_location,
          location_source: body.location_source,
          image_url: null,
          image_upload_status: body.image_upload_status,
          image_metadata: body.image_metadata,
          analysis_status: body.category === "security_incident" ? "manual_review_required" : "not_configured",
          image_analysis:
            body.category === "security_incident"
              ? {
                  status: "manual_review_required",
                  provider: null,
                  message:
                    "Security and public safety reports require municipal review. For immediate danger, contact emergency services.",
                  completed_at: null,
                }
              : {
                  status: "not_configured",
                  provider: null,
                  message:
                    "Automated image analysis is not configured yet. This report was submitted without automated image analysis.",
                  completed_at: null,
                },
          duplicate_group_id: null,
          duplicate_candidates: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        201,
      );
      return;
    }

    await route.abort("failed");
  });
}

export async function mockCitizenReportSubmitFailure(page: Page) {
  await mockMapTiles(page);
  await page.route(API_URL_PATTERN, async (route) => {
    const request = route.request();
    const url = request.url();

    if (url.endsWith("/reports/mine") && request.method() === "GET") {
      await fulfillJson(route, [apiReport]);
      return;
    }

    if (url.endsWith("/reports") && request.method() === "POST") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Service unavailable" }),
      });
      return;
    }

    await route.abort("failed");
  });
}

export async function expectPageReady(page: Page, heading: string) {
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Application error");
}

function routeForStatus(status: number, body: unknown) {
  return (route: Route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
}

function fulfillJson(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function isRelevantConsoleError(error: string) {
  return ![
    "Failed to load resource",
    "net::ERR_ABORTED",
    "net::ERR_FAILED",
    "tile.openstreetmap.org",
    "favicon.ico",
  ].some((ignored) => error.includes(ignored));
}

const ownerSession = {
  access_token: "signed-owner-token",
  token_type: "bearer",
  expires_in: 3600,
  production_ready: false,
  user: {
    full_name: "Jad Akeel",
    email: "jadakeel05@gmail.com",
    role: "owner",
    is_active: true,
  },
};

const citizenSession = {
  access_token: "signed-citizen-token",
  token_type: "bearer",
  expires_in: 3600,
  production_ready: false,
  user: {
    full_name: "Demo Citizen",
    email: "citizen.demo@citymind.local",
    role: "citizen",
    is_active: true,
  },
};

const sessionsByRole = {
  police: {
    access_token: "signed-police-token",
    token_type: "bearer",
    expires_in: 3600,
    production_ready: false,
    user: {
      full_name: "Demo Police Operator",
      email: "police.demo@citymind.local",
      role: "police",
      is_active: true,
    },
  },
  red_cross: {
    access_token: "signed-red-cross-token",
    token_type: "bearer",
    expires_in: 3600,
    production_ready: false,
    user: {
      full_name: "Demo Lebanese Red Cross Operator",
      email: "redcross.demo@citymind.local",
      role: "red_cross",
      is_active: true,
    },
  },
  civil_defense: {
    access_token: "signed-civil-defense-token",
    token_type: "bearer",
    expires_in: 3600,
    production_ready: false,
    user: {
      full_name: "Demo Civil Defense Operator",
      email: "civildefense.demo@citymind.local",
      role: "civil_defense",
      is_active: true,
    },
  },
} as const;

function overviewFor(role: string, reports: Array<typeof apiReport>, assetsTotal: number) {
  const portalName =
    role === "police"
      ? "Police portal"
      : role === "red_cross"
        ? "Lebanese Red Cross portal"
        : role === "civil_defense"
          ? "Civil Defense / Fire portal"
          : "Municipality portal";
  const visibleCategories =
    role === "police"
      ? ["security_incident"]
      : role === "red_cross"
        ? ["medical_emergency"]
        : role === "civil_defense"
          ? ["fire_hazard"]
          : ["all"];

  return {
    portal_name: portalName,
    role,
    visible_categories: visibleCategories,
    visibility_note: visibleCategories[0] === "all" ? "Municipality roles can see all demo reports" : "Filtered by agency role",
    notification_provider_status: "not_configured",
    official_gis_status: "not_configured",
    reports_total: reports.length,
    assets_total: assetsTotal,
    open_reports: reports.length,
    pending_scenarios: 0,
    active_predictions: 1,
    monthly_summary: {
      month: "June 2026",
      total_reports: reports.length,
      open_reports: reports.length,
      critical_reports: reports.filter((report) => report.severity === "critical").length,
      source: "demo_seed",
    },
    hotspots: reports.map((report) => ({
      name: report.neighborhood,
      slug: report.neighborhood_slug,
      category: report.category,
      total_reports: 1,
      open_reports: 1,
      critical_reports: report.severity === "critical" ? 1 : 0,
      priority_score: report.severity === "critical" ? 15 : 13,
    })),
  };
}

const apiReport = {
  id: "TRP-E2E-1",
  title: "E2E broken sidewalk",
  description: "A test report for municipal workflow coverage.",
  category: "pothole",
  severity: "high",
  status: "validated",
  neighborhood: "Old Souks",
  neighborhood_slug: "old-souks",
  latitude: 34.4359,
  longitude: 35.8445,
  manual_location: null,
  location_source: "demo_seed",
  image_url: null,
  image_upload_status: "none",
  image_metadata: null,
  analysis_status: "not_configured",
  image_analysis: {
    status: "not_configured",
    provider: null,
    message: "Automated image analysis is not configured yet.",
    completed_at: null,
  },
  duplicate_group_id: null,
  duplicate_candidates: [],
  created_at: "2026-06-16T21:00:00.000Z",
  updated_at: "2026-06-16T21:00:00.000Z",
};

const policeReport = {
  ...apiReport,
  id: "TRP-E2E-POLICE",
  title: "E2E traffic security incident",
  category: "security_incident",
  severity: "high",
  neighborhood: "El Tal",
  neighborhood_slug: "el-tal",
  latitude: 34.4378,
  longitude: 35.837,
  analysis_status: "manual_review_required",
  image_analysis: {
    status: "manual_review_required",
    provider: null,
    message: "Police routing is not configured. This report requires manual review.",
    completed_at: null,
  },
};

const medicalReport = {
  ...apiReport,
  id: "TRP-E2E-RED-CROSS",
  title: "E2E medical assistance request",
  category: "medical_emergency",
  severity: "critical",
  neighborhood: "Old Souks",
  neighborhood_slug: "old-souks",
  latitude: 34.4359,
  longitude: 35.8445,
  analysis_status: "manual_review_required",
  image_analysis: {
    status: "manual_review_required",
    provider: null,
    message: "Lebanese Red Cross routing is not configured. This report requires manual review.",
    completed_at: null,
  },
};

const fireReport = {
  ...apiReport,
  id: "TRP-E2E-FIRE",
  title: "E2E smoke concern near warehouse",
  category: "fire_hazard",
  severity: "critical",
  neighborhood: "Port Area",
  neighborhood_slug: "port-area",
  latitude: 34.4588,
  longitude: 35.8222,
  analysis_status: "manual_review_required",
  image_analysis: {
    status: "manual_review_required",
    provider: null,
    message: "Civil Defense routing is not configured. This report requires manual review.",
    completed_at: null,
  },
};

const adminAsset = {
  id: "asset-e2e-1",
  name: "E2E street light",
  asset_type: "street_light",
  status: "needs_maintenance",
  neighborhood_slug: "old-souks",
};

const emptyDashboardSummary = {
  kpis: {
    total_reports: 0,
    open_reports: 0,
    resolved_reports: 0,
    average_severity: 0,
    top_neighborhood: null,
    top_category: null,
  },
  top_neighborhoods: [],
  top_categories: [],
  priority_areas: [],
  recent_reports: [],
};
