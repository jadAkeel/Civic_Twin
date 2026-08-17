import { PageHeader } from "@/components/page/page-header";
import { GreenScoreWorkspace } from "@/features/green-score/green-score-workspace";

export default function GreenScorePage() {
  return (
    <div>
      <PageHeader
        eyebrow="المؤشر الأخضر وقابلية المشي"
        title="شرح مؤشرات أحياء طرابلس"
        description="حسابات مرجّحة للمؤشر الأخضر وقابلية المشي مع تفصيل العوامل لكل حي، للاستخدام البلدي التخطيطي."
        status="البلدية"
      />

      <GreenScoreWorkspace />
    </div>
  );
}
