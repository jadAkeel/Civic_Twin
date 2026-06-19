import type { ScenarioResult } from "@/lib/api-client";

export const scenarioActions = [
  "ADD_TREES",
  "ADD_BIKE_LANE",
  "ADD_PARK",
  "ADD_BUS_STOP",
  "IMPROVE_WASTE_COLLECTION",
  "PEDESTRIANIZE_STREET",
  "CHANGE_TRAFFIC_FLOW",
  "IMPROVE_SIDEWALKS",
  "IMPROVE_LIGHTING",
];

export const scenarioNeighborhoods = [
  { label: "الميناء", slug: "al-mina" },
  { label: "التل", slug: "el-tal" },
  { label: "باب التبانة", slug: "bab-al-tebbaneh" },
  { label: "جبل محسن", slug: "jabal-mohsen" },
  { label: "القبة", slug: "qoubbeh" },
  { label: "الأسواق القديمة", slug: "old-souks" },
];

export const fallbackScenarioResult: ScenarioResult = {
  id: "local-scenario-1",
  scenario_name: "تجربة نفايات وأشجار في باب التبانة",
  neighborhood_slug: "bab-al-tebbaneh",
  actions: ["ADD_TREES", "IMPROVE_WASTE_COLLECTION"],
  green_score_delta: 11,
  temperature_delta: -0.5,
  air_quality_delta: 4,
  walkability_delta: 2,
  traffic_delta: 0,
  pollution_delta: -6,
  estimated_cost: 97000,
  implementation_time_days: 80,
  risk_level: "medium",
  confidence_score: 0.75,
  recommendation: "أعطِ الأولوية لعمليات النظافة مع مراقبة على مستوى الحي.",
  created_at: "2026-06-16T21:00:00.000Z",
};

export function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    ADD_TREES: "إضافة أشجار",
    ADD_BIKE_LANE: "إضافة مسار دراجات",
    ADD_PARK: "إضافة حديقة",
    ADD_BUS_STOP: "إضافة موقف حافلات",
    IMPROVE_WASTE_COLLECTION: "تحسين جمع النفايات",
    PEDESTRIANIZE_STREET: "تحويل شارع للمشاة",
    CHANGE_TRAFFIC_FLOW: "تعديل تدفق المرور",
    IMPROVE_SIDEWALKS: "تحسين الأرصفة",
    IMPROVE_LIGHTING: "تحسين الإنارة",
  };
  return labels[action] ?? action;
}
