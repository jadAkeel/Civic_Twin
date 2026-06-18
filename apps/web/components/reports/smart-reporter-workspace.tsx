"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ReportCategory,
  ReportCategorySuggestion,
  ReportSeverity,
  ReportStatus,
  SmartReport,
  SmartReportCreateInput,
} from "@citymind/shared";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import {
  categoryLabel,
  fallbackReports,
  reportCategories,
  reportSeverities,
  reportStatuses,
  statusLabel,
  tripoliNeighborhoodOptions,
} from "@/features/reports/report-options";
import { citymindApi } from "@/lib/api-client";
import { cn } from "@/lib/cn";

const defaultNeighborhood = tripoliNeighborhoodOptions[2];

type FormState = {
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  neighborhoodSlug: string;
  latitude: string;
  longitude: string;
  imageUrl: string;
};

const initialForm: FormState = {
  title: "",
  description: "",
  category: "garbage",
  severity: "medium",
  neighborhoodSlug: defaultNeighborhood.slug,
  latitude: String(defaultNeighborhood.latitude),
  longitude: String(defaultNeighborhood.longitude),
  imageUrl: "",
};

function severityTone(severity: ReportSeverity) {
  if (severity === "critical") return "rose";
  if (severity === "high") return "amber";
  if (severity === "medium") return "blue";
  return "green";
}

function statusTone(status: ReportStatus) {
  if (status === "resolved") return "green";
  if (status === "in_progress" || status === "validated") return "blue";
  if (status === "duplicate" || status === "rejected") return "rose";
  return "amber";
}

function toPayload(form: FormState): SmartReportCreateInput {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    severity: form.severity,
    neighborhoodSlug: form.neighborhoodSlug,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    imageUrl: form.imageUrl || null,
  };
}

function updateUploadPlaceholder(file: File): string {
  const placeholderUrl = `local://reports/${file.name}`;
  const entry = {
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    placeholderUrl,
    capturedAt: new Date().toISOString(),
  };
  const existing = JSON.parse(localStorage.getItem("citymind.reportUploads") ?? "[]") as unknown[];
  localStorage.setItem("citymind.reportUploads", JSON.stringify([entry, ...existing].slice(0, 12)));
  return placeholderUrl;
}

export function SmartReporterWorkspace() {
  const [reports, setReports] = useState<SmartReport[]>(fallbackReports);
  const [selectedReportId, setSelectedReportId] = useState(fallbackReports[0]?.id ?? "");
  const [form, setForm] = useState<FormState>(initialForm);
  const [suggestion, setSuggestion] = useState<ReportCategorySuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiState, setApiState] = useState<"api" | "fallback">("fallback");
  const [notice, setNotice] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    citymindApi.reports
      .list()
      .then((apiReports) => {
        if (!mounted) return;
        setReports(apiReports);
        setSelectedReportId(apiReports[0]?.id ?? "");
        setApiState("api");
      })
      .catch(() => {
        if (!mounted) return;
        setReports(fallbackReports);
        setSelectedReportId(fallbackReports[0]?.id ?? "");
        setApiState("fallback");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const selectedNeighborhood = useMemo(
    () => tripoliNeighborhoodOptions.find((item) => item.slug === form.neighborhoodSlug) ?? defaultNeighborhood,
    [form.neighborhoodSlug],
  );

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0];
  const openReports = reports.filter((report) => !["resolved", "rejected"].includes(report.status)).length;
  const criticalReports = reports.filter((report) => report.severity === "critical").length;
  const duplicateSignals = reports.filter((report) => report.duplicateCandidates.length > 0 || report.duplicateGroupId).length;

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function chooseNeighborhood(slug: string) {
    const option = tripoliNeighborhoodOptions.find((item) => item.slug === slug) ?? defaultNeighborhood;
    patchForm({
      neighborhoodSlug: option.slug,
      latitude: String(option.latitude),
      longitude: String(option.longitude),
    });
  }

  async function suggestCategory() {
    setNotice("");
    const payload = toPayload(form);
    if (!payload.title || !payload.description) {
      setNotice("Add a title and description before asking for a category suggestion.");
      return;
    }

    try {
      const result = await citymindApi.reports.suggestCategory(payload);
      setSuggestion(result);
      patchForm({ category: result.category });
      setApiState("api");
    } catch {
      const text = `${payload.title} ${payload.description}`.toLowerCase();
      const category: ReportCategory = text.includes("sidewalk")
        ? "broken_sidewalk"
        : text.includes("traffic")
          ? "traffic_obstruction"
          : text.includes("light")
            ? "street_lighting"
            : text.includes("water")
              ? "water_leakage"
              : text.includes("garbage") || text.includes("waste")
                ? "garbage"
                : "other";
      setSuggestion({
        category,
        confidence: category === "other" ? 0.42 : 0.71,
        rationale: "Local browser fallback suggestion while the API is offline.",
        duplicateCandidates: [],
      });
      patchForm({ category });
      setApiState("fallback");
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice("");

    const payload = toPayload(form);
    try {
      const created = await citymindApi.reports.create(payload);
      setReports((current) => [created, ...current]);
      setSelectedReportId(created.id);
      setForm(initialForm);
      setImagePreviewUrl("");
      setSuggestion(null);
      setApiState("api");
      setNotice(`Created ${created.id}.`);
    } catch {
      const fallback: SmartReport = {
        id: `LOCAL-${String(Date.now()).slice(-6)}`,
        ...payload,
        neighborhood: selectedNeighborhood.name,
        status: "submitted",
        imageUrl: payload.imageUrl ?? null,
        aiDetectedCategory: suggestion?.category ?? payload.category,
        aiConfidence: suggestion?.confidence ?? 0.46,
        duplicateGroupId: null,
        duplicateCandidates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setReports((current) => [fallback, ...current]);
      setSelectedReportId(fallback.id);
      setApiState("fallback");
      setNotice(`Saved ${fallback.id} locally while the API is offline.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateStatus(report: SmartReport, status: ReportStatus) {
    setNotice("");
    try {
      const updated = await citymindApi.reports.updateStatus(report.id, { status });
      setReports((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setApiState("api");
    } catch {
      setReports((current) =>
        current.map((item) =>
          item.id === report.id ? { ...item, status, updatedAt: new Date().toISOString() } : item,
        ),
      );
      setApiState("fallback");
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Visible reports" value={String(reports.length)} detail="Tripoli seed and submitted tickets" tone="blue" />
        <MetricCard label="Open queue" value={String(openReports)} detail="Submitted, validated, and active issues" tone="amber" />
        <MetricCard label="Critical severity" value={String(criticalReports)} detail="Highest priority citizen reports" tone="rose" />
        <MetricCard label="Duplicate signals" value={String(duplicateSignals)} detail="Potential repeat reports near existing tickets" tone="green" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <Panel
          title="Citizen intake"
          eyebrow={apiState === "api" ? "API connected" : "Local fallback"}
          action={
            <Badge tone={apiState === "api" ? "green" : "amber"}>{isLoading ? "Loading" : apiState}</Badge>
          }
        >
          <form className="space-y-4" onSubmit={submitReport}>
            <label className="block text-sm font-medium text-slate-700">
              Title
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm"
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
                placeholder="Garbage overflow near residential block"
                required
                minLength={5}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Description
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm"
                value={form.description}
                onChange={(event) => patchForm({ description: event.target.value })}
                placeholder="Describe what is happening and what residents are affected by."
                required
                minLength={10}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Category
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm"
                  value={form.category}
                  onChange={(event) => patchForm({ category: event.target.value as ReportCategory })}
                >
                  {reportCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Severity
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950 shadow-sm"
                  value={form.severity}
                  onChange={(event) => patchForm({ severity: event.target.value as ReportSeverity })}
                >
                  {reportSeverities.map((severity) => (
                    <option key={severity.value} value={severity.value}>
                      {severity.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">Location</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {tripoliNeighborhoodOptions.map((option) => (
                  <button
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-xs font-semibold transition",
                      form.neighborhoodSlug === option.slug
                        ? "border-teal-600 bg-teal-50 text-teal-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                    key={option.slug}
                    type="button"
                    onClick={() => chooseNeighborhood(option.slug)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <CityMapCanvas
                  compact
                  heightClassName="min-h-[320px]"
                  activeLayers={{
                    neighborhoods: true,
                    reports: true,
                    waste: false,
                    roads: false,
                    lighting: false,
                    pollution: false,
                    greenRoutes: false,
                    traffic: false,
                    assets: false,
                  }}
                  draftPoint={{ latitude: Number(form.latitude), longitude: Number(form.longitude) }}
                  onMapPick={(point) =>
                    patchForm({
                      latitude: point.latitude.toFixed(6),
                      longitude: point.longitude.toFixed(6),
                    })
                  }
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Tap the map to set the exact report location.
                </p>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Latitude
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
                    value={form.latitude}
                    onChange={(event) => patchForm({ latitude: event.target.value })}
                    required
                  />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  Longitude
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal text-slate-950"
                    value={form.longitude}
                    onChange={(event) => patchForm({ longitude: event.target.value })}
                    required
                  />
                </label>
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              Photo preview
              <input
                className="mt-1 w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-700"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    if (imagePreviewUrl) {
                      URL.revokeObjectURL(imagePreviewUrl);
                    }
                    setImagePreviewUrl(URL.createObjectURL(file));
                    patchForm({ imageUrl: updateUploadPlaceholder(file) });
                  }
                }}
              />
              {imagePreviewUrl ? (
                <span className="mt-3 block overflow-hidden rounded-md border border-slate-200">
                  <img alt="Selected report upload preview" className="h-40 w-full object-cover" src={imagePreviewUrl} />
                </span>
              ) : null}
              {form.imageUrl ? <span className="mt-1 block text-xs text-slate-500">Stored locally for this demo session.</span> : null}
            </label>

            {suggestion ? (
              <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                Suggested {categoryLabel(suggestion.category)} at {Math.round(suggestion.confidence * 100)}%.
                {suggestion.duplicateCandidates.length ? ` Possible duplicates: ${suggestion.duplicateCandidates.join(", ")}.` : ""}
              </div>
            ) : null}

            {notice ? <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{notice}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                type="button"
                onClick={suggestCategory}
              >
                Suggest category
              </button>
              <button
                className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting" : "Submit report"}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Report queue" eyebrow="Status operations">
          <DataTable
            rows={reports}
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
              { header: "Issue", cell: (row) => row.title, className: "min-w-[260px] px-4 py-3" },
              { header: "Area", cell: (row) => row.neighborhood },
              {
                header: "Severity",
                cell: (row) => <Badge tone={severityTone(row.severity)}>{row.severity}</Badge>,
              },
              {
                header: "Status",
                cell: (row) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>,
              },
            ]}
          />
        </Panel>
      </div>

      {selectedReport ? (
        <Panel title={selectedReport.title} eyebrow={selectedReport.id}>
          <div className="grid gap-5 lg:grid-cols-[1fr_0.75fr]">
            <div>
              <CityMapCanvas
                compact
                heightClassName="mb-4 min-h-[320px]"
                activeLayers={{
                  neighborhoods: true,
                  reports: true,
                  waste: true,
                  roads: true,
                  lighting: true,
                  pollution: true,
                  greenRoutes: false,
                  traffic: false,
                  assets: false,
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
              <p className="text-sm leading-6 text-slate-700">{selectedReport.description}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-slate-200 p-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Category</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">{categoryLabel(selectedReport.category)}</dd>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Location</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {selectedReport.neighborhood} ({selectedReport.latitude.toFixed(4)}, {selectedReport.longitude.toFixed(4)})
                  </dd>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">AI suggestion</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {selectedReport.aiDetectedCategory
                      ? `${categoryLabel(selectedReport.aiDetectedCategory)} ${selectedReport.aiConfidence ? `(${Math.round(selectedReport.aiConfidence * 100)}%)` : ""}`
                      : "No suggestion"}
                  </dd>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <dt className="text-xs font-semibold uppercase text-slate-500">Duplicate check</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {selectedReport.duplicateCandidates.length
                      ? selectedReport.duplicateCandidates.join(", ")
                      : selectedReport.duplicateGroupId ?? "No duplicate signal"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Update status</p>
              <div className="mt-3 grid gap-2">
                {reportStatuses.map((status) => (
                  <button
                    className={cn(
                      "rounded-md border px-3 py-2 text-left text-sm font-semibold",
                      selectedReport.status === status.value
                        ? "border-teal-600 bg-white text-teal-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                    key={status.value}
                    type="button"
                    onClick={() => updateStatus(selectedReport, status.value)}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
