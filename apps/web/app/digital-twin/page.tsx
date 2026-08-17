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
        eyebrow="جاهزية نموذج المدينة"
        title="نموذج طرابلس ثلاثي الأبعاد"
        description="صفحة تخطيط بلدية مستقبلية توضّح الطبقات المطلوبة قبل عرض نموذج ثلاثي الأبعاد رسمي. لا توجد طبقات GIS أو مبانٍ رسمية مهيأة بعد."
        status="البلدية"
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Panel title="طبقات النموذج المطلوبة" eyebrow="حالة مصادر البيانات">
          <DataTable
            rows={digitalTwinLayers}
            getRowKey={(row) => row.id}
            columns={[
              { header: "الطبقة", cell: (row) => <span className="font-semibold">{row.name}</span>, className: "min-w-[240px] px-4 py-3" },
              { header: "النوع", cell: (row) => layerTypeLabel(row.type) },
              { header: "المصدر", cell: (row) => row.source },
              { header: "الحالة", cell: () => <Badge tone="amber">غير مهيأ رسميًا</Badge> },
            ]}
          />
        </Panel>

        <Panel title="قبل النشر البلدي" eyebrow="قائمة تحقق">
          <div className="space-y-3">
            {[
              "اعتماد مصدر رسمي للمباني والارتفاعات",
              "اعتماد مصدر رسمي للتضاريس وحدود الأحياء",
              "مراجعة دقة طبقات الأصول والمخاطر قبل العرض",
              "إخفاء النموذج عن الجمهور إلى حين اكتمال التحقق",
            ].map((item) => (
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
