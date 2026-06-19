import { TripoliMapWorkspace } from "@/components/map/tripoli-map-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function MapPage() {
  return (
    <div>
      <PageHeader
        eyebrow="خريطة طرابلس التفاعلية"
        title="استكشف بلاغات طرابلس وأحياءها وأصول المدينة"
        description="خريطة OpenStreetMap حقيقية مع علامات بلاغات طرابلس وحدود أحياء تقريبية وأصول بلدية ومسارات خضراء وطبقات حركة مرور."
        status="خريطة مباشرة"
      />

      <TripoliMapWorkspace />
    </div>
  );
}
