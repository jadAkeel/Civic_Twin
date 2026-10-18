"use client";

import { useEffect, useState } from "react";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { ErrorState, LoadingState, SourceBadge } from "@/components/ui/async-state";
import { Badge } from "@/components/ui/badge";
import { CityIcon, type CityIconName } from "@/components/ui/city-icon";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { tripoliRouteOverlays } from "@/features/map/tripoli-map-data";
import { actionLabel, scenarioActions, scenarioNeighborhoods } from "@/features/scenarios/scenario-data";
import { citymindApi, type ScenarioResult } from "@/lib/api-client";
import { severityLabel } from "@/lib/display-labels";
import { apiErrorMessage, useApiResource } from "@/lib/use-api-resource";

function riskTone(risk: ScenarioResult["risk_level"]) {
  if (risk === "high" || risk === "critical") return "rose";
  if (risk === "medium") return "amber";
  return "green";
}

function recommendationLabel(recommendation: string) {
  if (recommendation.includes("Prioritize sanitation operations")) {
    return "أعطِ الأولوية لعمليات النظافة مع مراقبة على مستوى الحي.";
  }
  if (recommendation.includes("Run a small Tripoli pilot")) {
    return "نفّذ تجربة صغيرة في طرابلس قبل اعتمادها على نطاق المدينة.";
  }
  return recommendation;
}

function warningLabel(warning: string) {
  const labels: Record<string, string> = {
    "Baseline data is demo or assumption-backed and must be replaced before an official decision.":
      "بيانات خط الأساس تجريبية أو مبنية على افتراضات ويجب استبدالها قبل أي قرار رسمي.",
    "Baseline data is demo-backed and must be replaced before an official decision.":
      "بيانات خط الأساس تجريبية ويجب استبدالها قبل أي قرار رسمي.",
    "The estimated cost exceeds the supplied budget limit.": "الكلفة التقديرية تتجاوز سقف الميزانية المحدد.",
    "Combined actions include modeled interactions; review their assumptions before approval.":
      "الإجراءات المدمجة تتضمن تفاعلات نموذجية؛ راجع افتراضاتها قبل الاعتماد.",
    "Limited open-report evidence is available for this neighborhood.":
      "الأدلة المتاحة من البلاغات المفتوحة في هذا الحي محدودة.",
  };
  return labels[warning] ?? warning;
}

function actionIcon(action: string): CityIconName {
  const icons: Record<string, CityIconName> = {
    ADD_TREES: "green-score",
    ADD_BIKE_LANE: "mobility",
    ADD_PARK: "map",
    ADD_BUS_STOP: "mobility",
    IMPROVE_WASTE_COLLECTION: "waste",
    PEDESTRIANIZE_STREET: "walk",
    CHANGE_TRAFFIC_FLOW: "trend",
    IMPROVE_SIDEWALKS: "walk",
    IMPROVE_LIGHTING: "building",
  };
  return icons[action] ?? "simulator";
}

function signedValue(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export function ScenarioWorkspace() {
  const savedResults = useApiResource<ScenarioResult[]>(() => citymindApi.scenarios.results());

  const [name, setName] = useState("تجربة نفايات وأشجار في باب التبانة");
  const [neighborhoodSlug, setNeighborhoodSlug] = useState("bab-al-tebbaneh");
  const [selectedActions, setSelectedActions] = useState<string[]>(["ADD_TREES", "IMPROVE_WASTE_COLLECTION"]);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [intensity, setIntensity] = useState<ScenarioResult["intensity"]>("standard");
  const [executionMode, setExecutionMode] = useState<ScenarioResult["execution_mode"]>("sequential");
  const [budgetLimit, setBudgetLimit] = useState("100000");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Seed the table with results that were actually persisted by the API.
  useEffect(() => {
    if (savedResults.data) setResults(savedResults.data);
  }, [savedResults.data]);

  function toggleAction(action: string) {
    setSelectedActions((current) => {
      if (current.includes(action)) return current.filter((item) => item !== action);
      if (current.length >= 5) {
        setErrorMessage("يمكن مقارنة خمسة إجراءات كحد أقصى في السيناريو الواحد.");
        return current;
      }
      setErrorMessage(null);
      return [...current, action];
    });
  }

  async function simulate() {
    if (!selectedActions.length || isSimulating) return;
    if (name.trim().length < 4) {
      setErrorMessage("اسم السيناريو يجب أن يتكون من أربعة أحرف على الأقل.");
      return;
    }
    const parsedBudget = budgetLimit.trim() ? Number(budgetLimit) : null;
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 1000)) {
      setErrorMessage("الميزانية يجب أن تكون رقماً لا يقل عن 1,000 دولار، أو اتركها فارغة.");
      return;
    }

    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const result = await citymindApi.scenarios.simulate({
        name: name.trim(),
        neighborhood_slug: neighborhoodSlug,
        actions: selectedActions,
        intensity,
        execution_mode: executionMode,
        budget_limit: parsedBudget,
      });
      setResults((current) => [result, ...current]);
    } catch (caught) {
      // Nothing is invented on failure: previous results stay and the operator is
      // told plainly that no new result was produced or saved.
      setErrorMessage(`${apiErrorMessage(caught)} لم يتم إنشاء أو حفظ نتيجة جديدة.`);
    } finally {
      setIsSimulating(false);
    }
  }

  const latest = results[0] ?? null;
  const availableActions = scenarioActions.filter((action) => !selectedActions.includes(action));

  return (
    <div className="space-y-5">
      {latest ? <ImpactSummary result={latest} /> : null}

      <div className="grid items-start gap-5 [direction:ltr] xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Panel
          action={
            latest ? (
              <Badge tone={riskTone(latest.risk_level)}>الخطر: {severityLabel(latest.risk_level)}</Badge>
            ) : (
              <SourceBadge status={savedResults.status} isReloading={savedResults.isReloading} />
            )
          }
          bodyClassName="p-0"
          className="[direction:rtl]"
          eyebrow={latest ? latest.scenario_name : "لم تُشغَّل محاكاة بعد"}
          title="أثر تقديري"
        >
          {savedResults.status === "loading" ? (
            <div className="p-5">
              <LoadingState label="جارٍ تحميل نتائج السيناريوهات المحفوظة" />
            </div>
          ) : savedResults.status === "error" && results.length === 0 ? (
            <div className="p-5">
              <ErrorState
                message={savedResults.error ?? "تعذّر تحميل النتائج المحفوظة."}
                onRetry={savedResults.reload}
                isRetrying={savedResults.isReloading}
              />
            </div>
          ) : latest ? (
            <ImpactDetail result={latest} selectedActions={selectedActions} />
          ) : (
            <div className="p-5">
              <EmptyState
                title="لا توجد نتيجة محاكاة بعد"
                description="اختر حيًا وتدخلات من لوحة باني السيناريو ثم احسب الأثر. لا يعرض CityMind أرقامًا تقديرية قبل تشغيل محاكاة فعلية."
              />
            </div>
          )}
        </Panel>

        <Panel
          bodyClassName="p-5"
          className="[direction:rtl] xl:sticky xl:top-24"
          eyebrow="محرّك قواعد شفاف"
          title="باني السيناريو"
        >
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              اسم السيناريو
              <input className="city-control mt-1.5" value={name} onChange={(event) => setName(event.target.value)} maxLength={180} />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              الحي
              <select
                className="city-control mt-1.5"
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                نطاق التدخل
                <select
                  aria-label="نطاق التدخل"
                  className="city-control mt-1.5"
                  value={intensity}
                  onChange={(event) => setIntensity(event.target.value as ScenarioResult["intensity"])}
                >
                  <option value="pilot">تجربة محدودة</option>
                  <option value="standard">قياسي</option>
                  <option value="expanded">موسّع</option>
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                نمط التنفيذ
                <select
                  aria-label="نمط التنفيذ"
                  className="city-control mt-1.5"
                  value={executionMode}
                  onChange={(event) => setExecutionMode(event.target.value as ScenarioResult["execution_mode"])}
                >
                  <option value="sequential">متسلسل</option>
                  <option value="parallel">متوازٍ</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              سقف الميزانية بالدولار <span className="font-normal text-slate-400">(اختياري)</span>
              <input
                aria-label="سقف الميزانية بالدولار"
                className="city-control mt-1.5"
                inputMode="numeric"
                min="1000"
                type="number"
                value={budgetLimit}
                onChange={(event) => setBudgetLimit(event.target.value)}
              />
            </label>

            <div className="border-t border-slate-200 pt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">التدخلات المحددة</p>
                <span className="text-xs font-bold tabular-nums text-teal-700">{selectedActions.length} / 5</span>
              </div>
              <div className="space-y-2">
                {selectedActions.map((action) => (
                  <button
                    aria-pressed="true"
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-teal-300 bg-teal-50 px-3 text-right text-sm font-bold text-teal-950 transition hover:border-teal-500"
                    key={action}
                    type="button"
                    onClick={() => toggleAction(action)}
                  >
                    <CityIcon className="h-[18px] w-[18px] text-teal-700" name={actionIcon(action)} />
                    <span className="flex-1">{actionLabel(action)}</span>
                    <span aria-hidden="true" className="text-lg font-normal text-teal-700">
                      ×
                    </span>
                  </button>
                ))}
              </div>

              {availableActions.length ? (
                <details className="mt-2 rounded-xl border border-slate-200 bg-white open:bg-slate-50">
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold text-slate-700">
                    + إضافة تدخل
                  </summary>
                  <div className="grid gap-2 border-t border-slate-200 p-2">
                    {availableActions.map((action) => (
                      <button
                        aria-pressed="false"
                        className="flex min-h-10 items-center gap-2 rounded-lg px-2.5 text-right text-xs font-semibold text-slate-700 transition hover:bg-white hover:text-teal-800"
                        key={action}
                        type="button"
                        onClick={() => toggleAction(action)}
                      >
                        <CityIcon className="h-4 w-4" name={actionIcon(action)} />
                        {actionLabel(action)}
                      </button>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>

            <button
              className="city-primary-button w-full"
              disabled={isSimulating || selectedActions.length === 0}
              type="button"
              onClick={simulate}
            >
              <CityIcon className="h-[18px] w-[18px]" name="simulator" />
              {isSimulating ? "جارٍ حساب الأثر..." : "احسب الأثر التقديري"}
            </button>

            <div aria-live="polite">
              {errorMessage ? (
                <p
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800"
                  role="alert"
                >
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      </div>

      <Panel eyebrow="تقديرات محفوظة للمراجعة" title="نتائج السيناريوهات">
        {results.length === 0 ? (
          <EmptyState
            title="لا توجد نتائج محفوظة"
            description="ستظهر كل نتيجة محاكاة تُشغّلها هنا مع كلفتها ومدتها ومستوى الخطر."
          />
        ) : (
          <DataTable
            rows={results}
            getRowKey={(row) => row.id}
            columns={[
              {
                header: "السيناريو",
                cell: (row) => <span className="font-bold">{row.scenario_name}</span>,
                className: "min-w-[260px] px-4 py-3",
              },
              { header: "الإجراءات", cell: (row) => row.actions.length },
              { header: "الكلفة", cell: (row) => `$${Math.round(row.estimated_cost).toLocaleString()}` },
              { header: "الأيام", cell: (row) => row.implementation_time_days },
              {
                header: "الخطر",
                cell: (row) => <Badge tone={riskTone(row.risk_level)}>{severityLabel(row.risk_level)}</Badge>,
              },
            ]}
          />
        )}
      </Panel>
    </div>
  );
}

function ImpactSummary({ result }: { result: ScenarioResult }) {
  return (
    <section
      className="grid divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,35,55,0.04)] md:grid-cols-2 md:divide-x md:divide-x-reverse md:divide-y-0 md:divide-slate-200 xl:grid-cols-4"
      aria-label="ملخص نتيجة المحاكاة"
    >
      <MetricCard
        detail="مقارنة مع خط الأساس"
        icon="green-score"
        integrated
        label="تغير المؤشر الأخضر"
        tone="green"
        value={signedValue(result.green_score_delta)}
      />
      <MetricCard
        detail="تقدير راحة المشاة"
        icon="walk"
        integrated
        label="تغير قابلية المشي"
        tone="blue"
        value={signedValue(result.walkability_delta)}
      />
      <MetricCard
        detail="تقدير رأسمالي مبني على قواعد"
        icon="dollar"
        integrated
        label="الكلفة التقديرية"
        tone="green"
        value={`$${Math.round(result.estimated_cost / 1000)} ألف`}
      />
      <MetricCard
        detail={`ثقة ${Math.round(result.confidence_score * 100)}%`}
        icon="warning"
        integrated
        label="الخطر"
        tone="rose"
        value={severityLabel(result.risk_level)}
      />
    </section>
  );
}

function ImpactDetail({ result, selectedActions }: { result: ScenarioResult; selectedActions: string[] }) {
  const impacts: Array<{ label: string; value: number; icon: CityIconName; tone: string }> = [
    { label: "المؤشر الأخضر", value: result.green_score_delta, icon: "green-score", tone: "text-teal-700" },
    { label: "جودة الهواء", value: result.air_quality_delta, icon: "trend", tone: "text-sky-700" },
    { label: "قابلية المشي", value: result.walkability_delta, icon: "walk", tone: "text-teal-700" },
    { label: "المرور", value: result.traffic_delta, icon: "mobility", tone: "text-slate-600" },
    { label: "التلوث", value: result.pollution_delta, icon: "warning", tone: "text-orange-700" },
    { label: "الحرارة", value: result.temperature_delta, icon: "trend", tone: "text-orange-700" },
  ];

  return (
    <>
      <div className="grid divide-y divide-slate-200 bg-slate-50/70 px-4 py-1 sm:grid-cols-3 sm:divide-x sm:divide-x-reverse sm:divide-y-0">
        <div className="py-1 sm:px-4 sm:first:pr-0">
          <p className="text-[11px] font-bold text-slate-500">خط الأساس</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{result.baseline.neighborhood_name}</p>
          <p className="text-xs text-slate-500">قياس {result.baseline.measurement_date}</p>
        </div>
        <div className="py-1 sm:px-4">
          <p className="text-[11px] font-bold text-slate-500">قبل ← بعد</p>
          <p className="mt-1 text-sm text-slate-800">
            أخضر {result.baseline.overall_green_score} ← {result.projected_scores.overall_green_score}
          </p>
          <p className="text-xs text-slate-500">
            مشي {result.baseline.walkability_score} ← {result.projected_scores.walkability_score}
          </p>
        </div>
        <div className="py-1 sm:px-4">
          <p className="text-[11px] font-bold text-slate-500">المنهجية</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{result.methodology.version}</p>
          <p className="text-xs text-slate-500">
            جودة البيانات {Math.round(result.methodology.data_quality_score * 100)}%
          </p>
        </div>
      </div>

      <CityMapCanvas
        compact
        heightClassName="min-h-[260px] lg:min-h-[230px]"
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
          assets: false,
        }}
        routes={tripoliRouteOverlays.filter((route) =>
          selectedActions.includes("CHANGE_TRAFFIC_FLOW") ? route.kind !== "green" : route.kind !== "traffic",
        )}
      />

      <div className="divide-y divide-slate-100 border-y border-slate-200">
        {impacts.map((impact) => (
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-1.5" key={impact.label}>
            <CityIcon className="h-[18px] w-[18px] text-slate-500" name={impact.icon} />
            <span className="text-sm font-semibold text-slate-800">{impact.label}</span>
            <span className={`text-base font-bold tabular-nums ${impact.tone}`}>{signedValue(impact.value)}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 p-2">
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-950">
          <span className="font-bold text-slate-900">التوصية: </span>
          {recommendationLabel(result.recommendation)}
          <span className="mx-2 text-sky-300">•</span>
          <span className="font-bold">عدم اليقين: </span>
          المؤشر الأخضر من {result.uncertainty.green_score_delta.low} إلى {result.uncertainty.green_score_delta.high}،
          والكلفة من ${Math.round(result.uncertainty.estimated_cost.low).toLocaleString()} إلى $
          {Math.round(result.uncertainty.estimated_cost.high).toLocaleString()}.
        </p>
        {result.warnings.length ? (
          <div className="flex gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-950">
            <CityIcon className="mt-0.5 h-4 w-4 shrink-0" name="warning" />
            <div>
              <span className="font-bold">قبل الاعتماد: </span>
              <ul className="inline">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warningLabel(warning)}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
