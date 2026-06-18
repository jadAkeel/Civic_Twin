import type { CityMindRoute, TripoliNeighborhoodName } from "./types";

export const PROJECT_NAME = "CityMind Tripoli";
export const CITY_NAME = "Tripoli";
export const COUNTRY_NAME = "Lebanon";
export const CITY_LABEL = "Tripoli, Lebanon";
export const DEMO_DATA_NOTICE =
  "Tripoli demo data is shown until official municipal GIS and service feeds are connected.";

export const CITY_CENTER = {
  latitude: 34.4367,
  longitude: 35.8497,
} as const;

export const TRIPOLI_NEIGHBORHOODS: TripoliNeighborhoodName[] = [
  "Al Mina",
  "El Tal",
  "Bab Al Tebbaneh",
  "Jabal Mohsen",
  "Qoubbeh",
  "Abu Samra",
  "Old Souks",
  "Port Area",
  "Al Zahriyeh",
];

export const CITYMIND_MODULES = [
  "Smart Reporter",
  "Tripoli Interactive Map",
  "City Pulse Dashboard",
  "Green Score Engine",
  "Walkability Score",
  "Smart Mobility",
  "City Guardian Prediction Engine",
  "Urban Scenario Simulator",
  "Ask Your City AI Assistant",
  "Municipality Admin Panel",
] as const;

export const PHASE_ONE_MODULES = CITYMIND_MODULES;

export const PHASE_FOUR_ROUTES = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    module: "City Pulse Dashboard",
    phase: "Municipality",
    status: "active",
    summary: "Tripoli city operating view with KPIs, panels, tables, and demo signals.",
  },
  {
    key: "map",
    label: "City Map",
    path: "/map",
    module: "Tripoli Interactive Map",
    phase: "Resident",
    status: "active",
    summary: "Interactive Tripoli map with reports, assets, neighborhoods, and planning layers.",
  },
  {
    key: "reports",
    label: "Report Issue",
    path: "/reports",
    module: "Smart Reporter",
    phase: "Resident",
    status: "active",
    summary: "Citizen issue reporting workspace with status, severity, and map location tools.",
  },
  {
    key: "green-score",
    label: "Green Score",
    path: "/green-score",
    module: "Green Score and Walkability",
    phase: "Resident",
    status: "active",
    summary: "Neighborhood sustainability and explainability workspace for Tripoli.",
  },
  {
    key: "mobility",
    label: "Mobility",
    path: "/mobility",
    module: "Smart Mobility",
    phase: "Resident",
    status: "active",
    summary: "Route option shell for fastest, greenest, safest, accessible, and walkable trips.",
  },
  {
    key: "simulator",
    label: "Simulator",
    path: "/simulator",
    module: "Urban Scenario Simulator",
    phase: "Municipality",
    status: "active",
    summary: "Before and after planning workspace for Tripoli intervention scenarios.",
  },
  {
    key: "predictions",
    label: "Predictions",
    path: "/predictions",
    module: "City Guardian Prediction Engine",
    phase: "Municipality",
    status: "active",
    summary: "Risk signal shell for congestion, waste, heat, infrastructure, and service pressure.",
  },
  {
    key: "ask-city",
    label: "Ask City",
    path: "/ask-city",
    module: "Ask Your City AI Assistant",
    phase: "Resident",
    status: "active",
    summary: "Grounded assistant surface for asking questions about CityMind Tripoli data.",
  },
  {
    key: "admin",
    label: "Admin",
    path: "/admin",
    module: "Municipality Admin Panel",
    phase: "Municipality",
    status: "active",
    summary: "Municipal operations shell for reports, assets, scenarios, and interventions.",
  },
] satisfies CityMindRoute[];
