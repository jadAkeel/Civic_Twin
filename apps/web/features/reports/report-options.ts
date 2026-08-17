import type {
  ReportCategory,
  ReportSeverity,
  ReportStatus,
  SmartReport,
  TripoliNeighborhoodName,
} from "@citymind/shared";

export type NeighborhoodOption = {
  name: TripoliNeighborhoodName;
  displayName: string;
  slug: string;
  latitude: number;
  longitude: number;
};

export const reportCategories: { value: ReportCategory; label: string }[] = [
  { value: "traffic_congestion", label: "ازدحام مروري" },
  { value: "pothole", label: "حفرة أو ضرر في الطريق" },
  { value: "waste", label: "نفايات / قمامة" },
  { value: "security_incident", label: "حادث أمني أو سلامة عامة" },
  { value: "medical_emergency", label: "حالة طبية / مراجعة الصليب الأحمر" },
  { value: "fire_hazard", label: "خطر حريق / مراجعة الدفاع المدني" },
  { value: "other", label: "أخرى" },
];

export const reportSeverities: { value: ReportSeverity; label: string }[] = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "مرتفعة" },
  { value: "critical", label: "حرجة" },
];

export const reportStatuses: { value: ReportStatus; label: string }[] = [
  { value: "submitted", label: "مُرسل" },
  { value: "validated", label: "مراجَع" },
  { value: "in_progress", label: "قيد المعالجة" },
  { value: "resolved", label: "تم الحل" },
  { value: "duplicate", label: "مكرر" },
  { value: "rejected", label: "مرفوض" },
];

export const tripoliNeighborhoodOptions: NeighborhoodOption[] = [
  { name: "Al Mina", displayName: "الميناء", slug: "al-mina", latitude: 34.4471, longitude: 35.8178 },
  { name: "El Tal", displayName: "التل", slug: "el-tal", latitude: 34.4374, longitude: 35.8365 },
  { name: "Bab Al Tebbaneh", displayName: "باب التبانة", slug: "bab-al-tebbaneh", latitude: 34.4442, longitude: 35.8434 },
  { name: "Jabal Mohsen", displayName: "جبل محسن", slug: "jabal-mohsen", latitude: 34.4511, longitude: 35.8503 },
  { name: "Qoubbeh", displayName: "القبة", slug: "qoubbeh", latitude: 34.4327, longitude: 35.8613 },
  { name: "Abu Samra", displayName: "أبو سمراء", slug: "abu-samra", latitude: 34.4252, longitude: 35.8427 },
  { name: "Old Souks", displayName: "الأسواق القديمة", slug: "old-souks", latitude: 34.4356, longitude: 35.8449 },
  { name: "Port Area", displayName: "منطقة المرفأ", slug: "port-area", latitude: 34.4592, longitude: 35.8221 },
  { name: "Al Zahriyeh", displayName: "الزاهرية", slug: "al-zahriyeh", latitude: 34.4398, longitude: 35.8488 },
];

const now = "2026-06-16T21:00:00.000Z";

export const fallbackReports: SmartReport[] = [
  {
    id: "TRP-1001",
    title: "تراكم نفايات قرب كتل سكنية كثيفة",
    description: "بلاغ تجريبي عن تراكم أكياس النفايات قبل موعد الجمع في باب التبانة.",
    category: "waste",
    severity: "critical",
    status: "submitted",
    neighborhood: "باب التبانة",
    neighborhoodSlug: "bab-al-tebbaneh",
    latitude: 34.4446,
    longitude: 35.8439,
    manualLocation: null,
    locationSource: "demo_seed",
    imageUrl: null,
    imageUploadStatus: "none",
    imageMetadata: null,
    analysisStatus: "not_configured",
    imageAnalysis: {
      status: "not_configured",
      provider: null,
      message: "خدمة تحليل الصور الآلي غير مهيأة بعد.",
      completedAt: null,
    },
    duplicateGroupId: null,
    duplicateCandidates: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "TRP-1002",
    title: "ازدحام مروري قرب حركة النقل في التل",
    description: "بلاغ تجريبي عن ازدحام حول محور الحركة المركزي.",
    category: "traffic_congestion",
    severity: "high",
    status: "validated",
    neighborhood: "التل",
    neighborhoodSlug: "el-tal",
    latitude: 34.4378,
    longitude: 35.837,
    manualLocation: null,
    locationSource: "demo_seed",
    imageUrl: null,
    imageUploadStatus: "none",
    imageMetadata: null,
    analysisStatus: "not_configured",
    imageAnalysis: {
      status: "not_configured",
      provider: null,
      message: "خدمة بيانات المرور غير مهيأة بعد.",
      completedAt: null,
    },
    duplicateGroupId: null,
    duplicateCandidates: [],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "TRP-1003",
    title: "أرصفة متضررة في الأسواق القديمة",
    description: "بلاغ تجريبي عن مسارات مشاة غير مستوية في المنطقة التجارية التراثية.",
    category: "pothole",
    severity: "high",
    status: "in_progress",
    neighborhood: "الأسواق القديمة",
    neighborhoodSlug: "old-souks",
    latitude: 34.4359,
    longitude: 35.8445,
    manualLocation: null,
    locationSource: "demo_seed",
    imageUrl: null,
    imageUploadStatus: "none",
    imageMetadata: null,
    analysisStatus: "not_configured",
    imageAnalysis: {
      status: "not_configured",
      provider: null,
      message: "خدمة تحليل الصور الآلي غير مهيأة بعد.",
      completedAt: null,
    },
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
