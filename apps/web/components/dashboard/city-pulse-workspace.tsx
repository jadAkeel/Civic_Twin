"use client";

import type { ReportCategory } from "@citymind/shared";
import { useEffect, useMemo, useState } from "react";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { CityIcon } from "@/components/ui/city-icon";
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

function EmptyDashboardState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {message}
    </div>
  );
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
  const hasPriorityAreas = summary.priority_areas.length > 0;
  const hasNeighborhoods = summary.top_neighborhoods.length > 0;
  const hasCategories = summary.top_categories.length > 0;
  const hasRecentReports = summary.recent_reports.length > 0;

  return (
    <div className="space-y-5">
      <section
        className="grid divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,35,55,0.04)] md:grid-cols-2 md:divide-x md:divide-x-reverse md:divide-y-0 md:divide-slate-200 xl:grid-cols-4"
        aria-label="مؤشرات المدينة الرئيسية"
      >
        <MetricCard
          detail="بلاغات المواطنين في قائمة تشغيل طرابلس"
          icon="reports"
          integrated
          label="إجمالي البلاغات"
          tone="blue"
          value={String(summary.kpis.total_reports)}
        />
        <MetricCard
          detail="بلاغات مرسلة ومراجعة وقيد المعالجة"
          icon="dashboard"
          integrated
          label="بلاغات مفتوحة"
          tone="blue"
          value={String(summary.kpis.open_reports)}
        />
        <MetricCard
          detail="بنود استجابة بلدية مغلقة"
          icon="check"
          integrated
          label="بلاغات محلولة"
          tone="green"
          value={String(summary.kpis.resolved_reports)}
        />
        <MetricCard
          detail={`ضغط مشاكل مرجّح بدرجة ${severityLabel(summary.kpis.average_severity)}`}
          icon="trend"
          integrated
          label="متوسط الخطورة"
          tone="rose"
          value={summary.kpis.average_severity.toFixed(2)}
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,35,55,0.04)]">
        <header className="flex flex-col gap-2 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-teal-700">خريطة تشغيل المدينة</p>
            <h2 className="mt-0.5 text-base font-bold text-slate-950">طرابلس لحظة بلحظة</h2>
          </div>
          <Badge tone={source === "api" ? "green" : "amber"}>
            {loading ? "جارٍ التحميل" : providerLabel(source)}
          </Badge>
        </header>

        <div className="grid [direction:ltr] xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 [direction:rtl]">
            <CityMapCanvas compact heightClassName="min-h-[320px] lg:min-h-[340px]" />
            <div className="grid border-t border-slate-200 bg-slate-50/80 sm:grid-cols-[1fr_auto_auto]">
              <div className="flex items-center gap-2 px-4 py-3 text-xs leading-5 text-slate-600">
                <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                {source === "api"
                  ? "بيانات CityMind متصلة؛ GIS الرسمي والإشعارات الخارجية غير مهيأة بعد."
                  : "بيانات محلية تجريبية؛ لا تعرض اتجاهات رسمية أو تشغيلًا مباشرًا."}
              </div>
              <div className="border-t border-slate-200 px-4 py-3 sm:border-r sm:border-t-0">
                <p className="text-[11px] text-slate-500">أعلى حي</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{neighborhoodLabel(summary.kpis.top_neighborhood)}</p>
              </div>
              <div className="border-t border-slate-200 px-4 py-3 sm:border-r sm:border-t-0">
                <p className="text-[11px] text-slate-500">أعلى فئة</p>
                <p className="mt-0.5 max-w-48 truncate text-sm font-bold text-slate-900">
                  {summary.kpis.top_category
                    ? categoryLabel(summary.kpis.top_category as ReportCategory)
                    : "لا توجد بيانات بلاغات"}
                </p>
              </div>
            </div>
          </div>

          <aside className="border-t border-slate-200 [direction:rtl] xl:border-r xl:border-t-0" aria-label="مناطق الأولوية">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold text-teal-700">قائمة متابعة البلدية</p>
                <h2 className="mt-1 text-base font-bold text-slate-950">مناطق الأولوية</h2>
              </div>
              <CityIcon className="text-slate-400" name="warning" />
            </div>
            {hasPriorityAreas ? (
              <div className="divide-y divide-slate-200">
                {summary.priority_areas.map((area) => (
                  <div className="px-5 py-4" key={area.slug}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-950">{neighborhoodLabel(area.name)}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{priorityReasonLabel(area.reason)}</p>
                      </div>
                      <span className="text-2xl font-bold tabular-nums text-[#e94f2f]">{area.score}</span>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={(area.score / maxNeighborhoodScore) * 100} tone="rose" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5">
                <EmptyDashboardState message="لا توجد مناطق أولوية في البيانات الحالية." />
              </div>
            )}
          </aside>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2 2xl:grid-cols-[0.8fr_0.9fr_1.6fr]">
        <Panel bodyClassName="p-0" eyebrow="تركّز البلاغات" title="الأحياء الأعلى">
          {hasNeighborhoods ? (
            <div className="divide-y divide-slate-100">
              {summary.top_neighborhoods.slice(0, 6).map((neighborhood) => (
                <div className="px-5 py-3.5" key={neighborhood.slug}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-900">{neighborhoodLabel(neighborhood.name)}</span>
                    <span className="tabular-nums text-slate-500">
                      {neighborhood.open_reports} مفتوحة / {neighborhood.total_reports} إجمالي
                    </span>
                  </div>
                  <ProgressBar value={(neighborhood.priority_score / maxNeighborhoodScore) * 100} tone="green" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5"><EmptyDashboardState message="لا توجد أحياء مرتبة بعد." /></div>
          )}
        </Panel>

        <Panel bodyClassName="p-0" eyebrow="توزيع العمل التشغيلي" title="أعلى الفئات">
          {hasCategories ? (
            <div className="divide-y divide-slate-100">
              {summary.top_categories.slice(0, 6).map((category) => (
                <div className="px-5 py-3.5" key={category.category}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-900">{categoryLabel(category.category as ReportCategory)}</span>
                    <span className="tabular-nums text-slate-500">{category.total_reports} بلاغات</span>
                  </div>
                  <ProgressBar value={(category.total_reports / maxCategoryCount) * 100} tone="blue" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5"><EmptyDashboardState message="لا توجد فئات بلاغات لعرضها حاليًا." /></div>
          )}
        </Panel>

        <Panel className="xl:col-span-2 2xl:col-span-1" eyebrow="سجل بلاغات المواطنين" title="آخر البلاغات">
          {hasRecentReports ? (
            <DataTable
              rows={summary.recent_reports.slice(0, 6)}
              getRowKey={(row) => row.id}
              columns={[
                { header: "البلاغ", cell: (row) => <span className="font-bold">{row.id}</span> },
                { header: "المشكلة", cell: (row) => row.title, className: "min-w-[240px] px-4 py-3" },
                { header: "المنطقة", cell: (row) => neighborhoodLabel(row.neighborhood) },
                { header: "الفئة", cell: (row) => categoryLabel(row.category) },
                {
                  header: "الحالة",
                  cell: (row) => <Badge tone={row.status === "resolved" ? "green" : "blue"}>{statusLabel(row.status)}</Badge>,
                },
              ]}
            />
          ) : (
            <EmptyDashboardState message="لا توجد بلاغات حديثة في البيانات الحالية." />
          )}
        </Panel>
      </div>
    </div>
  );
}
