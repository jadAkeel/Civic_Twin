import type { CityMindRoute, TripoliNeighborhoodName } from "./types";

export const PROJECT_NAME = "CityMind Tripoli";
export const CITY_NAME = "طرابلس";
export const COUNTRY_NAME = "لبنان";
export const CITY_LABEL = "طرابلس، لبنان";
export const DEMO_DATA_NOTICE =
  "تظهر بيانات تجريبية عن طرابلس إلى حين ربط نظم GIS البلدية الرسمية ومصادر الخدمات.";

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
  "الإبلاغ الذكي",
  "خريطة طرابلس التفاعلية",
  "لوحة نبض المدينة",
  "محرك المؤشر الأخضر",
  "مؤشر قابلية المشي",
  "التنقل الذكي",
  "محرك توقعات حارس المدينة",
  "محاكي السيناريوهات الحضرية",
  "مساعد اسأل مدينتك",
  "لوحة إدارة البلدية",
] as const;

export const PHASE_ONE_MODULES = CITYMIND_MODULES;

export const PHASE_FOUR_ROUTES = [
  {
    key: "dashboard",
    label: "لوحة المدينة",
    path: "/dashboard",
    module: "لوحة نبض المدينة",
    phase: "Municipality",
    status: "active",
    summary: "عرض تشغيلي لطرابلس مع مؤشرات ولوحات وجداول وإشارات تجريبية.",
  },
  {
    key: "map",
    label: "الخريطة",
    path: "/map",
    module: "خريطة طرابلس التفاعلية",
    phase: "Resident",
    status: "active",
    summary: "خريطة تفاعلية لطرابلس تعرض البلاغات والأصول والأحياء وطبقات التخطيط.",
  },
  {
    key: "reports",
    label: "بلاغ جديد",
    path: "/reports",
    module: "الإبلاغ الذكي",
    phase: "Resident",
    status: "active",
    summary: "مساحة بلاغات للمواطنين مع الحالة والخطورة وأدوات تحديد الموقع.",
  },
  {
    key: "green-score",
    label: "المؤشر الأخضر",
    path: "/green-score",
    module: "المؤشر الأخضر وقابلية المشي",
    phase: "Resident",
    status: "active",
    summary: "مساحة تشرح مؤشرات الاستدامة وقابلية المشي لأحياء طرابلس.",
  },
  {
    key: "mobility",
    label: "التنقل",
    path: "/mobility",
    module: "التنقل الذكي",
    phase: "Resident",
    status: "active",
    summary: "واجهة جاهزية لمسارات أسرع وأكثر خضرة وأمانًا وقابلية للوصول والمشي.",
  },
  {
    key: "simulator",
    label: "المحاكاة",
    path: "/simulator",
    module: "محاكي السيناريوهات الحضرية",
    phase: "Municipality",
    status: "active",
    summary: "مساحة مقارنة قبل/بعد لتخطيط تدخلات حضرية في طرابلس.",
  },
  {
    key: "predictions",
    label: "التوقعات",
    path: "/predictions",
    module: "محرك توقعات حارس المدينة",
    phase: "Municipality",
    status: "active",
    summary: "إشارات مخاطر للازدحام والنفايات والحرارة والبنية التحتية وضغط الخدمات.",
  },
  {
    key: "ask-city",
    label: "اسأل المدينة",
    path: "/ask-city",
    module: "مساعد اسأل مدينتك",
    phase: "Resident",
    status: "active",
    summary: "مساعد يعتمد على بيانات CityMind Tripoli للإجابة عن أسئلة المدينة.",
  },
  {
    key: "admin",
    label: "الإدارة",
    path: "/admin",
    module: "لوحة إدارة البلدية",
    phase: "Municipality",
    status: "active",
    summary: "مساحة تشغيل بلدية للبلاغات والأصول والسيناريوهات والتدخلات.",
  },
] satisfies CityMindRoute[];
