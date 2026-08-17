import { PageHeader } from "@/components/page/page-header";
import { PredictionWorkspace } from "@/features/predictions/prediction-workspace";

export default function PredictionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="مراجعة بلدية"
        title="قائمة مراجعة إشارات المخاطر"
        description="إشارات مبنية على قواعد قابلة للتدقيق تساعد البلدية على ترتيب المراجعة اليدوية. ليست توقعات رسمية أو إنذارات تشغيلية."
        status="البلدية"
      />

      <PredictionWorkspace />
    </div>
  );
}
