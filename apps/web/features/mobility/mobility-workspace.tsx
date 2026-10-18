"use client";

import { useState } from "react";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { AsyncSection, SourceBadge } from "@/components/ui/async-state";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { mobilityPoints, routeTypeLabels } from "@/features/mobility/mobility-data";
import { citymindApi, type MobilityRouteComparison, type MobilityRouteOption } from "@/lib/api-client";
import { neighborhoodLabel, providerLabel } from "@/lib/display-labels";
import { useApiResource } from "@/lib/use-api-resource";
import type { TripoliRouteOverlay } from "@/features/map/tripoli-map-data";

function routeTone(routeType: MobilityRouteOption["route_type"]) {
  if (routeType === "greenest") return "green";
  if (routeType === "safest" || routeType === "accessible") return "blue";
  if (routeType === "most_walkable") return "amber";
  return "neutral";
}

/**
 * The API guarantees GeoJSON order ([longitude, latitude]) for every segment, which
 * is exactly what the map overlay expects — no coordinate guessing needed.
 */
function routeOverlay(route: MobilityRouteOption | undefined): TripoliRouteOverlay | null {
  if (!route) return null;
  const coordinates = route.segments.flatMap((segment) =>
    segment.coordinates.map(([longitude, latitude]) => [longitude, latitude] as [number, number]),
  );
  if (coordinates.length === 0) return null;

  return {
    id: `selected-${route.route_type}`,
    name: routeTypeLabels[route.route_type],
    kind: route.route_type === "fastest" ? "traffic" : "green",
    description: `${route.estimated_minutes.toFixed(1)} دقيقة، ${route.distance_meters} متر.`,
    coordinates,
  };
}

export function MobilityWorkspace() {
  const [origin, setOrigin] = useState("Al Mina");
  const [destination, setDestination] = useState("Old Souks");
  const [selectedType, setSelectedType] = useState<MobilityRouteOption["route_type"] | null>(null);

  const resource = useApiResource<MobilityRouteComparison>(
    () => citymindApi.mobility.compareRoutes(origin, destination),
    [origin, destination],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        توصية مسارات المشي غير مهيأة بعد. يلزم ربط ظل الأشجار والحرارة وجودة الأرصفة والغطاء الأخضر والمرور الحي ومزود
        توجيه إنتاجي قبل أن يعرض CityMind إرشادًا رسميًا.
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="التوجيه الرسمي" value="غير متاح" detail="مزود توجيه المرور غير مهيأ" tone="amber" />
        <MetricCard label="إرشاد المشي" value="غير متاح" detail="بيانات الظل والحرارة والأرصفة مطلوبة" tone="blue" />
        <MetricCard label="بيانات المرور" value="غير مهيأة" detail="لا يوجد تدفق حي للازدحام أو تحويل المسارات" tone="rose" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel
          title="مدخلات مسار تخطيطية"
          eyebrow="رسم بياني من بيانات CityMind"
          action={<SourceBadge status={resource.status} isReloading={resource.isReloading} />}
        >
          <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
            يستخدم هذا العرض رسمًا بيانيًا محدودًا من بيانات CityMind. لا يقدّم إرشاد ملاحة، ولا يستبدل التوجيه الرسمي.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              نقطة الانطلاق
              <select
                className="city-control mt-1"
                value={origin}
                onChange={(event) => {
                  setOrigin(event.target.value);
                  setSelectedType(null);
                }}
              >
                {mobilityPoints.map((point) => (
                  <option key={point} value={point}>
                    {neighborhoodLabel(point)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              الوجهة
              <select
                className="city-control mt-1"
                value={destination}
                onChange={(event) => {
                  setDestination(event.target.value);
                  setSelectedType(null);
                }}
              >
                {mobilityPoints.map((point) => (
                  <option key={point} value={point}>
                    {neighborhoodLabel(point)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {origin === destination ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
              اختر نقطتين مختلفتين لعرض مقارنة المسارات.
            </p>
          ) : null}

          <div className="mt-5">
            <AsyncSection resource={resource} loadingLabel="جارٍ حساب المسارات">
              {(comparison) => {
                const longestDistance = Math.max(...comparison.options.map((option) => option.distance_meters), 1);
                return (
                  <div className="grid gap-3">
                    {comparison.options.map((route) => {
                      const active = (selectedType ?? comparison.options[0]?.route_type) === route.route_type;
                      return (
                        <button
                          aria-pressed={active}
                          className={`rounded-md border bg-white p-4 text-right transition ${
                            active ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-500"
                          }`}
                          key={route.route_type}
                          type="button"
                          onClick={() => setSelectedType(route.route_type)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-950">
                              {routeTypeLabels[route.route_type]}
                            </p>
                            <Badge tone={routeTone(route.route_type)}>تخطيطي</Badge>
                          </div>
                          <div className="mt-3">
                            <ProgressBar value={(route.distance_meters / longestDistance) * 100} tone="blue" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            </AsyncSection>
          </div>
        </Panel>

        <Panel
          title="مقارنة المسارات"
          eyebrow={`${neighborhoodLabel(origin)} إلى ${neighborhoodLabel(destination)}`}
        >
          <AsyncSection resource={resource} loadingLabel="جارٍ تحميل المقارنة">
            {(comparison) => {
              const selectedRoute =
                comparison.options.find((option) => option.route_type === selectedType) ?? comparison.options[0];
              const overlay = routeOverlay(selectedRoute);

              if (!selectedRoute) {
                return (
                  <EmptyState
                    title="لا يوجد مسار بين هاتين النقطتين"
                    description="لا يحتوي الرسم البياني الحالي على وصلة بين النقطتين المختارتين. جرّب نقطة أخرى."
                  />
                );
              }

              return (
                <>
                  {overlay ? (
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
                      routes={[overlay]}
                    />
                  ) : (
                    <div className="mb-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                      لا تتوفر إحداثيات لرسم هذا المسار على الخريطة.
                    </div>
                  )}

                  <DataTable
                    rows={comparison.options}
                    getRowKey={(row) => row.route_type}
                    columns={[
                      {
                        header: "النوع",
                        cell: (row) => <span className="font-semibold">{routeTypeLabels[row.route_type]}</span>,
                      },
                      { header: "الدقائق", cell: (row) => row.estimated_minutes.toFixed(1) },
                      { header: "المسافة", cell: (row) => `${row.distance_meters} م` },
                      { header: "المؤشر", cell: (row) => row.score.toFixed(2) },
                    ]}
                  />

                  <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-950">{routeTypeLabels[selectedRoute.route_type]}</p>
                      <Badge tone={routeTone(selectedRoute.route_type)}>
                        {providerLabel(selectedRoute.provider_interface)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      مزوّد التوجيه الرسمي غير مهيأ. هذه نتيجة تخطيطية محسوبة من رسم CityMind البياني فقط.
                    </p>
                    <div className="mt-4 space-y-3">
                      {selectedRoute.segments.map((segment) => (
                        <div key={segment.id} className="rounded-md border border-slate-200 bg-white p-3">
                          <p className="text-sm font-semibold text-slate-950">{segment.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {neighborhoodLabel(segment.from_label)} إلى {neighborhoodLabel(segment.to_label)} |{" "}
                            {segment.length_meters} م
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            }}
          </AsyncSection>
        </Panel>
      </div>
    </div>
  );
}
