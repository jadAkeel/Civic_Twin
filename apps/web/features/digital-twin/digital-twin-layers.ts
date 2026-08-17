import type { DigitalTwinLayer } from "@citymind/shared";

export const digitalTwinLayers: DigitalTwinLayer[] = [
  {
    id: "tripoli-buildings",
    name: "كتل مباني طرابلس",
    type: "buildings",
    source: "مصدر مبانٍ رسمي غير مهيأ",
    enabledByDefault: true,
  },
  {
    id: "terrain-context",
    name: "سياق التضاريس والساحل",
    type: "terrain",
    source: "مصدر تضاريس رسمي غير مهيأ",
    enabledByDefault: true,
  },
  {
    id: "mobility-corridors",
    name: "محاور التنقل",
    type: "mobility",
    source: "بيانات CityMind التجريبية",
    enabledByDefault: false,
  },
  {
    id: "risk-overlays",
    name: "طبقات المخاطر",
    type: "risk",
    source: "بيانات CityMind التجريبية",
    enabledByDefault: false,
  },
];
