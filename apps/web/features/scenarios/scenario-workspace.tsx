"use client";

import { useState } from "react";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  actionLabel,
  fallbackScenarioResult,
  scenarioActions,
  scenarioNeighborhoods,
} from "@/features/scenarios/scenario-data";
import { tripoliRouteOverlays } from "@/features/map/tripoli-map-data";
import { citymindApi, type ScenarioResult } from "@/lib/api-client";

function riskTone(risk: ScenarioResult["risk_level"]) {
  if (risk === "high" || risk === "critical") return "rose";
  if (risk === "medium") return "amber";
  return "green";
}

export function ScenarioWorkspace() {
  const [name, setName] = useState("Bab Al Tebbaneh waste and tree pilot");
  const [neighborhoodSlug, setNeighborhoodSlug] = useState("bab-al-tebbaneh");
  const [selectedActions, setSelectedActions] = useState<string[]>(["ADD_TREES", "IMPROVE_WASTE_COLLECTION"]);
  const [results, setResults] = useState<ScenarioResult[]>([fallbackScenarioResult]);
  const [source, setSource] = useState<"api" | "fallback">("fallback");

  function toggleAction(action: string) {
    setSelectedActions((current) =>
      current.includes(action) ? current.filter((item) => item !== action) : [...current, action],
    );
  }

  async function simulate() {
    if (!selectedActions.length) return;

    try {
      const result = await citymindApi.scenarios.simulate({
        name,
        neighborhood_slug: neighborhoodSlug,
        actions: selectedActions,
      });
      setResults((current) => [result, ...current]);
      setSource("api");
    } catch {
      setResults((current) => [
        {
          ...fallbackScenarioResult,
          id: `local-scenario-${Date.now()}`,
          scenario_name: name,
          neighborhood_slug: neighborhoodSlug,
          actions: selectedActions,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setSource("fallback");
    }
  }

  const latest = results[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Green delta" value={`+${latest.green_score_delta}`} detail="Projected green score movement" tone="green" />
        <MetricCard label="Walkability delta" value={`+${latest.walkability_delta}`} detail="Pedestrian comfort change" tone="blue" />
        <MetricCard label="Estimated cost" value={`$${Math.round(latest.estimated_cost / 1000)}k`} detail="Rule-based capital estimate" tone="amber" />
        <MetricCard label="Risk" value={latest.risk_level} detail={`${Math.round(latest.confidence_score * 100)}% confidence`} tone="rose" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel title="Scenario builder" eyebrow={source === "api" ? "API connected" : "Local fallback"}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Scenario name
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Neighborhood
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={neighborhoodSlug}
                onChange={(event) => setNeighborhoodSlug(event.target.value)}
              >
                {scenarioNeighborhoods.map((neighborhood) => (
                  <option key={neighborhood.slug} value={neighborhood.slug}>
                    {neighborhood.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-sm font-medium text-slate-700">Actions</p>
              <div className="mt-2 grid gap-2">
                {scenarioActions.map((action) => (
                  <button
                    className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${
                      selectedActions.includes(action)
                        ? "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    key={action}
                    type="button"
                    onClick={() => toggleAction(action)}
                  >
                    {actionLabel(action)}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="w-full rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              type="button"
              onClick={simulate}
            >
              Simulate scenario
            </button>
          </div>
        </Panel>

        <Panel
          title="Before and after"
          eyebrow={latest.scenario_name}
          action={<Badge tone={riskTone(latest.risk_level)}>{latest.risk_level}</Badge>}
        >
          <CityMapCanvas
            compact
            heightClassName="mb-5 min-h-[340px]"
            activeLayers={{
              neighborhoods: true,
              reports: false,
              waste: selectedActions.includes("IMPROVE_WASTE_COLLECTION"),
              roads: selectedActions.includes("IMPROVE_SIDEWALKS") || selectedActions.includes("CHANGE_TRAFFIC_FLOW"),
              lighting: selectedActions.includes("IMPROVE_LIGHTING"),
              pollution: false,
              greenRoutes:
                selectedActions.includes("ADD_TREES") ||
                selectedActions.includes("ADD_BIKE_LANE") ||
                selectedActions.includes("ADD_PARK"),
              traffic: selectedActions.includes("CHANGE_TRAFFIC_FLOW"),
              assets: true,
            }}
            routes={tripoliRouteOverlays.filter((route) =>
              selectedActions.includes("CHANGE_TRAFFIC_FLOW") ? route.kind !== "green" : route.kind !== "traffic",
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Green score", latest.green_score_delta, "green"],
              ["Air quality", latest.air_quality_delta, "blue"],
              ["Walkability", latest.walkability_delta, "green"],
              ["Traffic", latest.traffic_delta, "amber"],
              ["Pollution", latest.pollution_delta, "rose"],
              ["Temperature", latest.temperature_delta, "blue"],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-md border border-slate-200 p-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{label}</span>
                  <span className="text-slate-600">{Number(value) > 0 ? "+" : ""}{value}</span>
                </div>
                <div className="mt-3">
                  <ProgressBar value={Math.min(Math.abs(Number(value)) * 10, 100)} tone={tone as never} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {latest.recommendation}
          </p>
        </Panel>
      </div>

      <Panel title="Scenario results" eyebrow="Persisted simulation outputs">
        <DataTable
          rows={results}
          getRowKey={(row) => row.id}
          columns={[
            { header: "Scenario", cell: (row) => <span className="font-semibold">{row.scenario_name}</span>, className: "min-w-[260px] px-4 py-3" },
            { header: "Actions", cell: (row) => row.actions.length },
            { header: "Cost", cell: (row) => `$${Math.round(row.estimated_cost).toLocaleString()}` },
            { header: "Days", cell: (row) => row.implementation_time_days },
            { header: "Risk", cell: (row) => <Badge tone={riskTone(row.risk_level)}>{row.risk_level}</Badge> },
          ]}
        />
      </Panel>
    </div>
  );
}
