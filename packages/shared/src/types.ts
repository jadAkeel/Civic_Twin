export type CityMindModule = {
  name: string;
  phase: string;
  status: "placeholder" | "planned" | "active";
};

export type CityMindRouteKey =
  | "dashboard"
  | "map"
  | "reports"
  | "green-score"
  | "mobility"
  | "simulator"
  | "predictions"
  | "ask-city"
  | "admin";

export type CityMindRoute = {
  key: CityMindRouteKey;
  label: string;
  path: string;
  module: string;
  phase: string;
  status: "shell" | "planned" | "active";
  summary: string;
};

export type TripoliNeighborhoodName =
  | "Al Mina"
  | "El Tal"
  | "Bab Al Tebbaneh"
  | "Jabal Mohsen"
  | "Qoubbeh"
  | "Abu Samra"
  | "Old Souks"
  | "Port Area"
  | "Al Zahriyeh";

export type HealthResponse = {
  status: "ok";
  service: string;
  project: string;
  city: string;
  environment: string;
  version: string;
};

export type ReportCategory =
  | "pothole"
  | "garbage"
  | "broken_sidewalk"
  | "street_lighting"
  | "water_leakage"
  | "traffic_obstruction"
  | "accessibility_issue"
  | "pollution"
  | "public_safety"
  | "other";

export type ReportSeverity = "low" | "medium" | "high" | "critical";

export type ReportStatus =
  | "submitted"
  | "validated"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "duplicate";

export type SmartReport = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  neighborhood: TripoliNeighborhoodName;
  neighborhoodSlug: string;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
  aiDetectedCategory?: ReportCategory | null;
  aiConfidence?: number | null;
  duplicateGroupId?: string | null;
  duplicateCandidates: string[];
  createdAt: string;
  updatedAt: string;
};

export type SmartReportCreateInput = {
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  neighborhoodSlug: string;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
};

export type SmartReportStatusUpdate = {
  status: ReportStatus;
};

export type ReportCategorySuggestion = {
  category: ReportCategory;
  confidence: number;
  rationale: string;
  duplicateCandidates: string[];
};

export type DigitalTwinLayerType = "buildings" | "terrain" | "mobility" | "assets" | "risk";

export type DigitalTwinLayer = {
  id: string;
  name: string;
  type: DigitalTwinLayerType;
  source: "CityGML" | "3D Tiles" | "3DCityDB" | "CityMind API";
  enabledByDefault: boolean;
};
