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
  group: "أساس" | "بلاغات المواطنين" | "البلدية";
}> = [
  { id: "neighborhoods", label: "الأحياء", group: "أساس" },
  { id: "reports", label: "كل البلاغات", group: "بلاغات المواطنين" },
  { id: "waste", label: "النفايات", group: "بلاغات المواطنين" },
  { id: "roads", label: "الطرق والحفر", group: "بلاغات المواطنين" },
  { id: "lighting", label: "إنارة الشوارع", group: "بلاغات المواطنين" },
  { id: "pollution", label: "التلوث وخطر الحريق", group: "بلاغات المواطنين" },
  { id: "greenRoutes", label: "المسارات الخضراء", group: "البلدية" },
  { id: "traffic", label: "محاور حركة تجريبية", group: "البلدية" },
  { id: "assets", label: "الأصول البلدية", group: "البلدية" },
];

export const tripoliNeighborhoodLayers: TripoliNeighborhoodLayer[] = [
  {
    name: "الميناء",
    slug: "al-mina",
    priority: "high",
    summary: "منطقة ساحلية في طرابلس مع وصول إلى المرفأ وفرص لمسارات خضراء وضغط مروري.",
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
    name: "التل",
    slug: "el-tal",
    priority: "critical",
    summary: "مركز حركة رئيسي مع معابر مشاة وسيارات أجرة وضغط ازدحام.",
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
    name: "باب التبانة",
    slug: "bab-al-tebbaneh",
    priority: "critical",
    summary: "حي كثيف يحتاج إلى تحسينات في النفايات والإنارة وخدمات المجال العام.",
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
    name: "جبل محسن",
    slug: "jabal-mohsen",
    priority: "high",
    summary: "منطقة مرتفعة تحتاج إلى متابعة الوصول والمسارات الحادة والخدمات.",
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
    name: "القبة",
    slug: "qoubbeh",
    priority: "high",
    summary: "منطقة سكنية فيها مسارات مدارس وصيانة طرق وضغط على جمع النفايات.",
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
    name: "أبو سمراء",
    slug: "abu-samra",
    priority: "medium",
    summary: "منطقة سكنية مع حاجات لراحة المشي وضغط مواقف وفرص حدائق صغيرة.",
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
    name: "الأسواق القديمة",
    slug: "old-souks",
    priority: "high",
    summary: "قلب تجاري تراثي تتداخل فيه قابلية المشي والإنارة وإدارة النفايات.",
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
    name: "منطقة المرفأ",
    slug: "port-area",
    priority: "high",
    summary: "منطقة لوجستية قرب المرفأ مع حركة شاحنات وتعرض للتلوث.",
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
    name: "الزاهرية",
    slug: "al-zahriyeh",
    priority: "medium",
    summary: "محور مركزي يربط حركة كثيفة مع حاجات الإنارة والمجال العام.",
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

export const tripoliPhotoHighlights: TripoliPhoto[] = [
  {
    id: "photo-citadel",
    title: "أفق القلعة",
    neighborhoodSlug: "old-souks",
    imageUrl:
      "https://commons.wikimedia.org/wiki/Special:FilePath/The%20Citadel%20of%20Raymond%20de%20Saint-Gilles%2C%20skyline%20of%20Tripoli%2C%20Lebanon.jpg?width=900",
    pageUrl:
      "https://commons.wikimedia.org/wiki/File:The_Citadel_of_Raymond_de_Saint-Gilles,_skyline_of_Tripoli,_Lebanon.jpg",
    attribution: "مساهم في ويكيميديا كومنز",
    license: "رخصة المشاع الإبداعي",
  },
  {
    id: "photo-mina",
    title: "ساحل الميناء",
    neighborhoodSlug: "al-mina",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/AlMinaIsland1.jpg?width=900",
    pageUrl: "https://commons.wikimedia.org/wiki/File:AlMinaIsland1.jpg",
    attribution: "Clemens Schmillen / ويكيميديا كومنز",
    license: "رخصة المشاع الإبداعي",
  },
  {
    id: "photo-souks",
    title: "أسواق طرابلس القديمة",
    neighborhoodSlug: "old-souks",
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tripoli%2Csouk1.jpg?width=900",
    pageUrl: "https://commons.wikimedia.org/wiki/File:Tripoli,souk1.jpg",
    attribution: "Bertramz / ويكيميديا كومنز",
    license: "رخصة المشاع الإبداعي",
  },
];

export const tripoliRouteOverlays: TripoliRouteOverlay[] = [
  {
    id: "green-al-mina-old-souks",
    name: "مسار أخضر من الميناء إلى الأسواق القديمة",
    kind: "green",
    description: "تجربة مشي ودراجات من الساحل إلى المنطقة التراثية عبر شوارع أهدأ حيثما أمكن.",
    coordinates: [
      [35.8178, 34.4471],
      [35.8248, 34.4439],
      [35.8365, 34.4374],
      [35.8449, 34.4356],
    ],
  },
  {
    id: "traffic-el-tal",
    name: "محور حركة التل التجريبي",
    kind: "traffic",
    description: "محور حركة تجريبي لمراجعة أفكار اتجاه واحد وتغييرات مناطق التحميل.",
    coordinates: [
      [35.8327, 34.4393],
      [35.8365, 34.4374],
      [35.8421, 34.4362],
      [35.8461, 34.4357],
    ],
  },
  {
    id: "green-bab-tebbaneh-jabal",
    name: "مسار وصول من باب التبانة إلى جبل محسن",
    kind: "green",
    description: "مسار وصول وإنارة لحركة المشاة على المنطقة المرتفعة.",
    coordinates: [
      [35.8434, 34.4442],
      [35.8466, 34.447],
      [35.8503, 34.4511],
    ],
  },
  {
    id: "scenario-qoubbeh-abusamra",
    name: "وصلة سكنية من القبة إلى أبو سمراء",
    kind: "scenario",
    description: "وصلة سكنية لمحاكاة الأرصفة ومسارات المدارس وخدمة النفايات.",
    coordinates: [
      [35.8613, 34.4327],
      [35.8524, 34.4291],
      [35.8427, 34.4252],
    ],
  },
];

export const tripoliMapFilterOptions = {
  severities: ["critical", "high", "medium", "low"] satisfies MapSeverity[],
  statuses: ["submitted", "validated", "in_progress", "resolved"] satisfies MapStatus[],
  neighborhoods: tripoliNeighborhoodLayers.map((neighborhood) => neighborhood.name),
};

export function formatMapLabel(value: string) {
  const labels: Record<string, string> = {
    all: "الكل",
    critical: "حرجة",
    high: "مرتفعة",
    medium: "متوسطة",
    low: "منخفضة",
    submitted: "مُرسل",
    validated: "مراجَع",
    in_progress: "قيد المعالجة",
    resolved: "تم الحل",
    garbage: "نفايات",
    waste: "نفايات",
    traffic_obstruction: "عرقلة مرورية",
    traffic_congestion: "ازدحام مروري",
    broken_sidewalk: "رصيف متضرر",
    street_lighting: "إنارة الشوارع",
    pollution: "تلوث",
    public_safety: "سلامة عامة",
    security_incident: "حادث أمني",
    pothole: "حفرة",
    water_leakage: "تسرب مياه",
    accessibility_issue: "مشكلة وصول",
    road: "طريق",
    sidewalk: "رصيف",
    street_light: "مصباح شارع",
    waste_container: "حاوية نفايات",
    park: "حديقة",
    tree: "شجرة",
    bus_stop: "موقف حافلات",
    heritage_site: "موقع تراثي",
    active: "نشط",
    needs_maintenance: "بحاجة إلى صيانة",
    planned: "مخطط",
    green: "أخضر",
    traffic: "حركة تجريبية",
    scenario: "سيناريو",
  };
  return labels[value] ?? value;
}

export function photoForNeighborhood(neighborhoodSlug: string) {
  return (
    tripoliPhotoHighlights.find((photo) => photo.neighborhoodSlug === neighborhoodSlug) ??
    tripoliPhotoHighlights[0]
  );
}
