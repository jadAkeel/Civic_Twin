import { PageHeader } from "@/components/page/page-header";
import { PredictionWorkspace } from "@/features/predictions/prediction-workspace";

export default function PredictionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="محرك توقعات حارس المدينة"
        title="توقعات مخاطر طرابلس المبنية على قواعد"
        description="إشارات مخاطر قابلة للتدقيق للازدحام والنفايات والبنية التحتية والحرارة وضغط الخدمات، مع أدلة بصيغة JSON."
        status="البلدية"
      />

      <PredictionWorkspace />
    </div>
  );
}
