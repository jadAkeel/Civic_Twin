import type { PredictionSignal } from "@/lib/api-client";

export const fallbackPredictions: PredictionSignal[] = [
  {
    id: "waste_accumulation_risk:bab-al-tebbaneh",
    prediction_type: "waste_accumulation_risk",
    neighborhood: "باب التبانة",
    neighborhood_slug: "bab-al-tebbaneh",
    severity: "critical",
    confidence_score: 0.72,
    risk_score: 82,
    prediction_window_hours: 48,
    message: "إشارة تراكم نفايات مبنية على قواعد في باب التبانة.",
    evidence_json: { demo: true, garbage_reports: 2 },
  },
];

export function predictionLabel(type: string): string {
  const labels: Record<string, string> = {
    waste_accumulation_risk: "خطر تراكم النفايات",
    congestion_risk: "خطر ازدحام مروري",
    traffic_congestion_risk: "خطر ازدحام مروري",
    infrastructure_failure_risk: "خطر تعطل بنية تحتية",
    heat_risk: "خطر إجهاد حراري",
    heat_stress_risk: "خطر إجهاد حراري",
    service_pressure_risk: "ضغط على الخدمات",
  };
  return labels[type] ?? type;
}
