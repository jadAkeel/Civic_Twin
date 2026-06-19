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
import { neighborhoodLabel, providerLabel } from "@/lib/display-labels";

function severityLabel(value: number) {
  if (value >= 3.4) return "حرجة";
  if (value >= 2.6) return "مرتفعة";
  if (value >= 1.8) return "متوسطة";
  return "منخفضة";
}

function priorityReasonLabel(reason: string) {
  if (reason.includes("Critical reports")) return "تتركز هنا بلاغات حرجة وبلاغات مواطنين غير محلولة.";
  if (reason.includes("Open municipal workload")) return "عبء العمل البلدي المفتوح أعلى من خط الأساس التجريبي في طرابلس.";
  if (reason.includes("Fallback Tripoli report concentration")) return "تركز بلاغات طرابلس من التذاكر التجريبية المحلية.";
  if (reason.includes("Recurring reports")) return "تكرار البلاغات يبقي هذه المنطقة على قائمة المتابعة التشغيلية.";
  return reason;
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
          label="إجمالي البلاغات"
          value={String(summary.kpis.total_reports)}
          detail="بلاغات المواطنين في قائمة تشغيل طرابلس"
          tone="blue"
        />
        <MetricCard
          label="بلاغات مفتوحة"
          value={String(summary.kpis.open_reports)}
          detail="بلاغات مرسلة ومراجعة وقيد المعالجة"
          tone="amber"
        />
        <MetricCard
          label="بلاغات محلولة"
          value={String(summary.kpis.resolved_reports)}
          detail="بنود استجابة بلدية مغلقة"
          tone="green"
        />
        <MetricCard
          label="متوسط الخطورة"
          value={summary.kpis.average_severity.toFixed(2)}
          detail={`ضغط مشاكل مرجّح بدرجة ${severityLabel(summary.kpis.average_severity)}`}
          tone="rose"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="خريطة تشغيل طرابلس"
          eyebrow={source === "api" ? "تجميع مباشر" : "احتياطي محلي"}
          action={<Badge tone={source === "api" ? "green" : "amber"}>{loading ? "جارٍ التحميل" : providerLabel(source)}</Badge>}
        >
          <CityMapCanvas compact heightClassName="min-h-[380px]" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">أعلى حي</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {neighborhoodLabel(summary.kpis.top_neighborhood)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">أعلى فئة</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {summary.kpis.top_category ? categoryLabel(summary.kpis.top_category as ReportCategory) : "لا توجد بيانات بلاغات"}
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="مناطق الأولوية" eyebrow="قائمة متابعة البلدية">
          <div className="space-y-4">
            {summary.priority_areas.map((area) => (
              <div className="rounded-md border border-slate-200 p-4" key={area.slug}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{neighborhoodLabel(area.name)}</p>
                  <Badge tone={area.score >= maxNeighborhoodScore * 0.75 ? "rose" : "amber"}>
                    {area.score}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{priorityReasonLabel(area.reason)}</p>
                <div className="mt-3">
                  <ProgressBar value={(area.score / maxNeighborhoodScore) * 100} tone="rose" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="الأحياء الأعلى" eyebrow="تركز البلاغات">
          <div className="space-y-4">
            {summary.top_neighborhoods.map((neighborhood) => (
              <div key={neighborhood.slug}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{neighborhoodLabel(neighborhood.name)}</span>
                  <span className="text-slate-500">
                    {neighborhood.open_reports} مفتوحة / {neighborhood.total_reports} إجمالي
                  </span>
                </div>
                <ProgressBar value={(neighborhood.priority_score / maxNeighborhoodScore) * 100} tone="blue" />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="أعلى الفئات" eyebrow="توزيع العمل التشغيلي">
          <div className="space-y-4">
            {summary.top_categories.map((category) => (
              <div key={category.category}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900">{categoryLabel(category.category as ReportCategory)}</span>
                  <span className="text-slate-500">{category.total_reports} بلاغات</span>
                </div>
                <ProgressBar value={(category.total_reports / maxCategoryCount) * 100} tone="amber" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="آخر البلاغات" eyebrow="تغذية الإبلاغ الذكي">
        <DataTable
          rows={summary.recent_reports}
          getRowKey={(row) => row.id}
          columns={[
            { header: "البلاغ", cell: (row) => <span className="font-semibold">{row.id}</span> },
            { header: "المشكلة", cell: (row) => row.title, className: "min-w-[280px] px-4 py-3" },
            { header: "المنطقة", cell: (row) => neighborhoodLabel(row.neighborhood) },
            {
              header: "الفئة",
              cell: (row) => categoryLabel(row.category),
            },
            {
              header: "الحالة",
              cell: (row) => <Badge tone={row.status === "resolved" ? "green" : "blue"}>{statusLabel(row.status)}</Badge>,
            },
          ]}
        />
      </Panel>
    </div>
  );
}
