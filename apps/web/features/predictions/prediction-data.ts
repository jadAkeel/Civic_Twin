import type { PredictionSignal } from "@/lib/api-client";

export const fallbackPredictions: PredictionSignal[] = [
  {
    id: "waste_accumulation_risk:bab-al-tebbaneh",
    prediction_type: "waste_accumulation_risk",
    neighborhood: "Bab Al Tebbaneh",
    neighborhood_slug: "bab-al-tebbaneh",
    severity: "critical",
    confidence_score: 0.72,
    risk_score: 82,
    prediction_window_hours: 48,
    message: "Rule-based waste accumulation signal for Bab Al Tebbaneh.",
    evidence_json: { demo: true, garbage_reports: 2 },
  },
];

export function predictionLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
