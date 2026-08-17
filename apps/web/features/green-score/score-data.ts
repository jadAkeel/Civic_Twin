import type { GreenScoreRow, WalkabilityScoreRow } from "@/lib/api-client";

export const fallbackGreenScores: GreenScoreRow[] = [
  {
    neighborhood: "الميناء",
    neighborhood_slug: "al-mina",
    priority_level: "high",
    green_score: 57.05,
    green_breakdown: [
      { factor: "air_quality_score", score: 55, weight: 0.3, contribution: 16.5 },
      { factor: "green_coverage_score", score: 57, weight: 0.25, contribution: 14.25 },
      { factor: "waste_cleanliness_score", score: 56, weight: 0.2, contribution: 11.2 },
      { factor: "walkability_score", score: 55, weight: 0.15, contribution: 8.25 },
      { factor: "heat_comfort_score", score: 62, weight: 0.1, contribution: 6.2 },
    ],
    walkability_score: 56.4,
    measurement_date: "2026-06-16",
    source: "احتياطي محلي",
    formula: {},
  },
  {
    neighborhood: "باب التبانة",
    neighborhood_slug: "bab-al-tebbaneh",
    priority_level: "critical",
    green_score: 36.95,
    green_breakdown: [
      { factor: "air_quality_score", score: 39, weight: 0.3, contribution: 11.7 },
      { factor: "green_coverage_score", score: 34, weight: 0.25, contribution: 8.5 },
      { factor: "waste_cleanliness_score", score: 32, weight: 0.2, contribution: 6.4 },
      { factor: "walkability_score", score: 38, weight: 0.15, contribution: 5.7 },
      { factor: "heat_comfort_score", score: 42, weight: 0.1, contribution: 4.2 },
    ],
    walkability_score: 37.15,
    measurement_date: "2026-06-16",
    source: "احتياطي محلي",
    formula: {},
  },
];

export const fallbackWalkabilityScores: WalkabilityScoreRow[] = [
  {
    neighborhood: "الأسواق القديمة",
    neighborhood_slug: "old-souks",
    priority_level: "high",
    walkability_score: 61.15,
    walkability_breakdown: [
      { factor: "sidewalk_quality", score: 61, weight: 0.25, contribution: 15.25 },
      { factor: "crossing_safety", score: 62, weight: 0.2, contribution: 12.4 },
      { factor: "lighting_quality", score: 60, weight: 0.2, contribution: 12 },
      { factor: "accessibility_score", score: 55, weight: 0.15, contribution: 8.25 },
      { factor: "slope_comfort", score: 66, weight: 0.1, contribution: 6.6 },
      { factor: "perceived_safety", score: 63, weight: 0.1, contribution: 6.3 },
    ],
    measurement_date: "2026-06-16",
    source: "احتياطي محلي",
    formula: {},
  },
];

export function factorLabel(factor: string): string {
  const labels: Record<string, string> = {
    air_quality_score: "جودة الهواء",
    green_coverage_score: "الغطاء الأخضر",
    waste_cleanliness_score: "نظافة النفايات",
    walkability_score: "قابلية المشي",
    heat_comfort_score: "راحة الحرارة",
    sidewalk_quality: "جودة الأرصفة",
    crossing_safety: "سلامة المعابر",
    lighting_quality: "جودة الإنارة",
    accessibility_score: "إمكانية الوصول",
    slope_comfort: "راحة الانحدار",
    perceived_safety: "السلامة المتصورة",
  };
  return labels[factor] ?? factor;
}
