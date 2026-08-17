import type { TripoliNeighborhoodName } from "@citymind/shared";

export type Kpi = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "amber" | "rose";
};

export type NeighborhoodSignal = {
  name: TripoliNeighborhoodName;
  greenScore: number;
  walkability: number;
  trafficRisk: number;
  wasteRisk: number;
  priority: "Critical" | "High" | "Medium";
};

export type IssueSignal = {
  id: string;
  title: string;
  neighborhood: TripoliNeighborhoodName;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "submitted" | "validated" | "in_progress" | "resolved";
};

export type ScenarioSignal = {
  name: string;
  target: TripoliNeighborhoodName;
  action: string;
  expectedDelta: string;
  risk: "Low" | "Medium" | "High";
};

export const cityKpis: Kpi[] = [
  {
    label: "بلاغات مفتوحة",
    value: "16",
    detail: "مشاكل تجريبية ضمن أحياء طرابلس ذات الأولوية",
    tone: "amber",
  },
  {
    label: "متوسط المؤشر الأخضر",
    value: "49",
    detail: "خط أساس تجريبي مرجّح، وليس بيانات بلدية رسمية",
    tone: "green",
  },
  {
    label: "خط أساس قابلية المشي",
    value: "52",
    detail: "الأسواق القديمة والتل في مقدمة المجموعة التجريبية الحالية",
    tone: "blue",
  },
  {
    label: "مناطق عالية المخاطر",
    value: "4",
    detail: "باب التبانة، القبة، الأسواق القديمة، منطقة المرفأ",
    tone: "rose",
  },
];

export const neighborhoodSignals: NeighborhoodSignal[] = [
  {
    name: "Bab Al Tebbaneh",
    greenScore: 41,
    walkability: 38,
    trafficRisk: 76,
    wasteRisk: 81,
    priority: "Critical",
  },
  {
    name: "Old Souks",
    greenScore: 46,
    walkability: 64,
    trafficRisk: 74,
    wasteRisk: 68,
    priority: "High",
  },
  {
    name: "Qoubbeh",
    greenScore: 49,
    walkability: 47,
    trafficRisk: 71,
    wasteRisk: 66,
    priority: "High",
  },
  {
    name: "El Tal",
    greenScore: 52,
    walkability: 61,
    trafficRisk: 82,
    wasteRisk: 49,
    priority: "High",
  },
  {
    name: "Al Mina",
    greenScore: 58,
    walkability: 55,
    trafficRisk: 68,
    wasteRisk: 52,
    priority: "Medium",
  },
];

export const issueSignals: IssueSignal[] = [
  {
    id: "TRP-1024",
    title: "تراكم نفايات قرب كتلة سكنية كثيفة",
    neighborhood: "Bab Al Tebbaneh",
    category: "garbage",
    severity: "critical",
    status: "validated",
  },
  {
    id: "TRP-1021",
    title: "رصيف متضرر على محور مشاة",
    neighborhood: "Old Souks",
    category: "broken_sidewalk",
    severity: "high",
    status: "in_progress",
  },
  {
    id: "TRP-1018",
    title: "ضغط مروري قرب موقف نقل مشترك",
    neighborhood: "El Tal",
    category: "traffic_congestion",
    severity: "high",
    status: "submitted",
  },
  {
    id: "TRP-1015",
    title: "إنارة ضعيفة على وصلة مشاة",
    neighborhood: "Jabal Mohsen",
    category: "broken_street_light",
    severity: "medium",
    status: "validated",
  },
  {
    id: "TRP-1011",
    title: "عائق طريق على شارع وصول داخل الحي",
    neighborhood: "Qoubbeh",
    category: "road_obstacle",
    severity: "medium",
    status: "resolved",
  },
];

export const scenarioSignals: ScenarioSignal[] = [
  {
    name: "تعافي النفايات والخضرة في باب التبانة",
    target: "Bab Al Tebbaneh",
    action: "تحسين جمع النفايات + إضافة أشجار",
    expectedDelta: "+9 في المؤشر الأخضر",
    risk: "Medium",
  },
  {
    name: "أولوية المشاة في التل",
    target: "El Tal",
    action: "أولوية للمشاة + معابر أكثر أمانًا",
    expectedDelta: "+11 في قابلية المشي",
    risk: "High",
  },
  {
    name: "تنقل أخضر ساحلي في الميناء",
    target: "Al Mina",
    action: "مسار دراجات + ممر أشجار",
    expectedDelta: "+8 في التنقل المستدام",
    risk: "Low",
  },
];
