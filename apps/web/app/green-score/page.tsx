import { PageHeader } from "@/components/page/page-header";
import { GreenScoreWorkspace } from "@/features/green-score/green-score-workspace";

export default function GreenScorePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Green Score and Walkability"
        title="Tripoli neighborhood score explainability"
        description="Weighted green and walkability calculations with factor-level breakdowns for Tripoli neighborhoods."
        status="Resident portal"
      />

      <GreenScoreWorkspace />
    </div>
  );
}
