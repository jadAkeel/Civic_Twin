"use client";

import { useMemo, useState } from "react";

import { CityMapCanvas, type CityMapSelection } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import {
  formatMapLabel,
  photoForNeighborhood,
  tripoliAssetMarkers,
  tripoliIssueMarkers,
  tripoliMapFilterOptions,
  tripoliMapLayers,
  tripoliNeighborhoodLayers,
  tripoliRouteOverlays,
  type MapSeverity,
  type MapStatus,
  type TripoliMapLayerId,
} from "@/features/map/tripoli-map-data";

type MapFilters = {
  category: string;
  severity: "all" | MapSeverity;
  status: "all" | MapStatus;
  neighborhood: string;
  search: string;
};

const initialFilters: MapFilters = {
  category: "all",
  severity: "all",
  status: "all",
  neighborhood: "all",
  search: "",
};

const initialLayers: Record<TripoliMapLayerId, boolean> = {
  neighborhoods: true,
  reports: true,
  waste: true,
  roads: true,
  lighting: true,
  pollution: true,
  greenRoutes: true,
  traffic: true,
  assets: true,
};

function matchesSearch(value: string, search: string) {
  return value.toLowerCase().includes(search.trim().toLowerCase());
}

export function TripoliMapWorkspace() {
  const [filters, setFilters] = useState<MapFilters>(initialFilters);
  const [layers, setLayers] = useState<Record<TripoliMapLayerId, boolean>>(initialLayers);
  const [selected, setSelected] = useState<CityMapSelection | null>({
    type: "neighborhood",
    item: tripoliNeighborhoodLayers[0],
  });

  const filteredIssues = useMemo(
    () =>
      tripoliIssueMarkers.filter(
        (issue) =>
          (filters.category === "all" || issue.category === filters.category) &&
          (filters.severity === "all" || issue.severity === filters.severity) &&
          (filters.status === "all" || issue.status === filters.status) &&
          (filters.neighborhood === "all" || issue.neighborhood === filters.neighborhood) &&
          (!filters.search ||
            matchesSearch(`${issue.title} ${issue.description} ${issue.neighborhood}`, filters.search)),
      ),
    [filters],
  );

  const filteredAssets = useMemo(
    () =>
      tripoliAssetMarkers.filter(
        (asset) =>
          (filters.neighborhood === "all" || asset.neighborhood === filters.neighborhood) &&
          (!filters.search || matchesSearch(`${asset.name} ${asset.assetType} ${asset.neighborhood}`, filters.search)),
      ),
    [filters.neighborhood, filters.search],
  );

  const filteredNeighborhoods = useMemo(
    () =>
      tripoliNeighborhoodLayers.filter(
        (neighborhood) => !filters.search || matchesSearch(`${neighborhood.name} ${neighborhood.summary}`, filters.search),
      ),
    [filters.search],
  );

  const visibleRouteCount = tripoliRouteOverlays.filter(
    (route) => (route.kind === "green" && layers.greenRoutes) || (route.kind === "traffic" && layers.traffic) || route.kind === "scenario",
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_380px]">
      <div className="space-y-6">
        <CityMapCanvas
          activeLayers={layers}
          assets={filteredAssets}
          issues={filteredIssues}
          selected={selected}
          onSelect={setSelected}
          heightClassName="min-h-[620px]"
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MapStat label="البلاغات الظاهرة" value={filteredIssues.length} />
          <MapStat label="أصول المدينة" value={filteredAssets.length} />
          <MapStat label="الأحياء" value={filteredNeighborhoods.length} />
          <MapStat label="طبقات المسارات" value={visibleRouteCount} />
        </section>
      </div>

      <div className="grid gap-6">
        <Panel title="ابحث عن مكان أو مشكلة" eyebrow="طبقات طرابلس">
          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium text-slate-700">بحث</span>
              <input
                className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                placeholder="جرّب القبة، نفايات، إنارة..."
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              />
            </label>
            <SelectControl
              label="الفئة"
              value={filters.category}
              options={["all", ...tripoliMapFilterOptions.categories]}
              onChange={(value) => setFilters((current) => ({ ...current, category: value }))}
            />
            <SelectControl
              label="الخطورة"
              value={filters.severity}
              options={["all", ...tripoliMapFilterOptions.severities]}
              onChange={(value) =>
                setFilters((current) => ({ ...current, severity: value as MapFilters["severity"] }))
              }
            />
            <SelectControl
              label="الحالة"
              value={filters.status}
              options={["all", ...tripoliMapFilterOptions.statuses]}
              onChange={(value) =>
                setFilters((current) => ({ ...current, status: value as MapFilters["status"] }))
              }
            />
            <SelectControl
              label="الحي"
              value={filters.neighborhood}
              options={["all", ...tripoliMapFilterOptions.neighborhoods]}
              onChange={(value) => setFilters((current) => ({ ...current, neighborhood: value }))}
            />
          </div>
        </Panel>

        <Panel title="التحكم بالطبقات" eyebrow="اختر ما يظهر على الخريطة">
          <div className="grid gap-3">
            {tripoliMapLayers.map((layer) => (
              <label
                key={layer.id}
                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-sm"
              >
                <span>
                  <span className="block font-medium text-slate-900">{layer.label}</span>
                  <span className="text-xs text-slate-500">{layer.group}</span>
                </span>
                <input
                  type="checkbox"
                  checked={layers[layer.id]}
                  onChange={() =>
                    setLayers((current) => ({
                      ...current,
                      [layer.id]: !current[layer.id],
                    }))
                  }
                  className="h-4 w-4 accent-teal-700"
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="تفاصيل العنصر المحدد" eyebrow="فاحص الخريطة">
          <SelectedDetails selected={selected} />
        </Panel>
      </div>
    </div>
  );
}

function MapStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "الكل" : formatMapLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectedDetails({ selected }: { selected: CityMapSelection | null }) {
  if (!selected) {
    return <p className="text-sm leading-6 text-slate-600">اختر علامة أو مسارًا أو حيًا على الخريطة.</p>;
  }

  if (selected.type === "issue") {
    const photo = photoForNeighborhood(selected.item.neighborhoodSlug);
    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-md bg-slate-200">
          <img className="h-36 w-full object-cover" src={photo.imageUrl} alt={photo.title} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={selected.item.severity === "critical" ? "rose" : "amber"}>
            {formatMapLabel(selected.item.severity)}
          </Badge>
          <Badge tone="blue">{formatMapLabel(selected.item.status)}</Badge>
        </div>
        <h3 className="text-base font-semibold text-slate-950">{selected.item.title}</h3>
        <p className="text-sm leading-6 text-slate-600">{selected.item.description}</p>
        <p className="text-xs font-semibold uppercase text-slate-500">{selected.item.neighborhood}</p>
      </div>
    );
  }

  if (selected.type === "asset") {
    return (
      <div className="space-y-3">
        <Badge tone={selected.item.status === "needs_maintenance" ? "amber" : "green"}>
          {formatMapLabel(selected.item.status)}
        </Badge>
        <h3 className="text-base font-semibold text-slate-950">{selected.item.name}</h3>
        <p className="text-sm leading-6 text-slate-600">
          {formatMapLabel(selected.item.assetType)} في {selected.item.neighborhood}.
        </p>
      </div>
    );
  }

  if (selected.type === "route") {
    return (
      <div className="space-y-3">
        <Badge tone={selected.item.kind === "green" ? "green" : "amber"}>{formatMapLabel(selected.item.kind)}</Badge>
        <h3 className="text-base font-semibold text-slate-950">{selected.item.name}</h3>
        <p className="text-sm leading-6 text-slate-600">{selected.item.description}</p>
      </div>
    );
  }

  const photo = photoForNeighborhood(selected.item.slug);
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md bg-slate-200">
        <img className="h-36 w-full object-cover" src={photo.imageUrl} alt={photo.title} />
      </div>
      <Badge tone={selected.item.priority === "critical" ? "rose" : "amber"}>
        {formatMapLabel(selected.item.priority)}
      </Badge>
      <h3 className="text-base font-semibold text-slate-950">{selected.item.name}</h3>
      <p className="text-sm leading-6 text-slate-600">{selected.item.summary}</p>
    </div>
  );
}
