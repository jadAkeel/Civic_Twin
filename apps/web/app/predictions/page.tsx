import { PageHeader } from "@/components/page/page-header";
import { PredictionWorkspace } from "@/features/predictions/prediction-workspace";

export default function PredictionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="City Guardian Prediction Engine"
        title="Tripoli rule-based risk predictions"
        description="Auditable congestion, waste, infrastructure, heat, and service pressure risk signals with evidence JSON."
        status="Municipality"
      />

      <PredictionWorkspace />
    </div>
  );
}
