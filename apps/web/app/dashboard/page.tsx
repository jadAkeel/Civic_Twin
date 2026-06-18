import { CityPulseWorkspace } from "@/components/dashboard/city-pulse-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        eyebrow="City Pulse Dashboard"
        title="Tripoli urban intelligence overview"
        description="Municipal operating KPIs, ranked neighborhoods, category mix, priority areas, and recent citizen reports for Tripoli."
        status="Municipality"
      />

      <CityPulseWorkspace />
    </div>
  );
}
