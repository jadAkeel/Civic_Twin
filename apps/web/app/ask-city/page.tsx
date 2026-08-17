import { PageHeader } from "@/components/page/page-header";
import { AssistantWorkspace } from "@/features/assistant/assistant-workspace";

export default function AskCityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="مراجعة بيانات داخلية"
        title="أسئلة بلدية على بيانات طرابلس"
        description="أداة مراجعة تجريبية للبلدية تعتمد فقط على بيانات CityMind Tripoli المحمّلة، ولا تستبدل القرار أو التحقق الميداني."
        status="البلدية"
      />

      <AssistantWorkspace />
    </div>
  );
}
