"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fallbackPredictions, predictionLabel } from "@/features/predictions/prediction-data";
import { citymindApi, type PredictionSignal } from "@/lib/api-client";
import { neighborhoodLabel, providerLabel, severityLabel } from "@/lib/display-labels";

function severityTone(severity: PredictionSignal["severity"]) {
  if (severity === "critical") return "rose";
  if (severity === "high") return "amber";
  if (severity === "medium") return "blue";
  return "green";
}

function predictionMessageLabel(prediction: PredictionSignal) {
  if (prediction.message.startsWith("Rule-based ")) {
    return `إشارة ${predictionLabel(prediction.prediction_type)} مبنية على قواعد في ${neighborhoodLabel(prediction.neighborhood)}. هذه مراجعة تجريبية وليست توقعًا أو إنذارًا رسميًا.`;
  }
  return prediction.message;
}

export function PredictionWorkspace() {
  const [predictions, setPredictions] = useState<PredictionSignal[]>(fallbackPredictions);
  const [source, setSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    let mounted = true;
    citymindApi.predictions
      .list()
      .then((data) => {
        if (!mounted) return;
        setPredictions(data);
        setSource("api");
      })
      .catch(() => {
        if (!mounted) return;
        setPredictions(fallbackPredictions);
        setSource("fallback");
      });
    return () => {
      mounted = false;
    };
  }, []);

  const top = predictions[0] ?? fallbackPredictions[0];
  const criticalCount = predictions.filter((item) => item.severity === "critical").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="إشارات للمراجعة" value={String(predictions.length)} detail="بنود مرتبة من قواعد بيانات تجريبية" tone="blue" />
        <MetricCard label="أولوية عالية" value={String(criticalCount)} detail="تحتاج تدقيقًا بلديًا قبل أي إجراء" tone="rose" />
        <MetricCard label="أعلى درجة مراجعة" value={String(top.risk_score)} detail={`${predictionLabel(top.prediction_type)} في ${neighborhoodLabel(top.neighborhood)}`} tone="amber" />
        <MetricCard label="مصدر القائمة" value={source === "api" ? "خدمة" : "محلي"} detail={source === "api" ? "قواعد متصلة قابلة للتدقيق" : providerLabel(source)} tone="green" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="بنود المراجعة" eyebrow="قواعد بلدية">
          <div className="space-y-4">
            {predictions.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                لا توجد إشارات مراجعة حاليًا. ستظهر البنود هنا عندما توفر الخدمة بيانات كافية، ولا يتم إنشاء إنذار أو إرسال جهة خارجية من هذه الصفحة.
              </div>
            ) : (
              predictions.slice(0, 8).map((prediction) => (
                <div key={prediction.id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{predictionLabel(prediction.prediction_type)}</p>
                      <p className="mt-1 text-sm text-slate-600">{neighborhoodLabel(prediction.neighborhood)}</p>
                    </div>
                    <Badge tone={severityTone(prediction.severity)}>{severityLabel(prediction.severity)}</Badge>
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
          <DataTable
            rows={predictions.slice(0, 10)}
            getRowKey={(row) => row.id}
            columns={[
              { header: "نوع الإشارة", cell: (row) => <span className="font-semibold">{predictionLabel(row.prediction_type)}</span>, className: "min-w-[240px] px-4 py-3" },
              { header: "المنطقة", cell: (row) => neighborhoodLabel(row.neighborhood) },
              { header: "فترة المراجعة", cell: (row) => `${row.prediction_window_hours} ساعة` },
              { header: "درجة القاعدة", cell: (row) => `${Math.round(row.confidence_score * 100)}%` },
              { header: "الأدلة", cell: (row) => Object.keys(row.evidence_json).length },
            ]}
          />
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {predictions.length > 0
              ? `${predictionMessageLabel(top)} لا ترسل هذه القائمة بلاغًا أو إشعارًا خارجيًا، ولا تستبدل المراجعة البلدية.`
              : "هذه الصفحة تعرض قائمة مراجعة فقط عندما تتوفر بيانات. لا توجد توقعات أو إنذارات رسمية هنا."}
          </p>
        </Panel>
      </div>
    </div>
  );
}
