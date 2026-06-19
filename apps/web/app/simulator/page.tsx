import { PageHeader } from "@/components/page/page-header";
import { ScenarioWorkspace } from "@/features/scenarios/scenario-workspace";

export default function SimulatorPage() {
  return (
    <div>
      <PageHeader
        eyebrow="محاكي السيناريوهات الحضرية"
        title="محاكاة قبل وبعد في طرابلس"
        description="محاكاة تدخلات مبنية على قواعد للأشجار ومسارات الدراجات والحدائق ومواقف الحافلات والأرصفة والإنارة وجمع النفايات وتدفق المرور."
        status="البلدية"
      />

      <ScenarioWorkspace />
    </div>
  );
}
