import type {
  HealthResponse,
  ReportCategorySuggestion,
  SmartReport,
  SmartReportCreateInput,
  SmartReportStatusUpdate,
} from "@citymind/shared";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: HeadersInit;
};

type SmartReportApi = Omit<
  SmartReport,
  | "neighborhoodSlug"
  | "imageUrl"
  | "aiDetectedCategory"
  | "aiConfidence"
  | "duplicateGroupId"
  | "duplicateCandidates"
  | "createdAt"
  | "updatedAt"
> & {
  neighborhood_slug: string;
  image_url?: string | null;
  ai_detected_category?: SmartReport["aiDetectedCategory"];
  ai_confidence?: number | null;
  duplicate_group_id?: string | null;
  duplicate_candidates: string[];
  created_at: string;
  updated_at: string;
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
  estimated_cost: number;
  implementation_time_days: number;
  risk_level: "low" | "medium" | "high" | "critical";
  confidence_score: number;
  recommendation: string;
  created_at: string;
};

export type ScenarioSimulationInput = {
  name: string;
  neighborhood_slug: string;
  actions: string[];
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
  token_type: "local-placeholder";
  production_ready: boolean;
  user: {
    full_name: string;
    email: string;
    role: "citizen" | "municipality_admin" | "decision_maker" | "analyst";
    is_active: boolean;
  };
};

export type AdminOverview = {
  reports_total: number;
  assets_total: number;
  open_reports: number;
  pending_scenarios: number;
  active_predictions: number;
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiClientError(`CityMind API request failed for ${path}`, response.status);
  }

  return response.json() as Promise<T>;
}

function toSmartReport(report: SmartReportApi): SmartReport {
  return {
    ...report,
    neighborhoodSlug: report.neighborhood_slug,
    imageUrl: report.image_url ?? null,
    aiDetectedCategory: report.ai_detected_category ?? null,
    aiConfidence: report.ai_confidence ?? null,
    duplicateGroupId: report.duplicate_group_id ?? null,
    duplicateCandidates: report.duplicate_candidates,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}

function toReportPayload(input: SmartReportCreateInput) {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    neighborhood_slug: input.neighborhoodSlug,
    latitude: input.latitude,
    longitude: input.longitude,
    image_url: input.imageUrl ?? null,
  };
}

export const citymindApi = {
  health: () => request<HealthResponse>("/health"),
  reports: {
    list: async () => {
      const reports = await request<SmartReportApi[]>("/reports");
      return reports.map(toSmartReport);
    },
    create: async (input: SmartReportCreateInput) => {
      const report = await request<SmartReportApi>("/reports", {
        method: "POST",
        body: toReportPayload(input),
      });
      return toSmartReport(report);
    },
    updateStatus: async (id: string, input: SmartReportStatusUpdate) => {
      const report = await request<SmartReportApi>(`/reports/${id}/status`, {
        method: "PATCH",
        body: input,
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
    simulate: (input: ScenarioSimulationInput) =>
      request<ScenarioResult>("/scenarios/simulate", {
        method: "POST",
        body: input,
      }),
    results: () => request<ScenarioResult[]>("/scenarios/results"),
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
    login: (email: string) =>
      request<AuthLoginResponse>("/auth/login", {
        method: "POST",
        body: { email },
      }),
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
  },
};
