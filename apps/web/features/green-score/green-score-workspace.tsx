"use client";

import { useMemo, useState } from "react";

import { AsyncSection, SourceBadge } from "@/components/ui/async-state";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { factorLabel } from "@/features/green-score/score-data";
import {
  citymindApi,
  type GreenScoreRow,
  type ScoreBreakdownItem,
  type WalkabilityScoreRow,
} from "@/lib/api-client";
import { neighborhoodLabel, providerLabel, severityLabel } from "@/lib/display-labels";
import { useApiResource } from "@/lib/use-api-resource";

type Scores = { green: GreenScoreRow[]; walkability: WalkabilityScoreRow[] };

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
  const resource = useApiResource<Scores>(async () => {
    const [green, walkability] = await Promise.all([citymindApi.scores.green(), citymindApi.scores.walkability()]);
    return { green, walkability };
  });
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  return (
    <AsyncSection resource={resource} loadingLabel="جارٍ تحميل مؤشرات الأحياء">
      {({ green, walkability }) => <ScoreBoards green={green} walkability={walkability} selectedSlug={selectedSlug} onSelect={setSelectedSlug} status={resource.status} isReloading={resource.isReloading} />}
    </AsyncSection>
  );
}

function ScoreBoards({
  green,
  walkability,
  selectedSlug,
  onSelect,
  status,
  isReloading,
}: {
  green: GreenScoreRow[];
  walkability: WalkabilityScoreRow[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  status: "loading" | "ready" | "error";
  isReloading: boolean;
}) {
  const selectedGreen = green.find((item) => item.neighborhood_slug === selectedSlug) ?? green[0];
  const selectedWalkability =
    walkability.find((item) => item.neighborhood_slug === selectedGreen?.neighborhood_slug) ?? null;

  const averageGreen = useMemo(
    () => (green.length ? green.reduce((total, item) => total + item.green_score, 0) / green.length : null),
    [green],
  );
  const averageWalkability = useMemo(
    () =>
      walkability.length
        ? walkability.reduce((total, item) => total + item.walkability_score, 0) / walkability.length
        : null,
    [walkability],
  );
  const lowest = green.at(-1);

  if (green.length === 0 && walkability.length === 0) {
    return (
      <EmptyState
        title="لا توجد مؤشرات محمّلة"
        description="لم تُسجَّل قياسات المؤشر الأخضر أو قابلية المشي لأي حي بعد. ستظهر هنا فور إدخال القياسات."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="متوسط المؤشر الأخضر"
          value={averageGreen === null ? "لا توجد بيانات" : averageGreen.toFixed(1)}
          detail="خط أساس مرجّح لاستدامة طرابلس"
          tone="green"
        />
        <MetricCard
          label="متوسط قابلية المشي"
          value={averageWalkability === null ? "لا توجد بيانات" : averageWalkability.toFixed(1)}
          detail="عوامل الأرصفة والمعابر والإنارة والوصول"
          tone="blue"
        />
        <MetricCard
          label="أدنى مؤشر أخضر"
          value={lowest ? lowest.green_score.toFixed(1) : "لا توجد بيانات"}
          detail={lowest ? neighborhoodLabel(lowest.neighborhood) : "لم تُسجَّل قياسات بعد"}
          tone="rose"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="ترتيب المؤشر الأخضر"
          eyebrow="نتيجة المعادلة"
          action={<SourceBadge status={status} isReloading={isReloading} />}
        >
          <div className="space-y-4">
            {green.length === 0 ? (
              <EmptyState title="لا توجد قياسات" description="لم تُسجَّل قياسات المؤشر الأخضر بعد." />
            ) : (
              green.map((row) => {
                const isSelected = row.neighborhood_slug === selectedGreen?.neighborhood_slug;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`block w-full rounded-md border p-4 text-right transition ${
                      isSelected ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-500"
                    }`}
                    key={row.neighborhood_slug}
                    type="button"
                    onClick={() => onSelect(row.neighborhood_slug)}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{neighborhoodLabel(row.neighborhood)}</p>
                      <Badge tone={scoreTone(row.green_score)}>{row.green_score.toFixed(1)}/100</Badge>
                    </div>
                    <ProgressBar value={row.green_score} tone={scoreTone(row.green_score)} />
                  </button>
                );
              })
            )}
          </div>
        </Panel>

        <Panel title="خط أساس قابلية المشي" eyebrow="ترتيب العوامل">
          {walkability.length === 0 ? (
            <EmptyState title="لا توجد قياسات" description="لم تُسجَّل قياسات قابلية المشي بعد." />
          ) : (
            <DataTable
              rows={walkability}
              getRowKey={(row) => row.neighborhood_slug}
              columns={[
                {
                  header: "المنطقة",
                  cell: (row) => <span className="font-semibold">{neighborhoodLabel(row.neighborhood)}</span>,
                },
                { header: "قابلية المشي", cell: (row) => `${row.walkability_score.toFixed(1)}/100` },
                {
                  header: "الأولوية",
                  cell: (row) => (
                    <Badge tone={row.priority_level === "critical" ? "rose" : "amber"}>
                      {severityLabel(row.priority_level)}
                    </Badge>
                  ),
                },
              ]}
            />
          )}
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
          ) : (
            <Panel title="شرح قابلية المشي" eyebrow="لا توجد قياسات">
              <EmptyState
                title="لا توجد قياسات قابلية مشي لهذا الحي"
                description="اختر حيًا آخر أو أدخل قياسات قابلية المشي لهذا الحي."
              />
            </Panel>
          )}
        </div>
      ) : null}
    </div>
  );
}
