import { MobilityWorkspace } from "@/features/mobility/mobility-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function MobilityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Smart Mobility"
        title="Explore cleaner routes across Tripoli"
        description="Compare fastest, greenest, safest, accessible, and walkable routes with map context for each corridor."
        status="Resident portal"
      />

      <MobilityWorkspace />
    </div>
  );
}
