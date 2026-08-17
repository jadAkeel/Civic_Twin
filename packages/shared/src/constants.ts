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
  "بلاغات المواطنين",
  "خريطة طرابلس التفاعلية",
  "لوحة نبض المدينة",
  "المؤشر الأخضر",
  "مؤشر قابلية المشي",
  "جاهزية التنقل",
  "إشارات مراجعة المخاطر",
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
    module: "بلاغات المواطنين",
    phase: "Resident",
    status: "active",
    summary: "مساحة بلاغات للمواطنين مع الحالة والخطورة وأدوات تحديد الموقع.",
  },
  {
    key: "green-score",
    label: "المؤشر الأخضر",
    path: "/green-score",
    module: "المؤشر الأخضر وقابلية المشي",
    phase: "Municipality",
    status: "active",
    summary: "مساحة تخطيط بلدية تشرح مؤشرات الاستدامة وقابلية المشي لأحياء طرابلس.",
  },
  {
    key: "mobility",
    label: "التنقل",
    path: "/mobility",
    module: "جاهزية التنقل",
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
    label: "إشارات المخاطر",
    path: "/predictions",
    module: "إشارات مراجعة المخاطر",
    phase: "Municipality",
    status: "active",
    summary: "قائمة مراجعة بلدية مبنية على قواعد للازدحام والنفايات والحرارة والبنية التحتية وضغط الخدمات، وليست توقعات أو إنذارات رسمية.",
  },
  {
    key: "ask-city",
    label: "مراجعة البيانات",
    path: "/ask-city",
    module: "مساعد اسأل مدينتك",
    phase: "Municipality",
    status: "active",
    summary: "مراجعة داخلية تعتمد على بيانات CityMind Tripoli المحملة ولا تستبدل القرار البلدي.",
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
