import { PageHeader } from "@/components/page/page-header";
import { ScenarioWorkspace } from "@/features/scenarios/scenario-workspace";

export default function SimulatorPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Urban Scenario Simulator"
        title="Tripoli before and after simulator"
        description="Rule-based intervention simulation for trees, bike lanes, parks, bus stops, sidewalks, lighting, waste collection, and traffic flow."
        status="Municipality"
      />

      <ScenarioWorkspace />
    </div>
  );
}
