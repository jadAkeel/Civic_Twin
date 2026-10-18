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
