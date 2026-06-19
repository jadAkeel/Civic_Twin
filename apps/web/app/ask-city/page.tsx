import { PageHeader } from "@/components/page/page-header";
import { AssistantWorkspace } from "@/features/assistant/assistant-workspace";

export default function AskCityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="اسأل مدينتك"
        title="مساعد طرابلس المعتمد على بيانات المنصة"
        description="مساعد تجريبي يجيب فقط من بيانات CityMind Tripoli المحمّلة ويرفض ادعاء معلومات غير متوفرة."
        status="بوابة المواطن"
      />

      <AssistantWorkspace />
    </div>
  );
}
