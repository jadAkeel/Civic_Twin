import type { DigitalTwinLayer } from "@citymind/shared";

export const digitalTwinLayers: DigitalTwinLayer[] = [
  {
    id: "tripoli-buildings",
    name: "كتل مباني طرابلس",
    type: "buildings",
    source: "CityGML",
    enabledByDefault: true,
  },
  {
    id: "terrain-context",
    name: "سياق التضاريس والساحل",
    type: "terrain",
    source: "3D Tiles",
    enabledByDefault: true,
  },
  {
    id: "mobility-corridors",
    name: "محاور التنقل",
    type: "mobility",
    source: "CityMind API",
    enabledByDefault: false,
  },
  {
    id: "risk-overlays",
    name: "طبقات المخاطر",
    type: "risk",
    source: "CityMind API",
    enabledByDefault: false,
  },
];
