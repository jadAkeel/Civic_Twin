import { PageHeader } from "@/components/page/page-header";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Panel } from "@/components/ui/panel";
import { digitalTwinLayers } from "@/features/digital-twin/digital-twin-layers";

function layerTypeLabel(type: string) {
  const labels: Record<string, string> = {
    buildings: "مبانٍ",
    terrain: "تضاريس",
    mobility: "تنقل",
    assets: "أصول",
    risk: "مخاطر",
  };
  return labels[type] ?? type;
}

export default function DigitalTwinPage() {
  return (
    <div>
      <PageHeader
        eyebrow="التوأم الرقمي ثلاثي الأبعاد"
        title="خطة حدود طرابلس ثلاثية الأبعاد"
        description="عقود طبقات جاهزة مستقبلًا لـ Cesium وCityGML و3D Tiles و3DCityDB وطبقات التنقل والأصول والمخاطر."
        status="وحدة مستقبلية"
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="واجهات الطبقات ثلاثية الأبعاد" eyebrow="لا تحتاج إلى رمز وصول">
          <DataTable
            rows={digitalTwinLayers}
            getRowKey={(row) => row.id}
            columns={[
              { header: "الطبقة", cell: (row) => <span className="font-semibold">{row.name}</span>, className: "min-w-[240px] px-4 py-3" },
              { header: "النوع", cell: (row) => layerTypeLabel(row.type) },
              { header: "المصدر", cell: (row) => row.source },
              {
                header: "افتراضي",
                cell: (row) => <Badge tone={row.enabledByDefault ? "green" : "neutral"}>{row.enabledByDefault ? "مفعل" : "متوقف"}</Badge>,
              },
            ]}
          />
        </Panel>

        <Panel title="مسار التنفيذ ثلاثي الأبعاد" eyebrow="ملاحظات التنفيذ">
          <div className="space-y-3">
            {["استيراد CityGML", "بث 3D Tiles", "تخزين 3DCityDB", "إعداد رمز Cesium لاحقًا"].map((item) => (
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
