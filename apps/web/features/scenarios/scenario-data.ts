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
  { label: "Al Mina", slug: "al-mina" },
  { label: "El Tal", slug: "el-tal" },
  { label: "Bab Al Tebbaneh", slug: "bab-al-tebbaneh" },
  { label: "Jabal Mohsen", slug: "jabal-mohsen" },
  { label: "Qoubbeh", slug: "qoubbeh" },
  { label: "Old Souks", slug: "old-souks" },
];

export const fallbackScenarioResult: ScenarioResult = {
  id: "local-scenario-1",
  scenario_name: "Bab Al Tebbaneh waste and tree pilot",
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
  recommendation: "Prioritize sanitation operations with neighborhood-level monitoring.",
  created_at: "2026-06-16T21:00:00.000Z",
};

export function actionLabel(action: string): string {
  return action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}
