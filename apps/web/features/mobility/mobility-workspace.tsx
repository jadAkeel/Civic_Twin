"use client";

import { useEffect, useState } from "react";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  fallbackMobilityComparison,
  mobilityPoints,
  routeTypeLabels,
} from "@/features/mobility/mobility-data";
import { citymindApi, type MobilityRouteComparison, type MobilityRouteOption } from "@/lib/api-client";
import { tripoliRouteOverlays, type TripoliRouteOverlay } from "@/features/map/tripoli-map-data";

function routeTone(routeType: MobilityRouteOption["route_type"]) {
  if (routeType === "greenest") return "green";
  if (routeType === "safest" || routeType === "accessible") return "blue";
  if (routeType === "most_walkable") return "amber";
  return "neutral";
}

function routeOverlayFromOption(route: MobilityRouteOption | undefined): TripoliRouteOverlay {
  const coordinates = route?.segments.flatMap((segment) =>
    segment.coordinates.map((coordinate) => {
      const [first, second] = coordinate;
      return first > 33 && first < 35 && second > 35 ? [second, first] : [first, second];
    }),
  ) as [number, number][] | undefined;

  if (coordinates?.length && route) {
    return {
      id: `selected-${route.route_type}`,
      name: routeTypeLabels[route.route_type],
      kind: route.route_type === "fastest" ? "traffic" : "green",
      description: `${route.estimated_minutes.toFixed(1)} minutes, ${route.distance_meters} meters.`,
      coordinates,
    };
  }

  return tripoliRouteOverlays[0];
}

export function MobilityWorkspace() {
  const [origin, setOrigin] = useState("Al Mina");
  const [destination, setDestination] = useState("Old Souks");
  const [comparison, setComparison] = useState<MobilityRouteComparison>(fallbackMobilityComparison);
  const [selectedType, setSelectedType] = useState<MobilityRouteOption["route_type"]>("greenest");
  const [source, setSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    let mounted = true;
    citymindApi.mobility
      .compareRoutes(origin, destination)
      .then((data) => {
        if (!mounted) return;
        setComparison(data);
        setSource("api");
        setSelectedType(data.options[0]?.route_type ?? "fastest");
      })
      .catch(() => {
        if (!mounted) return;
        setComparison(fallbackMobilityComparison);
        setSource("fallback");
      });

    return () => {
      mounted = false;
    };
  }, [origin, destination]);

  const selectedRoute = comparison.options.find((option) => option.route_type === selectedType) ?? comparison.options[0];
  const selectedOverlay = routeOverlayFromOption(selectedRoute);
  const fastest = comparison.options.reduce(
    (best, option) => (option.estimated_minutes < best.estimated_minutes ? option : best),
    comparison.options[0] ?? fallbackMobilityComparison.options[0],
  );
  const longestDistance = Math.max(...comparison.options.map((option) => option.distance_meters), 1);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Route options" value={String(comparison.options.length)} detail="Rule-based modes over Tripoli seed edges" tone="blue" />
        <MetricCard label="Fastest time" value={`${fastest.estimated_minutes.toFixed(1)}m`} detail={routeTypeLabels[fastest.route_type]} tone="amber" />
        <MetricCard label="Provider" value={source} detail="Mock seed graph with future adapter shape" tone="green" />
        <MetricCard label="Segments" value={String(selectedRoute?.segments.length ?? 0)} detail="Edges in selected route" tone="rose" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Route planner" eyebrow={source === "api" ? "API connected" : "Local fallback"}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Origin
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={origin}
                onChange={(event) => setOrigin(event.target.value)}
              >
                {mobilityPoints.map((point) => (
                  <option key={point}>{point}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Destination
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
              >
                {mobilityPoints.map((point) => (
                  <option key={point}>{point}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            {comparison.options.map((route) => (
              <button
                className="rounded-md border border-slate-200 bg-white p-4 text-left hover:border-teal-500"
                key={route.route_type}
                type="button"
                onClick={() => setSelectedType(route.route_type)}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{routeTypeLabels[route.route_type]}</p>
                  <Badge tone={routeTone(route.route_type)}>{route.estimated_minutes.toFixed(1)} min</Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar value={(route.distance_meters / longestDistance) * 100} tone="blue" />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Route comparison" eyebrow={`${comparison.origin} to ${comparison.destination}`}>
          <CityMapCanvas
            compact
            heightClassName="mb-5 min-h-[360px]"
            activeLayers={{
              neighborhoods: true,
              reports: false,
              waste: false,
              roads: false,
              lighting: false,
              pollution: false,
              greenRoutes: true,
              traffic: true,
              assets: false,
            }}
            routes={[selectedOverlay]}
          />

          <DataTable
            rows={comparison.options}
            getRowKey={(row) => row.route_type}
            columns={[
              { header: "Type", cell: (row) => <span className="font-semibold">{routeTypeLabels[row.route_type]}</span> },
              { header: "Minutes", cell: (row) => row.estimated_minutes.toFixed(1) },
              { header: "Distance", cell: (row) => `${row.distance_meters} m` },
              { header: "Score", cell: (row) => row.score.toFixed(2) },
            ]}
          />

          {selectedRoute ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-950">{routeTypeLabels[selectedRoute.route_type]}</p>
                <Badge tone={routeTone(selectedRoute.route_type)}>{selectedRoute.provider_interface}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {selectedRoute.segments.map((segment) => (
                  <div key={segment.id} className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-950">{segment.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {segment.from_label} to {segment.to_label} | {segment.length_meters} m
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
