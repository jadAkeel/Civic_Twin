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

function predictionMessageLabel(message: string) {
  if (message.includes("Rule-based waste accumulation signal")) {
    return "إشارة تراكم نفايات مبنية على قواعد في هذه المنطقة. هذه نتيجة تجريبية وليست إنذارًا رسميًا.";
  }
  return message;
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
  const avgConfidence =
    predictions.reduce((total, item) => total + item.confidence_score, 0) / Math.max(predictions.length, 1);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="إشارات المخاطر" value={String(predictions.length)} detail="توقعات طرابلس المبنية على قواعد" tone="blue" />
        <MetricCard label="مخاطر حرجة" value={String(criticalCount)} detail="أعلى إشارات حارس المدينة خطورة" tone="rose" />
        <MetricCard label="أعلى خطر" value={String(top.risk_score)} detail={`${predictionLabel(top.prediction_type)} في ${neighborhoodLabel(top.neighborhood)}`} tone="amber" />
        <MetricCard label="الثقة" value={`${Math.round(avgConfidence * 100)}%`} detail={source === "api" ? "محرك قواعد API" : providerLabel(source)} tone="green" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="لوحة المخاطر" eyebrow="حارس المدينة">
          <div className="space-y-4">
            {predictions.slice(0, 8).map((prediction) => (
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
            ))}
          </div>
        </Panel>

        <Panel title="جدول الأدلة" eyebrow="قواعد قابلة للتدقيق">
          <DataTable
            rows={predictions.slice(0, 10)}
            getRowKey={(row) => row.id}
            columns={[
              { header: "الخطر", cell: (row) => <span className="font-semibold">{predictionLabel(row.prediction_type)}</span>, className: "min-w-[240px] px-4 py-3" },
              { header: "المنطقة", cell: (row) => neighborhoodLabel(row.neighborhood) },
              { header: "النافذة", cell: (row) => `${row.prediction_window_hours} ساعة` },
              { header: "الثقة", cell: (row) => `${Math.round(row.confidence_score * 100)}%` },
              { header: "الأدلة", cell: (row) => Object.keys(row.evidence_json).length },
            ]}
          />
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {predictionMessageLabel(top.message)}
          </p>
        </Panel>
      </div>
    </div>
  );
}
