import { PageHeader } from "@/components/page/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { digitalTwinLayers } from "@/features/digital-twin/digital-twin-layers";

export default function DigitalTwinPage() {
  return (
    <div>
      <PageHeader
        eyebrow="3D Digital Twin"
        title="Tripoli 3D boundary plan"
        description="Cesium-ready layer contracts for future CityGML, 3D Tiles, 3DCityDB, mobility, asset, and risk overlays."
        status="Future module"
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="3D layer interfaces" eyebrow="No token required">
          <DataTable
            rows={digitalTwinLayers}
            getRowKey={(row) => row.id}
            columns={[
              { header: "Layer", cell: (row) => <span className="font-semibold">{row.name}</span>, className: "min-w-[240px] px-4 py-3" },
              { header: "Type", cell: (row) => row.type },
              { header: "Source", cell: (row) => row.source },
              {
                header: "Default",
                cell: (row) => <Badge tone={row.enabledByDefault ? "green" : "neutral"}>{row.enabledByDefault ? "On" : "Off"}</Badge>,
              },
            ]}
          />
        </Panel>

        <Panel title="Future 3D path" eyebrow="Implementation notes">
          <div className="space-y-3">
            {["CityGML import", "3D Tiles streaming", "3DCityDB storage", "Cesium token configuration later"].map((item) => (
              <div key={item} className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-800">
                {item}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
