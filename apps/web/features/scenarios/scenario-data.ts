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
  { label: "أبو سمرا", slug: "abu-samra" },
  { label: "الأسواق القديمة", slug: "old-souks" },
  { label: "منطقة المرفأ", slug: "port-area" },
  { label: "الزاهرية", slug: "al-zahriyeh" },
];

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
