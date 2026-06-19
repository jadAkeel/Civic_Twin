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
  phase: "Resident" | "Municipality";
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
  | "traffic_congestion"
  | "pothole"
  | "waste"
  | "security_incident"
  | "medical_emergency"
  | "fire_hazard"
  | "other";

export type ReportSeverity = "low" | "medium" | "high" | "critical";

export type ReportStatus =
  | "submitted"
  | "validated"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "duplicate";

export type ReportLocationSource = "gps" | "manual" | "map" | "demo_seed";

export type ImageUploadStatus = "none" | "local_preview_only" | "stored";

export type AnalysisStatus =
  | "not_configured"
  | "pending"
  | "completed"
  | "failed"
  | "manual_review_required";

export type ReportImageMetadata = {
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type ReportImageAnalysis = {
  status: AnalysisStatus;
  provider?: string | null;
  message: string;
  completedAt?: string | null;
};

export type SmartReport = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  status: ReportStatus;
  neighborhood: string;
  neighborhoodSlug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  manualLocation?: string | null;
  locationSource: ReportLocationSource;
  imageUrl?: string | null;
  imageUploadStatus: ImageUploadStatus;
  imageMetadata?: ReportImageMetadata | null;
  analysisStatus: AnalysisStatus;
  imageAnalysis: ReportImageAnalysis;
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
  neighborhoodSlug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  manualLocation?: string | null;
  locationSource: ReportLocationSource;
  imageUrl?: string | null;
  imageUploadStatus: ImageUploadStatus;
  imageMetadata?: ReportImageMetadata | null;
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
