"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fallbackPredictions, predictionLabel } from "@/features/predictions/prediction-data";
import { citymindApi, type PredictionSignal } from "@/lib/api-client";

function severityTone(severity: PredictionSignal["severity"]) {
  if (severity === "critical") return "rose";
  if (severity === "high") return "amber";
  if (severity === "medium") return "blue";
  return "green";
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
        <MetricCard label="Risk signals" value={String(predictions.length)} detail="Rule-based Tripoli predictions" tone="blue" />
        <MetricCard label="Critical risks" value={String(criticalCount)} detail="Highest severity city guardian signals" tone="rose" />
        <MetricCard label="Top risk" value={String(top.risk_score)} detail={`${predictionLabel(top.prediction_type)} in ${top.neighborhood}`} tone="amber" />
        <MetricCard label="Confidence" value={`${Math.round(avgConfidence * 100)}%`} detail={source === "api" ? "API rule engine" : "Local fallback"} tone="green" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Risk dashboard" eyebrow="City Guardian">
          <div className="space-y-4">
            {predictions.slice(0, 8).map((prediction) => (
              <div key={prediction.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{predictionLabel(prediction.prediction_type)}</p>
                    <p className="mt-1 text-sm text-slate-600">{prediction.neighborhood}</p>
                  </div>
                  <Badge tone={severityTone(prediction.severity)}>{prediction.severity}</Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar value={prediction.risk_score} tone={severityTone(prediction.severity)} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Evidence table" eyebrow="Auditable rules">
          <DataTable
            rows={predictions.slice(0, 10)}
            getRowKey={(row) => row.id}
            columns={[
              { header: "Risk", cell: (row) => <span className="font-semibold">{predictionLabel(row.prediction_type)}</span>, className: "min-w-[240px] px-4 py-3" },
              { header: "Area", cell: (row) => row.neighborhood },
              { header: "Window", cell: (row) => `${row.prediction_window_hours}h` },
              { header: "Confidence", cell: (row) => `${Math.round(row.confidence_score * 100)}%` },
              { header: "Evidence", cell: (row) => Object.keys(row.evidence_json).length },
            ]}
          />
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {top.message}
          </p>
        </Panel>
      </div>
    </div>
  );
}
