import type {
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  SmartReport,
  TripoliNeighborhoodName,
} from "@citymind/shared";

export type NeighborhoodOption = {
  name: TripoliNeighborhoodName;
  slug: string;
  latitude: number;
  longitude: number;
};

export const reportCategories: { value: ReportCategory; label: string }[] = [
  { value: "garbage", label: "Garbage" },
  { value: "broken_sidewalk", label: "Broken sidewalk" },
  { value: "street_lighting", label: "Street lighting" },
  { value: "traffic_obstruction", label: "Traffic obstruction" },
  { value: "pothole", label: "Pothole" },
  { value: "water_leakage", label: "Water leakage" },
  { value: "accessibility_issue", label: "Accessibility issue" },
  { value: "pollution", label: "Pollution" },
  { value: "public_safety", label: "Public safety" },
  { value: "other", label: "Other" },
];

export const reportSeverities: { value: ReportSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const reportStatuses: { value: ReportStatus; label: string }[] = [
  { value: "submitted", label: "Submitted" },
  { value: "validated", label: "Validated" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "duplicate", label: "Duplicate" },
  { value: "rejected", label: "Rejected" },
];

export const tripoliNeighborhoodOptions: NeighborhoodOption[] = [
  { name: "Al Mina", slug: "al-mina", latitude: 34.4471, longitude: 35.8178 },
  { name: "El Tal", slug: "el-tal", latitude: 34.4374, longitude: 35.8365 },
  { name: "Bab Al Tebbaneh", slug: "bab-al-tebbaneh", latitude: 34.4442, longitude: 35.8434 },
  { name: "Jabal Mohsen", slug: "jabal-mohsen", latitude: 34.4511, longitude: 35.8503 },
  { name: "Qoubbeh", slug: "qoubbeh", latitude: 34.4327, longitude: 35.8613 },
  { name: "Abu Samra", slug: "abu-samra", latitude: 34.4252, longitude: 35.8427 },
  { name: "Old Souks", slug: "old-souks", latitude: 34.4356, longitude: 35.8449 },
  { name: "Port Area", slug: "port-area", latitude: 34.4592, longitude: 35.8221 },
  { name: "Al Zahriyeh", slug: "al-zahriyeh", latitude: 34.4398, longitude: 35.8488 },
];

const now = "2026-06-16T21:00:00.000Z";

export const fallbackReports: SmartReport[] = [
  {
    id: "TRP-1001",
    title: "Garbage accumulation near dense residential blocks",
    description: "Demo report of waste bags accumulating before pickup in Bab Al Tebbaneh.",
    category: "garbage",
    severity: "critical",
    status: "submitted",
    neighborhood: "Bab Al Tebbaneh",
    neighborhoodSlug: "bab-al-tebbaneh",
    latitude: 34.4446,
    longitude: 35.8439,
    imageUrl: null,
    aiDetectedCategory: "garbage",
    aiConfidence: 0.82,
    duplicateGroupId: null,
    duplicateCandidates: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "TRP-1002",
    title: "Traffic congestion near El Tal transit activity",
    description: "Demo congestion report around the central movement corridor.",
    category: "traffic_obstruction",
    severity: "high",
    status: "validated",
    neighborhood: "El Tal",
    neighborhoodSlug: "el-tal",
    latitude: 34.4378,
    longitude: 35.837,
    imageUrl: null,
    aiDetectedCategory: null,
    aiConfidence: null,
    duplicateGroupId: null,
    duplicateCandidates: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "TRP-1003",
    title: "Broken sidewalks in Old Souks",
    description: "Demo report for uneven pedestrian paths in the heritage commercial area.",
    category: "broken_sidewalk",
    severity: "high",
    status: "in_progress",
    neighborhood: "Old Souks",
    neighborhoodSlug: "old-souks",
    latitude: 34.4359,
    longitude: 35.8445,
    imageUrl: null,
    aiDetectedCategory: null,
    aiConfidence: null,
    duplicateGroupId: null,
    duplicateCandidates: [],
    createdAt: now,
    updatedAt: now,
  },
];

export function categoryLabel(category: ReportCategory): string {
  return reportCategories.find((item) => item.value === category)?.label ?? category;
}

export function statusLabel(status: ReportStatus): string {
  return reportStatuses.find((item) => item.value === status)?.label ?? status;
}
