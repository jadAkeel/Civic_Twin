import type { TripoliNeighborhoodName } from "@citymind/shared";

export type Kpi = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "amber" | "rose";
};

export type NeighborhoodSignal = {
  name: TripoliNeighborhoodName;
  greenScore: number;
  walkability: number;
  trafficRisk: number;
  wasteRisk: number;
  priority: "Critical" | "High" | "Medium";
};

export type IssueSignal = {
  id: string;
  title: string;
  neighborhood: TripoliNeighborhoodName;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "submitted" | "validated" | "in_progress" | "resolved";
};

export type ScenarioSignal = {
  name: string;
  target: TripoliNeighborhoodName;
  action: string;
  expectedDelta: string;
  risk: "Low" | "Medium" | "High";
};

export const cityKpis: Kpi[] = [
  {
    label: "Open reports",
    value: "16",
    detail: "Demo issues across priority Tripoli neighborhoods",
    tone: "amber",
  },
  {
    label: "Average green score",
    value: "49",
    detail: "Weighted demo baseline, not official municipal data",
    tone: "green",
  },
  {
    label: "Walkability baseline",
    value: "52",
    detail: "Old Souks and El Tal lead the current demo set",
    tone: "blue",
  },
  {
    label: "High-risk areas",
    value: "4",
    detail: "Bab Al Tebbaneh, Qoubbeh, Old Souks, Port Area",
    tone: "rose",
  },
];

export const neighborhoodSignals: NeighborhoodSignal[] = [
  {
    name: "Bab Al Tebbaneh",
    greenScore: 41,
    walkability: 38,
    trafficRisk: 76,
    wasteRisk: 81,
    priority: "Critical",
  },
  {
    name: "Old Souks",
    greenScore: 46,
    walkability: 64,
    trafficRisk: 74,
    wasteRisk: 68,
    priority: "High",
  },
  {
    name: "Qoubbeh",
    greenScore: 49,
    walkability: 47,
    trafficRisk: 71,
    wasteRisk: 66,
    priority: "High",
  },
  {
    name: "El Tal",
    greenScore: 52,
    walkability: 61,
    trafficRisk: 82,
    wasteRisk: 49,
    priority: "High",
  },
  {
    name: "Al Mina",
    greenScore: 58,
    walkability: 55,
    trafficRisk: 68,
    wasteRisk: 52,
    priority: "Medium",
  },
];

export const issueSignals: IssueSignal[] = [
  {
    id: "TRP-1024",
    title: "Garbage accumulation near dense residential block",
    neighborhood: "Bab Al Tebbaneh",
    category: "garbage",
    severity: "critical",
    status: "validated",
  },
  {
    id: "TRP-1021",
    title: "Broken sidewalk along pedestrian corridor",
    neighborhood: "Old Souks",
    category: "broken_sidewalk",
    severity: "high",
    status: "in_progress",
  },
  {
    id: "TRP-1018",
    title: "Traffic pressure near shared transport stop",
    neighborhood: "El Tal",
    category: "traffic_congestion",
    severity: "high",
    status: "submitted",
  },
  {
    id: "TRP-1015",
    title: "Poor lighting on walking link",
    neighborhood: "Jabal Mohsen",
    category: "broken_street_light",
    severity: "medium",
    status: "validated",
  },
  {
    id: "TRP-1011",
    title: "Road obstacle on neighborhood access street",
    neighborhood: "Qoubbeh",
    category: "road_obstacle",
    severity: "medium",
    status: "resolved",
  },
];

export const scenarioSignals: ScenarioSignal[] = [
  {
    name: "Bab Al Tebbaneh Waste and Green Recovery",
    target: "Bab Al Tebbaneh",
    action: "Improve waste collection + add trees",
    expectedDelta: "+9 green score",
    risk: "Medium",
  },
  {
    name: "El Tal Pedestrian Priority",
    target: "El Tal",
    action: "Pedestrian priority + safer crossings",
    expectedDelta: "+11 walkability",
    risk: "High",
  },
  {
    name: "Al Mina Coastal Green Mobility",
    target: "Al Mina",
    action: "Bike lane + tree corridor",
    expectedDelta: "+8 sustainable mobility",
    risk: "Low",
  },
];
