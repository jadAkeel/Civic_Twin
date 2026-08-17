"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  factorLabel,
  fallbackGreenScores,
  fallbackWalkabilityScores,
} from "@/features/green-score/score-data";
import {
  citymindApi,
  type GreenScoreRow,
  type ScoreBreakdownItem,
  type WalkabilityScoreRow,
} from "@/lib/api-client";
import { neighborhoodLabel, providerLabel, severityLabel } from "@/lib/display-labels";

function scoreTone(score: number) {
  if (score < 45) return "rose";
  if (score < 55) return "amber";
  if (score < 65) return "blue";
  return "green";
}

function Breakdown({ items }: { items: ScoreBreakdownItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.factor}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-900">{factorLabel(item.factor)}</span>
            <span className="text-slate-500">
              {item.score}/100 × {Math.round(item.weight * 100)}%
            </span>
          </div>
          <ProgressBar value={item.contribution} tone="green" />
          <p className="mt-1 text-xs text-slate-500">المساهمة: {item.contribution.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}

export function GreenScoreWorkspace() {
  const [greenScores, setGreenScores] = useState<GreenScoreRow[]>(fallbackGreenScores);
  const [walkabilityScores, setWalkabilityScores] = useState<WalkabilityScoreRow[]>(fallbackWalkabilityScores);
  const [selectedSlug, setSelectedSlug] = useState(fallbackGreenScores[0]?.neighborhood_slug ?? "al-mina");
  const [source, setSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    let mounted = true;
    Promise.all([citymindApi.scores.green(), citymindApi.scores.walkability()])
      .then(([green, walkability]) => {
        if (!mounted) return;
        setGreenScores(green);
        setWalkabilityScores(walkability);
        setSelectedSlug(green[0]?.neighborhood_slug ?? "al-mina");
        setSource("api");
      })
      .catch(() => {
        if (!mounted) return;
        setGreenScores(fallbackGreenScores);
        setWalkabilityScores(fallbackWalkabilityScores);
        setSource("fallback");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedGreen = greenScores.find((item) => item.neighborhood_slug === selectedSlug) ?? greenScores[0];
  const selectedWalkability =
    walkabilityScores.find((item) => item.neighborhood_slug === selectedGreen?.neighborhood_slug) ??
    walkabilityScores[0];
  const averageGreen = useMemo(
    () => greenScores.reduce((total, item) => total + item.green_score, 0) / Math.max(greenScores.length, 1),
    [greenScores],
  );
  const averageWalkability = useMemo(
    () =>
      walkabilityScores.reduce((total, item) => total + item.walkability_score, 0) /
      Math.max(walkabilityScores.length, 1),
    [walkabilityScores],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="متوسط المؤشر الأخضر" value={averageGreen.toFixed(1)} detail="خط أساس مرجّح لاستدامة طرابلس" tone="green" />
        <MetricCard label="متوسط قابلية المشي" value={averageWalkability.toFixed(1)} detail="عوامل الأرصفة والمعابر والإنارة والوصول" tone="blue" />
        <MetricCard label="أدنى مؤشر أخضر" value={greenScores.at(-1)?.green_score.toFixed(1) ?? "0"} detail={neighborhoodLabel(greenScores.at(-1)?.neighborhood)} tone="rose" />
        <MetricCard label="مصدر المؤشر" value={providerLabel(source)} detail="يعتمد على خدمة CityMind عند تشغيلها" tone="amber" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="ترتيب المؤشر الأخضر" eyebrow="نتيجة المعادلة">
          <div className="space-y-4">
            {greenScores.map((row) => (
              <button
                className="block w-full rounded-md border border-slate-200 p-4 text-right hover:border-teal-500"
                key={row.neighborhood_slug}
                type="button"
                onClick={() => setSelectedSlug(row.neighborhood_slug)}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{neighborhoodLabel(row.neighborhood)}</p>
                  <Badge tone={scoreTone(row.green_score)}>{row.green_score.toFixed(1)}/100</Badge>
                </div>
                <ProgressBar value={row.green_score} tone={scoreTone(row.green_score)} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="خط أساس قابلية المشي" eyebrow="ترتيب العوامل">
          <DataTable
            rows={walkabilityScores}
            getRowKey={(row) => row.neighborhood_slug}
            columns={[
              { header: "المنطقة", cell: (row) => <span className="font-semibold">{neighborhoodLabel(row.neighborhood)}</span> },
              { header: "قابلية المشي", cell: (row) => `${row.walkability_score.toFixed(1)}/100` },
              {
                header: "الأولوية",
                cell: (row) => (
                  <Badge tone={row.priority_level === "critical" ? "rose" : "amber"}>{severityLabel(row.priority_level)}</Badge>
                ),
              },
            ]}
          />
        </Panel>
      </div>

      {selectedGreen ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title={`شرح المؤشر الأخضر في ${neighborhoodLabel(selectedGreen.neighborhood)}`}
            eyebrow={`${selectedGreen.measurement_date} | ${providerLabel(selectedGreen.source)}`}
            action={<Badge tone={scoreTone(selectedGreen.green_score)}>{selectedGreen.green_score.toFixed(1)}</Badge>}
          >
            <Breakdown items={selectedGreen.green_breakdown} />
          </Panel>

          {selectedWalkability ? (
            <Panel
              title={`شرح قابلية المشي في ${neighborhoodLabel(selectedWalkability.neighborhood)}`}
              eyebrow={`${selectedWalkability.measurement_date} | ${providerLabel(selectedWalkability.source)}`}
              action={
                <Badge tone={scoreTone(selectedWalkability.walkability_score)}>
                  {selectedWalkability.walkability_score.toFixed(1)}
                </Badge>
              }
            >
              <Breakdown items={selectedWalkability.walkability_breakdown} />
            </Panel>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
