import { TripoliMapWorkspace } from "@/components/map/tripoli-map-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function MapPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tripoli Interactive Map"
        title="Explore Tripoli reports, neighborhoods, and city assets"
        description="A real OpenStreetMap surface with Tripoli issue markers, approximate neighborhood boundaries, municipal assets, green routes, and traffic overlays."
        status="Live map"
      />

      <TripoliMapWorkspace />
    </div>
  );
}
