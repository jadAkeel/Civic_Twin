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
