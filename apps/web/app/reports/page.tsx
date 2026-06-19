import { PageHeader } from "@/components/page/page-header";
import { SmartReporterWorkspace } from "@/components/reports/smart-reporter-workspace";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="بلاغات المواطنين"
        title="بلّغ عن مشكلة في طرابلس"
        description="أرسل بلاغًا مع وصف وصورة اختيارية للمعاينة المحلية، وحدد الموقع عبر GPS أو الخريطة أو اكتبه يدويًا."
        status="بوابة المواطن"
      />

      <SmartReporterWorkspace />
    </div>
  );
}
