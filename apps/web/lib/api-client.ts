import type {
  HealthResponse,
  ReportImageAnalysis,
  ReportImageMetadata,
  ReportCategorySuggestion,
  SmartReport,
  SmartReportCreateInput,
  SmartReportStatusUpdate,
} from "@citymind/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8100";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
};

const AUTH_SESSION_STORAGE_KEY = "citymind.localSession";

function storedCsrfToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { csrf_token?: string };
    return parsed.csrf_token ?? null;
  } catch {
    return null;
  }
}

type SmartReportApi = Omit<
  SmartReport,
  | "neighborhoodSlug"
  | "manualLocation"
  | "locationSource"
  | "imageUrl"
  | "imageUploadStatus"
  | "imageMetadata"
  | "analysisStatus"
  | "imageAnalysis"
  | "duplicateGroupId"
  | "duplicateCandidates"
  | "createdAt"
  | "updatedAt"
> & {
  neighborhood_slug?: string | null;
  manual_location?: string | null;
  location_source: SmartReport["locationSource"];
  image_url?: string | null;
  image_upload_status: SmartReport["imageUploadStatus"];
  image_metadata?: ReportImageMetadataApi | null;
  analysis_status: SmartReport["analysisStatus"];
  image_analysis: ReportImageAnalysisApi;
  duplicate_group_id?: string | null;
  duplicate_candidates: string[];
  created_at: string;
  updated_at: string;
};

type ReportImageMetadataApi = {
  filename: string;
  content_type: string;
  size_bytes: number;
};

type ReportImageAnalysisApi = {
  status: ReportImageAnalysis["status"];
  provider?: string | null;
  message: string;
  completed_at?: string | null;
};

type ReportCategorySuggestionApi = {
  category: ReportCategorySuggestion["category"];
  confidence: number;
  rationale: string;
  duplicate_candidates: string[];
};

export type DashboardSummary = {
  kpis: {
    total_reports: number;
    open_reports: number;
    resolved_reports: number;
    average_severity: number;
    top_neighborhood: string | null;
    top_category: string | null;
  };
  top_neighborhoods: Array<{
    name: string;
    slug: string;
    total_reports: number;
    open_reports: number;
    critical_reports: number;
    priority_score: number;
  }>;
  top_categories: Array<{
    category: string;
    total_reports: number;
  }>;
  priority_areas: Array<{
    name: string;
    slug: string;
    score: number;
    reason: string;
  }>;
  recent_reports: SmartReportApi[];
};

export type DashboardViewSummary = Omit<DashboardSummary, "recent_reports"> & {
  recent_reports: SmartReport[];
};

export type ScoreBreakdownItem = {
  factor: string;
  score: number;
  weight: number;
  contribution: number;
};

export type GreenScoreRow = {
  neighborhood: string;
  neighborhood_slug: string;
  priority_level: string;
  green_score: number;
  green_breakdown: ScoreBreakdownItem[];
  walkability_score: number;
  measurement_date: string;
  source: string;
  formula: Record<string, number>;
};

export type WalkabilityScoreRow = {
  neighborhood: string;
  neighborhood_slug: string;
  priority_level: string;
  walkability_score: number;
  walkability_breakdown: ScoreBreakdownItem[];
  measurement_date: string;
  source: string;
  formula: Record<string, number>;
};

export type MobilityEdge = {
  id: string;
  name: string;
  edge_type: string;
  from_label: string;
  to_label: string;
  coordinates: number[][];
  length_meters: number;
  estimated_speed_kmh: number;
  walkability_weight: number;
  pollution_weight: number;
  safety_weight: number;
  accessibility_weight: number;
};

export type MobilityRouteOption = {
  route_type: "fastest" | "greenest" | "safest" | "most_walkable" | "accessible";
  origin: string;
  destination: string;
  distance_meters: number;
  estimated_minutes: number;
  score: number;
  segments: MobilityEdge[];
  provider_interface: string;
};

export type MobilityRouteComparison = {
  origin: string;
  destination: string;
  route_types: MobilityRouteOption["route_type"][];
  options: MobilityRouteOption[];
  future_providers: string[];
};

export type ScenarioResult = {
  id: string;
  scenario_name: string;
  neighborhood_slug: string;
  actions: string[];
  green_score_delta: number;
  temperature_delta: number;
  air_quality_delta: number;
  walkability_delta: number;
  traffic_delta: number;
  pollution_delta: number;
  waste_cleanliness_delta: number;
  estimated_cost: number;
  implementation_time_days: number;
  risk_level: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  recommendation: string;
  baseline: {
    neighborhood_slug: string;
    neighborhood_name: string;
    priority_level: string;
    measurement_date: string;
    overall_green_score: number;
    green_coverage_score: number;
    air_quality_score: number;
    waste_cleanliness_score: number;
    walkability_score: number;
    heat_comfort_score: number;
    traffic_pressure_index: number;
    pollution_pressure_index: number;
    open_report_count: number;
  };
  projected_scores: {
    overall_green_score: number;
    air_quality_score: number;
    waste_cleanliness_score: number;
    walkability_score: number;
    traffic_pressure_index: number;
    pollution_pressure_index: number;
  };
  uncertainty: Record<string, { low: number; high: number }>;
  budget: {
    limit: number | null;
    within_budget: boolean;
    variance: number | null;
  };
  intensity: "pilot" | "standard" | "expanded";
  execution_mode: "parallel" | "sequential";
  methodology: {
    version: string;
    model_type: string;
    official_decision_ready: false;
    data_quality_score: number;
    sources: string[];
    interaction_adjustments: string[];
    assumptions: string[];
  };
  warnings: string[];
  action_impacts: Array<Record<string, string | number>>;
  persistence_backend: "memory" | "database";
  created_at: string;
};

export type ScenarioSimulationInput = {
  name: string;
  neighborhood_slug: string;
  actions: string[];
  intensity?: ScenarioResult["intensity"];
  execution_mode?: ScenarioResult["execution_mode"];
  budget_limit?: number | null;
};

export type PredictionSignal = {
  id: string;
  prediction_type: string;
  neighborhood: string;
  neighborhood_slug: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  risk_score: number;
  prediction_window_hours: number;
  message: string;
  evidence_json: Record<string, unknown>;
};

export type AssistantQuery = {
  id: string;
  question: string;
  answer: string;
  data_sources_json: Record<string, unknown>;
  confidence_score: number;
  created_at: string;
  provider: string;
};

export type AuthLoginResponse = {
  access_token: string;
  csrf_token?: string;
  token_type: "bearer";
  expires_in: number;
  production_ready: boolean;
  user: {
    full_name: string;
    email: string;
    role: CityMindUserRole;
    is_active: boolean;
  };
};

export type CityMindUserRole =
  | "owner"
  | "citizen"
  | "municipality_admin"
  | "decision_maker"
  | "analyst"
  | "police"
  | "red_cross"
  | "civil_defense";

export type CityMindUser = {
  full_name: string;
  email: string;
  role: CityMindUserRole;
  is_active: boolean;
  password?: string;
};

export type AdminOverview = {
  portal_name: string;
  role: CityMindUserRole;
  visible_categories: Array<SmartReport["category"] | "all">;
  visibility_note: string;
  notification_provider_status: "not_configured";
  official_gis_status: "not_configured";
  reports_total: number;
  assets_total: number;
  open_reports: number;
  pending_scenarios: number;
  active_predictions: number;
  monthly_summary: {
    month: string;
    total_reports: number;
    open_reports: number;
    critical_reports: number;
    source: string;
  };
  hotspots: Array<{
    name: string;
    slug: string;
    category: SmartReport["category"];
    total_reports: number;
    open_reports: number;
    critical_reports: number;
    priority_score: number;
  }>;
};

export type AdminAsset = {
  id: string;
  name: string;
  asset_type: string;
  status: "active" | "needs_maintenance" | "inactive" | "planned";
  neighborhood_slug: string;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const csrfToken = method === "GET" ? null : storedCsrfToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      window.dispatchEvent(new Event("citymind.authSessionChanged"));
    }
    const errorPayload = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new ApiClientError(errorPayload?.detail ?? `CityMind API request failed for ${path}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toSmartReport(report: SmartReportApi): SmartReport {
  return {
    ...report,
    neighborhoodSlug: report.neighborhood_slug ?? null,
    manualLocation: report.manual_location ?? null,
    locationSource: report.location_source,
    imageUrl: report.image_url ?? null,
    imageUploadStatus: report.image_upload_status,
    imageMetadata: report.image_metadata ? toReportImageMetadata(report.image_metadata) : null,
    analysisStatus: report.analysis_status,
    imageAnalysis: toReportImageAnalysis(report.image_analysis),
    duplicateGroupId: report.duplicate_group_id ?? null,
    duplicateCandidates: report.duplicate_candidates,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}

function toReportImageMetadata(metadata: ReportImageMetadataApi): ReportImageMetadata {
  return {
    filename: metadata.filename,
    contentType: metadata.content_type,
    sizeBytes: metadata.size_bytes,
  };
}

function toReportImageAnalysis(analysis: ReportImageAnalysisApi): ReportImageAnalysis {
  return {
    status: analysis.status,
    provider: analysis.provider ?? null,
    message: analysis.message,
    completedAt: analysis.completed_at ?? null,
  };
}

function toReportPayload(input: SmartReportCreateInput) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    neighborhood_slug: input.neighborhoodSlug ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    manual_location: input.manualLocation ?? null,
    location_source: input.locationSource,
    image_url: input.imageUrl ?? null,
    image_upload_status: input.imageUploadStatus,
    image_metadata: input.imageMetadata
      ? {
          filename: input.imageMetadata.filename,
          content_type: input.imageMetadata.contentType,
          size_bytes: input.imageMetadata.sizeBytes,
        }
      : null,
  };
}

export const citymindApi = {
  health: () => request<HealthResponse>("/health"),
  reports: {
    list: async () => {
      const reports = await request<SmartReportApi[]>("/reports");
      return reports.map(toSmartReport);
    },
    listMine: async () => {
      const reports = await request<SmartReportApi[]>("/reports/mine");
      return reports.map(toSmartReport);
    },
    create: async (input: SmartReportCreateInput) => {
      const report = await request<SmartReportApi>("/reports", {
        method: "POST",
        body: toReportPayload(input),
      });
      return toSmartReport(report);
    },
    updateStatus: async (token: string, id: string, input: SmartReportStatusUpdate) => {
      const report = await request<SmartReportApi>(`/reports/${id}/status`, {
        method: "PATCH",
        body: input,
        headers: { Authorization: `Bearer ${token}` },
      });
      return toSmartReport(report);
    },
    suggestCategory: async (input: SmartReportCreateInput): Promise<ReportCategorySuggestion> => {
      const suggestion = await request<ReportCategorySuggestionApi>("/reports/suggest-category", {
        method: "POST",
        body: toReportPayload(input),
      });
      return {
        category: suggestion.category,
        confidence: suggestion.confidence,
        rationale: suggestion.rationale,
        duplicateCandidates: suggestion.duplicate_candidates,
      };
    },
  },
  dashboard: {
    summary: async (): Promise<DashboardViewSummary> => {
      const summary = await request<DashboardSummary>("/dashboard/summary");
      return {
        ...summary,
        recent_reports: summary.recent_reports.map(toSmartReport),
      };
    },
  },
  scores: {
    green: () => request<GreenScoreRow[]>("/green-score/neighborhoods"),
    walkability: () => request<WalkabilityScoreRow[]>("/walkability/neighborhoods"),
  },
  mobility: {
    compareRoutes: (origin: string, destination: string) =>
      request<MobilityRouteComparison>(
        `/mobility/routes?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`,
      ),
  },
  scenarios: {
    simulate: (token: string, input: ScenarioSimulationInput) =>
      request<ScenarioResult>("/scenarios/simulate", {
        method: "POST",
        body: input,
        headers: { Authorization: `Bearer ${token}` },
      }),
    results: (token: string) =>
      request<ScenarioResult[]>("/scenarios/results", {
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
  predictions: {
    list: () => request<PredictionSignal[]>("/predictions"),
  },
  assistant: {
    ask: (question: string) =>
      request<AssistantQuery>("/assistant/query", {
        method: "POST",
        body: { question },
      }),
    history: () => request<AssistantQuery[]>("/assistant/queries"),
  },
  auth: {
    login: (email: string, password: string) =>
      request<AuthLoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    register: (fullName: string, email: string, password: string) =>
      request<AuthLoginResponse>("/auth/register", {
        method: "POST",
        body: { full_name: fullName, email, password },
      }),
    me: (token: string) =>
      request<AuthLoginResponse["user"]>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
  },
  admin: {
    overview: (token: string) =>
      request<AdminOverview>("/admin/overview", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    reports: (token: string) =>
      request<SmartReportApi[]>("/admin/reports", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((reports) => reports.map(toSmartReport)),
    report: (token: string, id: string) =>
      request<SmartReportApi>(`/admin/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(toSmartReport),
    updateReportStatus: (token: string, id: string, status: SmartReportStatusUpdate["status"]) =>
      request<SmartReportApi>(`/admin/reports/${id}/status`, {
        method: "PATCH",
        body: { status },
        headers: { Authorization: `Bearer ${token}` },
      }).then(toSmartReport),
    assets: (token: string) =>
      request<AdminAsset[]>("/admin/assets", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    updateAssetStatus: (token: string, id: string, status: AdminAsset["status"]) =>
      request<AdminAsset>(`/admin/assets/${id}/status`, {
        method: "PATCH",
        body: { status },
        headers: { Authorization: `Bearer ${token}` },
      }),
    users: (token: string) =>
      request<CityMindUser[]>("/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    upsertUser: (token: string, input: CityMindUser) =>
      request<CityMindUser>("/admin/users", {
        method: "POST",
        body: input,
        headers: { Authorization: `Bearer ${token}` },
      }),
  },
};
