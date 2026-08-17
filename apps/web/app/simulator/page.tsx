import { PageHeader } from "@/components/page/page-header";
import { ScenarioWorkspace } from "@/features/scenarios/scenario-workspace";

export default function SimulatorPage() {
  return (
    <div>
      <PageHeader
        eyebrow="محاكي السيناريوهات الحضرية"
        title="تقدير أثر التدخلات في طرابلس"
        description="قارن أثر التدخلات قبل اعتمادها ضمن خطة البلدية، مع إظهار الكلفة والمخاطر ونطاق عدم اليقين."
      />

      <ScenarioWorkspace />
    </div>
  );
}
