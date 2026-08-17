import { CityPulseWorkspace } from "@/components/dashboard/city-pulse-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="لوحة نبض المدينة"
        title="نظرة تشغيلية على بلاغات طرابلس"
        description="مؤشرات الأداء البلدية مع بلاغات المواطنين في الوقت الفعلي لتحسين الخدمات والاستجابة السريعة."
      />

      <CityPulseWorkspace />
    </div>
  );
}
