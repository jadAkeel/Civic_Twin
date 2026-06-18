import type { DigitalTwinLayer } from "@citymind/shared";

export const digitalTwinLayers: DigitalTwinLayer[] = [
  {
    id: "tripoli-buildings",
    name: "Tripoli building massing",
    type: "buildings",
    source: "CityGML",
    enabledByDefault: true,
  },
  {
    id: "terrain-context",
    name: "Terrain and coastline context",
    type: "terrain",
    source: "3D Tiles",
    enabledByDefault: true,
  },
  {
    id: "mobility-corridors",
    name: "Mobility corridors",
    type: "mobility",
    source: "CityMind API",
    enabledByDefault: false,
  },
  {
    id: "risk-overlays",
    name: "Risk overlays",
    type: "risk",
    source: "CityMind API",
    enabledByDefault: false,
  },
];
