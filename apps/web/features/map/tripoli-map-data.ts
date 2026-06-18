import { CITY_CENTER } from "@citymind/shared";

export type MapSeverity = "critical" | "high" | "medium" | "low";
export type MapStatus = "submitted" | "validated" | "in_progress" | "resolved";
export type MapAssetStatus = "active" | "needs_maintenance" | "planned";

export type TripoliMapLayerId =
  | "neighborhoods"
  | "reports"
  | "waste"
  | "roads"
  | "lighting"
  | "pollution"
  | "greenRoutes"
  | "traffic"
  | "assets";

export type TripoliIssueMarker = {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: MapSeverity;
  status: MapStatus;
  neighborhood: string;
  neighborhoodSlug: string;
  latitude: number;
  longitude: number;
};

export type TripoliNeighborhoodLayer = {
  name: string;
  slug: string;
  priority: "critical" | "high" | "medium";
  summary: string;
  latitude: number;
  longitude: number;
  boundary: [number, number][];
};

export type TripoliAssetMarker = {
  id: string;
  name: string;
  assetType: string;
  status: MapAssetStatus;
  neighborhood: string;
  neighborhoodSlug: string;
  latitude: number;
  longitude: number;
  line?: [number, number][];
};

export type TripoliPhoto = {
  id: string;
  title: string;
  neighborhoodSlug: string;
  imageUrl: string;
  pageUrl: string;
  attribution: string;
  license: string;
};

export type TripoliRouteOverlay = {
  id: string;
  name: string;
  kind: "green" | "traffic" | "scenario";
  description: string;
  coordinates: [number, number][];
};

export const TRIPOLI_MAP_CENTER = {
  latitude: CITY_CENTER.latitude,
  longitude: CITY_CENTER.longitude,
  zoom: 13,
} as const;

export const tripoliMapLayers: Array<{
  id: TripoliMapLayerId;
  label: string;
  group: "Base" | "Citizen reports" | "Municipality";
}> = [
  { id: "neighborhoods", label: "Neighborhoods", group: "Base" },
  { id: "reports", label: "All reports", group: "Citizen reports" },
  { id: "waste", label: "Waste", group: "Citizen reports" },
  { id: "roads", label: "Roads and potholes", group: "Citizen reports" },
  { id: "lighting", label: "Street lighting", group: "Citizen reports" },
  { id: "pollution", label: "Pollution and fire risk", group: "Citizen reports" },
  { id: "greenRoutes", label: "Green routes", group: "Municipality" },
  { id: "traffic", label: "Traffic pressure", group: "Municipality" },
  { id: "assets", label: "Municipal assets", group: "Municipality" },
];

export const tripoliNeighborhoodLayers: TripoliNeighborhoodLayer[] = [
  {
    name: "Al Mina",
    slug: "al-mina",
    priority: "high",
    summary: "Coastal Tripoli district with port access, green-route potential, and road pressure.",
    latitude: 34.4471,
    longitude: 35.8178,
    boundary: [
      [35.8088, 34.4394],
      [35.8228, 34.4389],
      [35.8279, 34.4491],
      [35.8212, 34.4594],
      [35.8078, 34.4541],
      [35.8088, 34.4394],
    ],
  },
  {
    name: "El Tal",
    slug: "el-tal",
    priority: "critical",
    summary: "Central movement hub with pedestrian crossings, taxis, and congestion pressure.",
    latitude: 34.4374,
    longitude: 35.8365,
    boundary: [
      [35.8294, 34.4321],
      [35.8399, 34.4318],
      [35.8423, 34.4392],
      [35.8351, 34.4434],
      [35.8289, 34.4391],
      [35.8294, 34.4321],
    ],
  },
  {
    name: "Bab Al Tebbaneh",
    slug: "bab-al-tebbaneh",
    priority: "critical",
    summary: "Dense neighborhood with waste, lighting, and public-realm service needs.",
    latitude: 34.4442,
    longitude: 35.8434,
    boundary: [
      [35.8375, 34.4395],
      [35.8472, 34.4399],
      [35.8501, 34.4472],
      [35.8441, 34.4512],
      [35.8362, 34.4475],
      [35.8375, 34.4395],
    ],
  },
  {
    name: "Jabal Mohsen",
    slug: "jabal-mohsen",
    priority: "high",
    summary: "Hillside area where accessibility, steep routes, and services need close monitoring.",
    latitude: 34.4511,
    longitude: 35.8503,
    boundary: [
      [35.8434, 34.4474],
      [35.8539, 34.4479],
      [35.8584, 34.4558],
      [35.8502, 34.4613],
      [35.8409, 34.4549],
      [35.8434, 34.4474],
    ],
  },
  {
    name: "Qoubbeh",
    slug: "qoubbeh",
    priority: "high",
    summary: "Residential district with school routes, road maintenance, and collection pressure.",
    latitude: 34.4327,
    longitude: 35.8613,
    boundary: [
      [35.8524, 34.4251],
      [35.8678, 34.4239],
      [35.8722, 34.4346],
      [35.8621, 34.4411],
      [35.8509, 34.4358],
      [35.8524, 34.4251],
    ],
  },
  {
    name: "Abu Samra",
    slug: "abu-samra",
    priority: "medium",
    summary: "Residential zone with walking comfort, parking pressure, and pocket-park opportunities.",
    latitude: 34.4252,
    longitude: 35.8427,
    boundary: [
      [35.8347, 34.4174],
      [35.8479, 34.4171],
      [35.8525, 34.4272],
      [35.8425, 34.4334],
      [35.8314, 34.4278],
      [35.8347, 34.4174],
    ],
  },
  {
    name: "Old Souks",
    slug: "old-souks",
    priority: "high",
    summary: "Heritage commercial core where walkability, lighting, and waste operations overlap.",
    latitude: 34.4356,
    longitude: 35.8449,
    boundary: [
      [35.8395, 34.4321],
      [35.8482, 34.4322],
      [35.8504, 34.4376],
      [35.8446, 34.4414],
      [35.8386, 34.4387],
      [35.8395, 34.4321],
    ],
  },
  {
    name: "Port Area",
    slug: "port-area",
    priority: "high",
    summary: "Port-adjacent logistics area with truck movement and pollution exposure.",
    latitude: 34.4592,
    longitude: 35.8221,
    boundary: [
      [35.8139, 34.4541],
      [35.8276, 34.4536],
      [35.8333, 34.4621],
      [35.8245, 34.4687],
      [35.8127, 34.4642],
      [35.8139, 34.4541],
    ],
  },
  {
    name: "Al Zahriyeh",
    slug: "al-zahriyeh",
    priority: "medium",
    summary: "Central corridor connecting dense movement, lighting, and public-realm needs.",
    latitude: 34.4398,
    longitude: 35.8488,
    boundary: [
      [35.8443, 34.4354],
      [35.8535, 34.4356],
      [35.8552, 34.4426],
      [35.8488, 34.4464],
      [35.8425, 34.4416],
      [35.8443, 34.4354],
    ],
  },
];

export const tripoliIssueMarkers: TripoliIssueMarker[] = [
  {
    id: "TRP-1001",
    title: "Garbage accumulation near dense residential blocks",
    description: "Waste bags are accumulating before pickup and blocking a narrow residential route.",
    category: "garbage",
    severity: "critical",
    status: "submitted",
    neighborhood: "Bab Al Tebbaneh",
    neighborhoodSlug: "bab-al-tebbaneh",
    latitude: 34.4446,
    longitude: 35.8439,
  },
  {
    id: "TRP-1002",
    title: "Traffic congestion near El Tal transit activity",
    description: "Vehicles and informal pickup activity are slowing central pedestrian crossings.",
    category: "traffic_obstruction",
    severity: "high",
    status: "validated",
    neighborhood: "El Tal",
    neighborhoodSlug: "el-tal",
    latitude: 34.4378,
    longitude: 35.837,
  },
  {
    id: "TRP-1003",
    title: "Broken sidewalks in Old Souks",
    description: "Uneven pedestrian paths are affecting the heritage commercial walking route.",
    category: "broken_sidewalk",
    severity: "high",
    status: "in_progress",
    neighborhood: "Old Souks",
    neighborhoodSlug: "old-souks",
    latitude: 34.4359,
    longitude: 35.8445,
  },
  {
    id: "TRP-1004",
    title: "Street lighting gap in Qoubbeh",
    description: "Low night visibility was reported on a residential walking route.",
    category: "street_lighting",
    severity: "medium",
    status: "submitted",
    neighborhood: "Qoubbeh",
    neighborhoodSlug: "qoubbeh",
    latitude: 34.4321,
    longitude: 35.8618,
  },
  {
    id: "TRP-1005",
    title: "Pollution concern near Port Area",
    description: "Residents reported air and noise exposure near heavy vehicle movement.",
    category: "pollution",
    severity: "high",
    status: "validated",
    neighborhood: "Port Area",
    neighborhoodSlug: "port-area",
    latitude: 34.459,
    longitude: 35.8225,
  },
  {
    id: "TRP-1006",
    title: "Walkability problem in Abu Samra",
    description: "Blocked pedestrian movement was reported near residential streets.",
    category: "accessibility_issue",
    severity: "medium",
    status: "submitted",
    neighborhood: "Abu Samra",
    neighborhoodSlug: "abu-samra",
    latitude: 34.4255,
    longitude: 35.8423,
  },
  {
    id: "TRP-1007",
    title: "Road obstacle in Al Mina",
    description: "A temporary obstacle is affecting the coastal access route.",
    category: "traffic_obstruction",
    severity: "medium",
    status: "submitted",
    neighborhood: "Al Mina",
    neighborhoodSlug: "al-mina",
    latitude: 34.4475,
    longitude: 35.8184,
  },
  {
    id: "TRP-1008",
    title: "Public safety issue near Jabal Mohsen",
    description: "A poorly lit pedestrian stair route has repeated safety concerns.",
    category: "public_safety",
    severity: "high",
    status: "validated",
    neighborhood: "Jabal Mohsen",
    neighborhoodSlug: "jabal-mohsen",
    latitude: 34.4515,
    longitude: 35.8508,
  },
  {
    id: "TRP-1009",
    title: "Pothole on Qoubbeh connector",
    description: "Road surface damage is affecting local vehicle movement.",
    category: "pothole",
    severity: "medium",
    status: "submitted",
    neighborhood: "Qoubbeh",
    neighborhoodSlug: "qoubbeh",
    latitude: 34.433,
    longitude: 35.8607,
  },
  {
    id: "TRP-1010",
    title: "Water leakage near Old Souks service lane",
    description: "Water leakage is affecting pedestrian comfort and nearby shop access.",
    category: "water_leakage",
    severity: "medium",
    status: "submitted",
    neighborhood: "Old Souks",
    neighborhoodSlug: "old-souks",
    latitude: 34.4352,
    longitude: 35.8453,
  },
  {
    id: "TRP-1011",
    title: "Garbage near Port truck route",
    description: "Waste accumulation is visible near a logistics movement route.",
    category: "garbage",
    severity: "medium",
    status: "submitted",
    neighborhood: "Port Area",
    neighborhoodSlug: "port-area",
    latitude: 34.4585,
    longitude: 35.8217,
  },
  {
    id: "TRP-1012",
    title: "Broken sidewalk on Al Mina coastal walk",
    description: "Sidewalk damage is affecting a candidate green mobility corridor.",
    category: "broken_sidewalk",
    severity: "medium",
    status: "validated",
    neighborhood: "Al Mina",
    neighborhoodSlug: "al-mina",
    latitude: 34.4479,
    longitude: 35.8172,
  },
  {
    id: "TRP-1013",
    title: "Street lighting issue in Bab Al Tebbaneh",
    description: "Lighting problem connected to perceived walking safety.",
    category: "street_lighting",
    severity: "high",
    status: "submitted",
    neighborhood: "Bab Al Tebbaneh",
    neighborhoodSlug: "bab-al-tebbaneh",
    latitude: 34.4439,
    longitude: 35.8441,
  },
  {
    id: "TRP-1014",
    title: "Accessibility barrier in Jabal Mohsen",
    description: "A steep pedestrian path has access barriers for older residents.",
    category: "accessibility_issue",
    severity: "high",
    status: "submitted",
    neighborhood: "Jabal Mohsen",
    neighborhoodSlug: "jabal-mohsen",
    latitude: 34.4507,
    longitude: 35.8512,
  },
  {
    id: "TRP-1015",
    title: "Traffic obstruction near El Tal crossing",
    description: "A blocked crossing is slowing movement near central activity.",
    category: "traffic_obstruction",
    severity: "high",
    status: "submitted",
    neighborhood: "El Tal",
    neighborhoodSlug: "el-tal",
    latitude: 34.4371,
    longitude: 35.8362,
  },
  {
    id: "TRP-1016",
    title: "Garbage overflow in Qoubbeh residential street",
    description: "Waste collection pressure is visible near a residential block.",
    category: "garbage",
    severity: "high",
    status: "validated",
    neighborhood: "Qoubbeh",
    neighborhoodSlug: "qoubbeh",
    latitude: 34.4329,
    longitude: 35.8621,
  },
  {
    id: "TRP-1017",
    title: "Public safety concern in Old Souks evening route",
    description: "Evening walking route has lighting and crowding concerns.",
    category: "public_safety",
    severity: "medium",
    status: "submitted",
    neighborhood: "Old Souks",
    neighborhoodSlug: "old-souks",
    latitude: 34.436,
    longitude: 35.844,
  },
  {
    id: "TRP-1018",
    title: "Pollution exposure on Al Mina road",
    description: "Air and noise concern on a busy coastal corridor.",
    category: "pollution",
    severity: "medium",
    status: "submitted",
    neighborhood: "Al Mina",
    neighborhoodSlug: "al-mina",
    latitude: 34.4466,
    longitude: 35.8191,
  },
  {
    id: "TRP-1019",
    title: "Broken sidewalk near Abu Samra school route",
    description: "School walking route has damaged sidewalk segments.",
    category: "broken_sidewalk",
    severity: "high",
    status: "submitted",
    neighborhood: "Abu Samra",
    neighborhoodSlug: "abu-samra",
    latitude: 34.4248,
    longitude: 35.8428,
  },
  {
    id: "TRP-1020",
    title: "Street lighting issue near Al Zahriyeh corridor",
    description: "Visibility gap reported along a central Tripoli corridor.",
    category: "street_lighting",
    severity: "medium",
    status: "submitted",
    neighborhood: "Al Zahriyeh",
    neighborhoodSlug: "al-zahriyeh",
    latitude: 34.4395,
    longitude: 35.8491,
  },
];

export const tripoliAssetMarkers: TripoliAssetMarker[] = [
  {
    id: "AST-1001",
    name: "Al Mina Coastal Road Segment",
    assetType: "road",
    status: "active",
    neighborhood: "Al Mina",
    neighborhoodSlug: "al-mina",
    latitude: 34.4474,
    longitude: 35.8182,
    line: [
      [35.8171, 34.4466],
      [35.8192, 34.4481],
    ],
  },
  {
    id: "AST-1002",
    name: "Old Souks Heritage Walking Path",
    assetType: "sidewalk",
    status: "needs_maintenance",
    neighborhood: "Old Souks",
    neighborhoodSlug: "old-souks",
    latitude: 34.4357,
    longitude: 35.8447,
    line: [
      [35.8441, 34.4352],
      [35.8452, 34.4361],
    ],
  },
  {
    id: "AST-1003",
    name: "Qoubbeh Residential Street Light",
    assetType: "street_light",
    status: "needs_maintenance",
    neighborhood: "Qoubbeh",
    neighborhoodSlug: "qoubbeh",
    latitude: 34.4323,
    longitude: 35.8619,
  },
  {
    id: "AST-1004",
    name: "Bab Al Tebbaneh Waste Container Cluster",
    assetType: "waste_container",
    status: "needs_maintenance",
    neighborhood: "Bab Al Tebbaneh",
    neighborhoodSlug: "bab-al-tebbaneh",
    latitude: 34.4445,
    longitude: 35.8438,
  },
  {
    id: "AST-1005",
    name: "Abu Samra Pocket Park Candidate",
    assetType: "park",
    status: "planned",
    neighborhood: "Abu Samra",
    neighborhoodSlug: "abu-samra",
    latitude: 34.425,
    longitude: 35.8424,
  },
  {
    id: "AST-1006",
    name: "Al Mina Tree Corridor Candidate",
    assetType: "tree",
    status: "planned",
    neighborhood: "Al Mina",
    neighborhoodSlug: "al-mina",
    latitude: 34.4472,
    longitude: 35.8182,
  },
  {
    id: "AST-1007",
    name: "El Tal Bus Stop Candidate",
    assetType: "bus_stop",
    status: "planned",
    neighborhood: "El Tal",
    neighborhoodSlug: "el-tal",
    latitude: 34.4375,
    longitude: 35.8368,
  },
  {
    id: "AST-1008",
    name: "Old Souks Heritage Site Marker",
    assetType: "heritage_site",
    status: "active",
    neighborhood: "Old Souks",
    neighborhoodSlug: "old-souks",
    latitude: 34.4357,
    longitude: 35.845,
  },
  {
    id: "AST-1009",
    name: "Jabal Mohsen Accessibility Path",
    assetType: "sidewalk",
    status: "needs_maintenance",
    neighborhood: "Jabal Mohsen",
    neighborhoodSlug: "jabal-mohsen",
    latitude: 34.4511,
    longitude: 35.8508,
    line: [
      [35.8504, 34.4506],
      [35.8512, 34.4516],
    ],
  },
  {
    id: "AST-1010",
    name: "Port Area Heavy Vehicle Road",
    assetType: "road",
    status: "active",
    neighborhood: "Port Area",
    neighborhoodSlug: "port-area",
    latitude: 34.459,
    longitude: 35.8223,
    line: [
      [35.8214, 34.4584],
      [35.8232, 34.4595],
    ],
  },
];

export const tripoliPhotoHighlights: TripoliPhoto[] = [
  {
    id: "photo-citadel",
    title: "Citadel skyline",
    neighborhoodSlug: "old-souks",
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Citadel%20of%20Raymond%20de%20Saint-Gilles%2C%20skyline%20of%20Tripoli%2C%20Lebanon.jpg?width=900",
    pageUrl:
      "https://commons.wikimedia.org/wiki/File:The_Citadel_of_Raymond_de_Saint-Gilles,_skyline_of_Tripoli,_Lebanon.jpg",
    attribution: "Wikimedia Commons contributor",
    license: "Creative Commons",
  },
  {
    id: "photo-mina",
    title: "Al Mina coast",
    neighborhoodSlug: "al-mina",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/AlMinaIsland1.jpg?width=900",
    pageUrl: "https://commons.wikimedia.org/wiki/File:AlMinaIsland1.jpg",
    attribution: "Clemens Schmillen / Wikimedia Commons",
    license: "Creative Commons",
  },
  {
    id: "photo-souks",
    title: "Old Tripoli souks",
    neighborhoodSlug: "old-souks",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tripoli%2Csouk1.jpg?width=900",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Tripoli,souk1.jpg",
    attribution: "Bertramz / Wikimedia Commons",
    license: "Creative Commons",
  },
];

export const tripoliRouteOverlays: TripoliRouteOverlay[] = [
  {
    id: "green-al-mina-old-souks",
    name: "Al Mina to Old Souks green route",
    kind: "green",
    description: "Coastal-to-heritage walking and cycling pilot using calmer streets where possible.",
    coordinates: [
      [35.8178, 34.4471],
      [35.8248, 34.4439],
      [35.8365, 34.4374],
      [35.8449, 34.4356],
    ],
  },
  {
    id: "traffic-el-tal",
    name: "El Tal congestion corridor",
    kind: "traffic",
    description: "Central movement corridor for testing one-way and loading-zone changes.",
    coordinates: [
      [35.8327, 34.4393],
      [35.8365, 34.4374],
      [35.8421, 34.4362],
      [35.8461, 34.4357],
    ],
  },
  {
    id: "green-bab-tebbaneh-jabal",
    name: "Bab Al Tebbaneh to Jabal Mohsen access route",
    kind: "green",
    description: "Accessibility and lighting route for hillside pedestrian movement.",
    coordinates: [
      [35.8434, 34.4442],
      [35.8466, 34.447],
      [35.8503, 34.4511],
    ],
  },
  {
    id: "scenario-qoubbeh-abusamra",
    name: "Qoubbeh to Abu Samra residential connector",
    kind: "scenario",
    description: "Residential connector for sidewalk, school-route, and waste-service simulation.",
    coordinates: [
      [35.8613, 34.4327],
      [35.8524, 34.4291],
      [35.8427, 34.4252],
    ],
  },
];

export const tripoliMapFilterOptions = {
  categories: Array.from(new Set(tripoliIssueMarkers.map((issue) => issue.category))).sort(),
  severities: ["critical", "high", "medium", "low"] satisfies MapSeverity[],
  statuses: ["submitted", "validated", "in_progress", "resolved"] satisfies MapStatus[],
  neighborhoods: tripoliNeighborhoodLayers.map((neighborhood) => neighborhood.name),
};

export function formatMapLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function photoForNeighborhood(neighborhoodSlug: string) {
  return (
    tripoliPhotoHighlights.find((photo) => photo.neighborhoodSlug === neighborhoodSlug) ??
    tripoliPhotoHighlights[0]
  );
}
