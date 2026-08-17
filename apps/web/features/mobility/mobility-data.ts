import type { MobilityRouteComparison } from "@/lib/api-client";

export const mobilityPoints = [
  "Al Mina",
  "El Tal",
  "Old Souks",
  "Bab Al Tebbaneh",
  "Jabal Mohsen",
  "Qoubbeh",
  "Abu Samra",
];

export const routeTypeLabels: Record<string, string> = {
  fastest: "الأسرع",
  greenest: "الأكثر خضرة",
  safest: "الأكثر أمانًا",
  most_walkable: "الأفضل للمشي",
  accessible: "الأفضل للوصول",
};

export const fallbackMobilityComparison: MobilityRouteComparison = {
  origin: "Al Mina",
  destination: "Old Souks",
  route_types: ["fastest", "greenest", "safest", "most_walkable", "accessible"],
  future_providers: ["OpenTripPlanner", "GraphHopper", "Valhalla"],
  options: [
    {
      route_type: "fastest",
      origin: "Al Mina",
      destination: "Old Souks",
      distance_meters: 3280,
      estimated_minutes: 18.1,
      score: 18.1,
      provider_interface: "local_fallback",
      segments: [
        {
          id: "edge-1",
          name: "طريق تجريبي من الميناء إلى التل",
          edge_type: "road",
          from_label: "Al Mina",
          to_label: "El Tal",
          coordinates: [],
          length_meters: 2300,
          estimated_speed_kmh: 28,
          walkability_weight: 0.55,
          pollution_weight: 0.62,
          safety_weight: 0.58,
          accessibility_weight: 0.57,
        },
      ],
    },
  ],
};
