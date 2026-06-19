import type { CityMindUserRole } from "@/lib/api-client";
import type { ReportLocationSource, ReportSeverity, ReportStatus } from "@citymind/shared";

export const neighborhoodLabels: Record<string, string> = {
  "Al Mina": "الميناء",
  "El Tal": "التل",
  "Bab Al Tebbaneh": "باب التبانة",
  "Jabal Mohsen": "جبل محسن",
  Qoubbeh: "القبة",
  "Abu Samra": "أبو سمراء",
  "Old Souks": "الأسواق القديمة",
  "Port Area": "منطقة المرفأ",
  "Al Zahriyeh": "الزاهرية",
};

export function neighborhoodLabel(value: string | null | undefined) {
  if (!value) return "لا توجد بيانات";
  return neighborhoodLabels[value] ?? value;
}

export function roleLabel(role: CityMindUserRole | "not signed in" | string) {
  const labels: Record<string, string> = {
    owner: "رئيس البلدية",
    citizen: "مواطن",
    municipality_admin: "مسؤول بلدي",
    decision_maker: "صاحب قرار",
    analyst: "محلل",
    police: "شرطة",
    red_cross: "الصليب الأحمر اللبناني",
    civil_defense: "الدفاع المدني",
    "not signed in": "غير مسجل الدخول",
  };
  return labels[role] ?? role;
}

export function severityLabel(severity: ReportSeverity | string) {
  const labels: Record<string, string> = {
    low: "منخفضة",
    medium: "متوسطة",
    high: "مرتفعة",
    critical: "حرجة",
  };
  return labels[severity] ?? severity;
}

export function statusLabelArabic(status: ReportStatus | string) {
  const labels: Record<string, string> = {
    submitted: "مُرسل",
    validated: "مراجَع",
    in_progress: "قيد المعالجة",
    resolved: "تم الحل",
    duplicate: "مكرر",
    rejected: "مرفوض",
    active: "نشط",
    needs_maintenance: "بحاجة إلى صيانة",
    inactive: "غير نشط",
    planned: "مخطط",
    not_configured: "غير مهيأ",
    local_fallback: "بيانات محلية تجريبية",
    demo_seed: "بيانات تجريبية",
  };
  return labels[status] ?? status;
}

export function locationSourceLabelArabic(source: ReportLocationSource) {
  const labels: Record<ReportLocationSource, string> = {
    gps: "موقع GPS من جهاز المواطن",
    map: "موقع محدد على خريطة طرابلس",
    manual: "موقع مكتوب يدويًا",
    demo_seed: "موقع تجريبي",
  };
  return labels[source];
}

export function providerLabel(value: string) {
  const labels: Record<string, string> = {
    api: "API",
    fallback: "احتياطي محلي",
    local_fallback: "احتياطي محلي",
    demo_seed: "بيانات تجريبية",
    demo_seed_from_tripoli_knowledge: "بيانات تجريبية من معرفة طرابلس",
    demo_seed_assumption: "افتراض تجريبي",
  };
  return labels[value] ?? value;
}
