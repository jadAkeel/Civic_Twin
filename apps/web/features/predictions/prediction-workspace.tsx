"use client";

import { AsyncSection, SourceBadge } from "@/components/ui/async-state";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { predictionLabel } from "@/features/predictions/prediction-data";
import { citymindApi, type PredictionSignal } from "@/lib/api-client";
import { neighborhoodLabel, severityLabel } from "@/lib/display-labels";
import { useApiResource } from "@/lib/use-api-resource";

function severityTone(severity: PredictionSignal["severity"]) {
  if (severity === "critical") return "rose";
  if (severity === "high") return "amber";
  if (severity === "medium") return "blue";
  return "green";
}

export function PredictionWorkspace() {
  const resource = useApiResource(() => citymindApi.predictions.list());

  return (
    <div className="space-y-6">
      <AsyncSection resource={resource} loadingLabel="جارٍ تحميل إشارات المراجعة">
        {(predictions) => {
          const top = predictions[0] ?? null;
          const criticalCount = predictions.filter((item) => item.severity === "critical").length;

          return (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricCard
                  label="إشارات للمراجعة"
                  value={String(predictions.length)}
                  detail="بنود مرتبة من قواعد قابلة للتدقيق"
                  tone="blue"
                />
                <MetricCard
                  label="أولوية عالية"
                  value={String(criticalCount)}
                  detail="تحتاج تدقيقًا بلديًا قبل أي إجراء"
                  tone="rose"
                />
                <MetricCard
                  label="أعلى درجة مراجعة"
                  value={top ? String(top.risk_score) : "لا توجد"}
                  detail={
                    top
                      ? `${predictionLabel(top.prediction_type)} في ${neighborhoodLabel(top.neighborhood)}`
                      : "لا توجد إشارات في البيانات الحالية"
                  }
                  tone="amber"
                />
              </section>

              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <Panel
                  title="بنود المراجعة"
                  eyebrow="قواعد بلدية"
                  action={<SourceBadge status={resource.status} isReloading={resource.isReloading} />}
                >
                  <div className="space-y-4">
                    {predictions.length === 0 ? (
                      <EmptyState
                        title="لا توجد إشارات مراجعة حاليًا"
                        description="ستظهر البنود هنا عندما توفر البيانات الحالية أدلة كافية. لا يتم إنشاء إنذار أو إرسال جهة خارجية من هذه الصفحة."
                      />
                    ) : (
                      predictions.slice(0, 8).map((prediction) => (
                        <div key={prediction.id} className="rounded-md border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950">
                                {predictionLabel(prediction.prediction_type)}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {neighborhoodLabel(prediction.neighborhood)}
                              </p>
                            </div>
                            <Badge tone={severityTone(prediction.severity)}>
                              {severityLabel(prediction.severity)}
                            </Badge>
                          </div>
                          <div className="mt-3">
                            <ProgressBar value={prediction.risk_score} tone={severityTone(prediction.severity)} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

                <Panel title="جدول المراجعة" eyebrow="قواعد قابلة للتدقيق">
                  {predictions.length === 0 ? (
                    <EmptyState
                      title="لا توجد بنود لعرضها"
                      description="هذه الصفحة تعرض قائمة مراجعة فقط عندما تتوفر بيانات فعلية. لا توجد توقعات أو إنذارات رسمية هنا."
                    />
                  ) : (
                    <>
                      <DataTable
                        rows={predictions.slice(0, 10)}
                        getRowKey={(row) => row.id}
                        columns={[
                          {
                            header: "نوع الإشارة",
                            cell: (row) => (
                              <span className="font-semibold">{predictionLabel(row.prediction_type)}</span>
                            ),
                            className: "min-w-[240px] px-4 py-3",
                          },
                          { header: "المنطقة", cell: (row) => neighborhoodLabel(row.neighborhood) },
                          { header: "فترة المراجعة", cell: (row) => `${row.prediction_window_hours} ساعة` },
                          { header: "درجة القاعدة", cell: (row) => `${Math.round(row.confidence_score * 100)}%` },
                          { header: "الأدلة", cell: (row) => Object.keys(row.evidence_json).length },
                        ]}
                      />
                      <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {top?.message} لا ترسل هذه القائمة بلاغًا أو إشعارًا خارجيًا، ولا تستبدل المراجعة البلدية.
                      </p>
                    </>
                  )}
                </Panel>
              </div>
            </div>
          );
        }}
      </AsyncSection>
    </div>
  );
}
