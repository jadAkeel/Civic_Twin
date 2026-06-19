import { MobilityWorkspace } from "@/features/mobility/mobility-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function MobilityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="جاهزية إرشاد المسارات"
        title="مسارات المشي والمسارات البديلة"
        description="مزودو التوجيه والمرور الحي والظل والحرارة وجودة الأرصفة والغطاء الأخضر غير مهيئين بعد. المسارات التجريبية مذكورة كعينات فقط."
        status="بوابة المواطن"
      />

      <MobilityWorkspace />
    </div>
  );
}
