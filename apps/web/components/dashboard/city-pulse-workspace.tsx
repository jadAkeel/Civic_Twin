"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReportCategory } from "@citymind/shared";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { fallbackDashboardSummary } from "@/features/dashboard/dashboard-summary";
import { categoryLabel, statusLabel } from "@/features/reports/report-options";
import { citymindApi, type DashboardViewSummary } from "@/lib/api-client";

function severityLabel(value: number) {
  if (value >= 3.4) return "Critical";
  if (value >= 2.6) return "High";
  if (value >= 1.8) return "Medium";
  return "Low";
}

export function CityPulseWorkspace() {
  const [summary, setSummary] = useState<DashboardViewSummary>(fallbackDashboardSummary);
  const [source, setSource] = useState<"api" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    citymindApi.dashboard
      .summary()
      .then((data) => {
        if (!mounted) return;
        setSummary(data);
        setSource("api");
      })
      .catch(() => {
        if (!mounted) return;
        setSummary(fallbackDashboardSummary);
        setSource("fallback");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const maxNeighborhoodScore = useMemo(
    () => Math.max(...summary.top_neighborhoods.map((item) => item.priority_score), 1),
    [summary.top_neighborhoods],
  );
  const maxCategoryCount = useMemo(
    () => Math.max(...summary.top_categories.map((item) => item.total_reports), 1),
    [summary.top_categories],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total reports"
          value={String(summary.kpis.total_reports)}
          detail="Citizen tickets in the Tripoli operating queue"
          tone="blue"
        />
        <MetricCard
          label="Open reports"
          value={String(summary.kpis.open_reports)}
          detail="Submitted, validated, and in-progress workload"
          tone="amber"
        />
        <MetricCard
          label="Resolved reports"
          value={String(summary.kpis.resolved_reports)}
          detail="Closed municipal response items"
          tone="green"
        />
        <MetricCard
          label="Severity average"
          value={summary.kpis.average_severity.toFixed(2)}
          detail={`${severityLabel(summary.kpis.average_severity)} weighted issue pressure`}
          tone="rose"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Tripoli operating map"
          eyebrow={source === "api" ? "Live aggregation" : "Local fallback"}
          action={<Badge tone={source === "api" ? "green" : "amber"}>{loading ? "Loading" : source}</Badge>}
        >
          <CityMapCanvas compact heightClassName="min-h-[380px]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Top neighborhood</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {summary.kpis.top_neighborhood ?? "No report data"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Top category</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {summary.kpis.top_category ? categoryLabel(summary.kpis.top_category as ReportCategory) : "No report data"}
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Priority areas" eyebrow="Municipality watchlist">
          <div className="space-y-4">
            {summary.priority_areas.map((area) => (
              <div className="rounded-md border border-slate-200 p-4" key={area.slug}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{area.name}</p>
                  <Badge tone={area.score >= maxNeighborhoodScore * 0.75 ? "rose" : "amber"}>
                    {area.score}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{area.reason}</p>
                <div className="mt-3">
                  <ProgressBar value={(area.score / maxNeighborhoodScore) * 100} tone="rose" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Top neighborhoods" eyebrow="Report concentration">
          <div className="space-y-4">
            {summary.top_neighborhoods.map((neighborhood) => (
              <div key={neighborhood.slug}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{neighborhood.name}</span>
                  <span className="text-slate-500">
                    {neighborhood.open_reports} open / {neighborhood.total_reports} total
                  </span>
                </div>
                <ProgressBar value={(neighborhood.priority_score / maxNeighborhoodScore) * 100} tone="blue" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Top categories" eyebrow="Operational mix">
          <div className="space-y-4">
            {summary.top_categories.map((category) => (
              <div key={category.category}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{categoryLabel(category.category as ReportCategory)}</span>
                  <span className="text-slate-500">{category.total_reports} reports</span>
                </div>
                <ProgressBar value={(category.total_reports / maxCategoryCount) * 100} tone="amber" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Recent reports" eyebrow="Smart Reporter feed">
        <DataTable
          rows={summary.recent_reports}
          getRowKey={(row) => row.id}
          columns={[
            { header: "Ticket", cell: (row) => <span className="font-semibold">{row.id}</span> },
            { header: "Issue", cell: (row) => row.title, className: "min-w-[280px] px-4 py-3" },
            { header: "Area", cell: (row) => row.neighborhood },
            {
              header: "Category",
              cell: (row) => categoryLabel(row.category),
            },
            {
              header: "Status",
              cell: (row) => <Badge tone={row.status === "resolved" ? "green" : "blue"}>{statusLabel(row.status)}</Badge>,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
