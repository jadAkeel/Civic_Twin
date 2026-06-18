import type { DashboardViewSummary } from "@/lib/api-client";
import { fallbackReports } from "@/features/reports/report-options";

const priorityByNeighborhood = new Map<string, { name: string; slug: string; total: number; open: number; critical: number }>();
const categoryTotals = new Map<string, number>();

for (const report of fallbackReports) {
  const current =
    priorityByNeighborhood.get(report.neighborhoodSlug) ??
    {
      name: report.neighborhood,
      slug: report.neighborhoodSlug,
      total: 0,
      open: 0,
      critical: 0,
    };
  current.total += 1;
  if (report.status !== "resolved") current.open += 1;
  if (report.severity === "critical") current.critical += 1;
  priorityByNeighborhood.set(report.neighborhoodSlug, current);
  categoryTotals.set(report.category, (categoryTotals.get(report.category) ?? 0) + 1);
}

const topNeighborhoods = [...priorityByNeighborhood.values()]
  .map((item) => ({
    name: item.name,
    slug: item.slug,
    total_reports: item.total,
    open_reports: item.open,
    critical_reports: item.critical,
    priority_score: item.total + item.open * 2 + item.critical * 4,
  }))
  .sort((a, b) => b.priority_score - a.priority_score);

export const fallbackDashboardSummary: DashboardViewSummary = {
  kpis: {
    total_reports: fallbackReports.length,
    open_reports: fallbackReports.filter((report) => report.status !== "resolved").length,
    resolved_reports: fallbackReports.filter((report) => report.status === "resolved").length,
    average_severity: 3,
    top_neighborhood: topNeighborhoods[0]?.name ?? null,
    top_category: "garbage",
  },
  top_neighborhoods: topNeighborhoods,
  top_categories: [...categoryTotals.entries()].map(([category, total]) => ({
    category,
    total_reports: total,
  })),
  priority_areas: topNeighborhoods.map((item) => ({
    name: item.name,
    slug: item.slug,
    score: item.priority_score,
    reason: "Fallback Tripoli report concentration from local demo tickets.",
  })),
  recent_reports: fallbackReports,
};
