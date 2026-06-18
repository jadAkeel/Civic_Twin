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
              {item.score}/100 x {Math.round(item.weight * 100)}%
            </span>
          </div>
          <ProgressBar value={item.contribution} tone="green" />
          <p className="mt-1 text-xs text-slate-500">Contribution: {item.contribution.toFixed(2)}</p>
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
        <MetricCard label="Average green score" value={averageGreen.toFixed(1)} detail="Weighted Tripoli sustainability baseline" tone="green" />
        <MetricCard label="Average walkability" value={averageWalkability.toFixed(1)} detail="Sidewalk, crossing, lighting, and access factors" tone="blue" />
        <MetricCard label="Lowest green score" value={greenScores.at(-1)?.green_score.toFixed(1) ?? "0"} detail={greenScores.at(-1)?.neighborhood ?? "No data"} tone="rose" />
        <MetricCard label="Score source" value={source} detail="API-backed when FastAPI is running" tone="amber" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Green score ranking" eyebrow="Formula output">
          <div className="space-y-4">
            {greenScores.map((row) => (
              <button
                className="block w-full rounded-md border border-slate-200 p-4 text-left hover:border-teal-500"
                key={row.neighborhood_slug}
                type="button"
                onClick={() => setSelectedSlug(row.neighborhood_slug)}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{row.neighborhood}</p>
                  <Badge tone={scoreTone(row.green_score)}>{row.green_score.toFixed(1)}/100</Badge>
                </div>
                <ProgressBar value={row.green_score} tone={scoreTone(row.green_score)} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Walkability baseline" eyebrow="Factor ranking">
          <DataTable
            rows={walkabilityScores}
            getRowKey={(row) => row.neighborhood_slug}
            columns={[
              { header: "Area", cell: (row) => <span className="font-semibold">{row.neighborhood}</span> },
              { header: "Walkability", cell: (row) => `${row.walkability_score.toFixed(1)}/100` },
              {
                header: "Priority",
                cell: (row) => (
                  <Badge tone={row.priority_level === "critical" ? "rose" : "amber"}>{row.priority_level}</Badge>
                ),
              },
            ]}
          />
        </Panel>
      </div>

      {selectedGreen ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Panel
            title={`${selectedGreen.neighborhood} green explainability`}
            eyebrow={`${selectedGreen.measurement_date} | ${selectedGreen.source}`}
            action={<Badge tone={scoreTone(selectedGreen.green_score)}>{selectedGreen.green_score.toFixed(1)}</Badge>}
          >
            <Breakdown items={selectedGreen.green_breakdown} />
          </Panel>

          {selectedWalkability ? (
            <Panel
              title={`${selectedWalkability.neighborhood} walkability explainability`}
              eyebrow={`${selectedWalkability.measurement_date} | ${selectedWalkability.source}`}
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
