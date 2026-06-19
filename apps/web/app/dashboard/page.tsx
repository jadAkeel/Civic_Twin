import { CityPulseWorkspace } from "@/components/dashboard/city-pulse-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="لوحة نبض المدينة"
        title="نظرة تشغيلية ذكية على طرابلس"
        description="مؤشرات تشغيل بلدية، ترتيب الأحياء، توزيع الفئات، مناطق الأولوية، وآخر بلاغات المواطنين في طرابلس."
        status="البلدية"
      />

      <CityPulseWorkspace />
    </div>
  );
}
