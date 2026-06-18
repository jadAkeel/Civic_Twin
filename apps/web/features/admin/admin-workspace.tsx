"use client";

import { useMemo, useState } from "react";
import type { SmartReport } from "@citymind/shared";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { fallbackReports, reportStatuses } from "@/features/reports/report-options";
import { citymindApi, type AdminAsset, type AdminOverview } from "@/lib/api-client";

const fallbackOverview: AdminOverview = {
  reports_total: 20,
  assets_total: 10,
  open_reports: 19,
  pending_scenarios: 5,
  active_predictions: 8,
};

const fallbackAssets: AdminAsset[] = [
  { id: "asset-1", name: "Al Mina Coastal Road Segment", asset_type: "road", status: "active", neighborhood_slug: "al-mina" },
  { id: "asset-2", name: "Old Souks Heritage Walking Path", asset_type: "sidewalk", status: "needs_maintenance", neighborhood_slug: "old-souks" },
];

function assetStatusLabel(status: AdminAsset["status"]) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function AdminWorkspace() {
  const [email, setEmail] = useState("admin.demo@citymind.local");
  const [token, setToken] = useState("");
  const [role, setRole] = useState("not signed in");
  const [overview, setOverview] = useState(fallbackOverview);
  const [reports, setReports] = useState<SmartReport[]>(fallbackReports);
  const [assets, setAssets] = useState<AdminAsset[]>(fallbackAssets);
  const [source, setSource] = useState<"api" | "fallback">("fallback");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReportId, setSelectedReportId] = useState(fallbackReports[0]?.id ?? "");

  const filteredReports = useMemo(
    () => reports.filter((report) => statusFilter === "all" || report.status === statusFilter),
    [reports, statusFilter],
  );

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0];

  async function login() {
    try {
      const auth = await citymindApi.auth.login(email);
      const [adminOverview, adminReports, adminAssets] = await Promise.all([
        citymindApi.admin.overview(auth.access_token),
        citymindApi.admin.reports(auth.access_token),
        citymindApi.admin.assets(auth.access_token),
      ]);
      setToken(auth.access_token);
      setRole(auth.user.role);
      setOverview(adminOverview);
      setReports(adminReports);
      setSelectedReportId(adminReports[0]?.id ?? "");
      setAssets(adminAssets);
      setSource("api");
    } catch {
      setRole("fallback admin");
      setSource("fallback");
    }
  }

  async function updateReport(id: string, status: SmartReport["status"]) {
    if (!token) return;
    const updated = await citymindApi.admin.updateReportStatus(token, id, status);
    setReports((current) => current.map((report) => (report.id === id ? updated : report)));
  }

  async function updateAsset(id: string, status: AdminAsset["status"]) {
    if (!token) return;
    const updated = await citymindApi.admin.updateAssetStatus(token, id, status);
    setAssets((current) => current.map((asset) => (asset.id === id ? updated : asset)));
  }

  return (
    <div className="space-y-6">
      <Panel title="Municipality sign in" eyebrow="Local access" action={<Badge tone={source === "api" ? "green" : "amber"}>{role}</Badge>}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={login}>
            Sign in locally
          </button>
        </div>
      </Panel>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Reports" value={String(overview.reports_total)} detail="Admin-visible tickets" tone="blue" />
        <MetricCard label="Open" value={String(overview.open_reports)} detail="Municipal workload" tone="amber" />
        <MetricCard label="Assets" value={String(overview.assets_total)} detail="Managed city assets" tone="green" />
        <MetricCard label="Scenarios" value={String(overview.pending_scenarios)} detail="Review queue" tone="blue" />
        <MetricCard label="Predictions" value={String(overview.active_predictions)} detail="Risk review" tone="rose" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Report status management" eyebrow="Municipal workflow">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px]">
            <p className="text-sm leading-6 text-slate-600">
              Filter the queue, select a ticket, and update response status from one place.
            </p>
            <select
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {reportStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <DataTable
            rows={filteredReports.slice(0, 8)}
            getRowKey={(row) => row.id}
            columns={[
              {
                header: "Ticket",
                cell: (row) => (
                  <button
                    className="font-semibold text-teal-800 hover:text-teal-950"
                    type="button"
                    onClick={() => setSelectedReportId(row.id)}
                  >
                    {row.id}
                  </button>
                ),
              },
              { header: "Area", cell: (row) => row.neighborhood },
              {
                header: "Status",
                cell: (row) => (
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    value={row.status}
                    onChange={(event) => updateReport(row.id, event.target.value as SmartReport["status"])}
                  >
                    {reportStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ),
              },
              { header: "Severity", cell: (row) => row.severity },
            ]}
          />
        </Panel>

        <Panel title="City assets" eyebrow="Asset management">
          {selectedReport ? (
            <CityMapCanvas
              compact
              heightClassName="mb-5 min-h-[300px]"
              activeLayers={{
                neighborhoods: true,
                reports: true,
                waste: true,
                roads: true,
                lighting: true,
                pollution: true,
                greenRoutes: false,
                traffic: false,
                assets: true,
              }}
              issues={[
                {
                  id: selectedReport.id,
                  title: selectedReport.title,
                  description: selectedReport.description,
                  category: selectedReport.category,
                  severity: selectedReport.severity,
                  status:
                    selectedReport.status === "duplicate" || selectedReport.status === "rejected"
                      ? "resolved"
                      : selectedReport.status,
                  neighborhood: selectedReport.neighborhood,
                  neighborhoodSlug: selectedReport.neighborhoodSlug,
                  latitude: selectedReport.latitude,
                  longitude: selectedReport.longitude,
                },
              ]}
            />
          ) : null}
          <DataTable
            rows={assets.slice(0, 8)}
            getRowKey={(row) => row.id}
            columns={[
              { header: "Asset", cell: (row) => <span className="font-semibold">{row.name}</span>, className: "min-w-[220px] px-4 py-3" },
              { header: "Type", cell: (row) => row.asset_type },
              {
                header: "Status",
                cell: (row) => (
                  <select
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                    value={row.status}
                    onChange={(event) => updateAsset(row.id, event.target.value as AdminAsset["status"])}
                  >
                    {["active", "needs_maintenance", "inactive", "planned"].map((status) => (
                      <option key={status} value={status}>
                        {assetStatusLabel(status as AdminAsset["status"])}
                      </option>
                    ))}
                  </select>
                ),
              },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
