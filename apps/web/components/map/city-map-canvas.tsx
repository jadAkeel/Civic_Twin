"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
// MapLibre 6 ships ES modules without a default export.
import * as maplibregl from "maplibre-gl";
import type {
  GeoJSONSource,
  LngLatLike,
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  TRIPOLI_MAP_CENTER,
  formatMapLabel,
  photoForNeighborhood,
  tripoliMapLayers,
  tripoliNeighborhoodLayers,
  tripoliRouteOverlays,
  type TripoliAssetMarker,
  type TripoliIssueMarker,
  type TripoliMapLayerId,
  type TripoliNeighborhoodLayer,
  type TripoliRouteOverlay,
} from "@/features/map/tripoli-map-data";

// Served by scripts/copy-maplibre-worker.mjs from a version-stamped folder.
if (typeof window !== "undefined") {
  maplibregl.setWorkerUrl(`/vendor/maplibre/${maplibregl.getVersion()}/maplibre-gl-worker.mjs`);
}

type Geometry =
  | { type: "Polygon"; coordinates: [number, number][][] }
  | { type: "LineString"; coordinates: [number, number][] }
  | { type: "Point"; coordinates: [number, number] };

type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, string | number>;
  geometry: Geometry;
};

type GeoJsonCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type CityMapSelection =
  | { type: "issue"; item: TripoliIssueMarker }
  | { type: "asset"; item: TripoliAssetMarker }
  | { type: "neighborhood"; item: TripoliNeighborhoodLayer }
  | { type: "route"; item: TripoliRouteOverlay };

type DraftPoint = {
  latitude: number;
  longitude: number;
};

type CityMapCanvasProps = {
  activeLayers?: Partial<Record<TripoliMapLayerId, boolean>>;
  issues?: TripoliIssueMarker[];
  assets?: TripoliAssetMarker[];
  routes?: TripoliRouteOverlay[];
  selected?: CityMapSelection | null;
  onSelect?: (selection: CityMapSelection) => void;
  onMapPick?: (point: DraftPoint) => void;
  draftPoint?: DraftPoint | null;
  compact?: boolean;
  focusSelected?: boolean;
  showStatusBadges?: boolean;
  showLegend?: boolean;
  className?: string;
  heightClassName?: string;
};

type MapMarkerKind =
  | "red_cross"
  | "municipality"
  | "police"
  | "citizen"
  | "civil_defense"
  | "municipal_asset"
  | "other";

const allLayersOn: Record<TripoliMapLayerId, boolean> = {
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

const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const emptyCollection: GeoJsonCollection = { type: "FeatureCollection", features: [] };
// Stable empty defaults so marker effects do not re-run on every render.
const NO_ISSUES: TripoliIssueMarker[] = [];
const NO_ASSETS: TripoliAssetMarker[] = [];

const markerKindConfig: Record<
  MapMarkerKind,
  {
    label: string;
    description: string;
    symbol: string;
    markerClass: string;
    swatchClass: string;
  }
> = {
  red_cross: {
    label: "الصليب الأحمر اللبناني",
    description: "بلاغات طبية أو إصابات أو حاجة إلى إسعاف",
    symbol: "+",
    markerClass: "bg-rose-600 text-white",
    swatchClass: "bg-rose-600",
  },
  municipality: {
    label: "البلدية",
    description: "خدمات بلدية أو صيانة أو نظافة أو تشغيل مدينة",
    symbol: "M",
    markerClass: "bg-teal-700 text-white",
    swatchClass: "bg-teal-700",
  },
  police: {
    label: "الشرطة",
    description: "أمن عام أو سلامة عامة أو حادث يحتاج مراجعة شرطية",
    symbol: "P",
    markerClass: "bg-slate-900 text-white",
    swatchClass: "bg-slate-900",
  },
  citizen: {
    label: "المواطن",
    description: "بلاغ مواطن أو موقع حدده المستخدم على الخريطة",
    symbol: "C",
    markerClass: "bg-sky-700 text-white",
    swatchClass: "bg-sky-700",
  },
  civil_defense: {
    label: "الدفاع المدني",
    description: "حريق أو إنقاذ أو خطر يحتاج مراجعة دفاع مدني",
    symbol: "F",
    markerClass: "bg-amber-600 text-white",
    swatchClass: "bg-amber-600",
  },
  municipal_asset: {
    label: "أصل بلدي",
    description: "موقع بنية تحتية أو أصل مدينة مسجل في البيانات",
    symbol: "A",
    markerClass: "bg-emerald-700 text-white",
    swatchClass: "bg-emerald-700",
  },
  other: {
    label: "أخرى",
    description: "بلاغ بلدي لا يطابق فئة متخصصة",
    symbol: "!",
    markerClass: "bg-zinc-700 text-white",
    swatchClass: "bg-zinc-700",
  },
};

const mapLegendItems: MapMarkerKind[] = [
  "red_cross",
  "municipality",
  "police",
  "citizen",
  "civil_defense",
  "municipal_asset",
  "other",
];

function issueMarkerKind(category: string): MapMarkerKind {
  if (category === "medical_emergency") return "red_cross";
  if (category === "security_incident" || category === "public_safety") return "police";
  if (category === "fire_hazard") return "civil_defense";
  if (category === "other") return "other";
  return "municipality";
}

function severityDotClass(severity: TripoliIssueMarker["severity"]) {
  if (severity === "critical") return "bg-rose-500";
  if (severity === "high") return "bg-amber-400";
  if (severity === "medium") return "bg-sky-400";
  return "bg-slate-400";
}

function assetDotClass(status: TripoliAssetMarker["status"]) {
  if (status === "needs_maintenance") return "bg-amber-400";
  if (status === "planned") return "bg-emerald-300";
  return "bg-teal-300";
}

function issueBelongsToLayer(issue: TripoliIssueMarker, layers: Record<TripoliMapLayerId, boolean>) {
  if (layers.reports) return true;
  if (layers.waste && ["garbage", "waste"].includes(issue.category)) return true;
  if (
    layers.roads &&
    ["pothole", "traffic_congestion", "traffic_obstruction", "broken_sidewalk", "accessibility_issue", "water_leakage"].includes(
      issue.category,
    )
  ) {
    return true;
  }
  if (layers.lighting && ["street_lighting", "public_safety", "security_incident"].includes(issue.category)) return true;
  if (layers.pollution && ["pollution", "public_safety", "security_incident"].includes(issue.category)) return true;
  return false;
}

function markerElement({
  kind,
  active,
  ariaLabel,
  detailClassName,
}: {
  kind: MapMarkerKind;
  active: boolean;
  ariaLabel: string;
  detailClassName?: string;
}) {
  const config = markerKindConfig[kind];
  const element = document.createElement("button");
  element.type = "button";
  element.className = [
    "relative grid h-9 w-9 place-items-center rounded-full border-2 border-white text-[12px] font-bold shadow-lg transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950",
    active ? "ring-4 ring-slate-900/25" : "",
    config.markerClass,
  ].join(" ");
  element.setAttribute("aria-label", ariaLabel);
  element.title = ariaLabel;

  const symbol = document.createElement("span");
  symbol.textContent = config.symbol;
  element.appendChild(symbol);

  if (detailClassName) {
    const detail = document.createElement("span");
    detail.className = [
      "absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-white",
      detailClassName,
    ].join(" ");
    element.appendChild(detail);
  }

  return element;
}

function setGeoJsonSource(map: MapLibreMap, id: string, data: GeoJsonCollection) {
  const source = map.getSource(id) as GeoJSONSource | undefined;
  source?.setData(data);
}

function neighborhoodFeatures(layersEnabled: boolean): GeoJsonCollection {
  if (!layersEnabled) return emptyCollection;

  return {
    type: "FeatureCollection",
    features: tripoliNeighborhoodLayers.map((neighborhood) => ({
      type: "Feature",
      properties: {
        slug: neighborhood.slug,
        name: neighborhood.name,
        priority: neighborhood.priority,
      },
      geometry: {
        type: "Polygon",
        coordinates: [neighborhood.boundary],
      },
    })),
  };
}

function routeFeatures(routes: TripoliRouteOverlay[], layers: Record<TripoliMapLayerId, boolean>): GeoJsonCollection {
  return {
    type: "FeatureCollection",
    features: routes
      .filter((route) => {
        if (route.kind === "green") return layers.greenRoutes;
        if (route.kind === "traffic") return layers.traffic;
        return true;
      })
      .map((route) => ({
        type: "Feature",
        properties: {
          id: route.id,
          kind: route.kind,
          name: route.name,
        },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      })),
  };
}

function assetLineFeatures(assets: TripoliAssetMarker[], layers: Record<TripoliMapLayerId, boolean>): GeoJsonCollection {
  if (!layers.assets) return emptyCollection;

  return {
    type: "FeatureCollection",
    features: assets
      .filter((asset) => asset.line)
      .map((asset) => ({
        type: "Feature",
        properties: {
          id: asset.id,
          status: asset.status,
          name: asset.name,
        },
        geometry: {
          type: "LineString",
          coordinates: asset.line ?? [],
        },
      })),
  };
}

function googleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

export function CityMapCanvas({
  activeLayers,
  // No built-in markers: a map without live data shows boundaries only.
  issues = NO_ISSUES,
  assets = NO_ASSETS,
  routes = tripoliRouteOverlays,
  selected,
  onSelect,
  onMapPick,
  draftPoint,
  compact = false,
  focusSelected = false,
  showStatusBadges = true,
  showLegend = true,
  className,
  heightClassName,
}: CityMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const issueMarkersRef = useRef<Marker[]>([]);
  const assetMarkersRef = useRef<Marker[]>([]);
  const draftMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const onMapPickRef = useRef(onMapPick);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");

  const layers = useMemo(
    () => ({ ...allLayersOn, ...activeLayers }),
    [activeLayers],
  );

  const visibleIssues = useMemo(
    () => issues.filter((issue) => issueBelongsToLayer(issue, layers)),
    [issues, layers],
  );

  const visibleAssets = useMemo(() => (layers.assets ? assets : []), [assets, layers.assets]);

  const selectionPhoto = selected
    ? photoForNeighborhood(
        selected.type === "issue" || selected.type === "asset"
          ? selected.item.neighborhoodSlug
          : selected.type === "neighborhood"
            ? selected.item.slug
            : "old-souks",
      )
    : tripoliPhotoHighlightsFallback();

  useEffect(() => {
    onSelectRef.current = onSelect;
    onMapPickRef.current = onMapPick;
  }, [onMapPick, onSelect]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: osmStyle,
        center: [TRIPOLI_MAP_CENTER.longitude, TRIPOLI_MAP_CENTER.latitude] as LngLatLike,
        zoom: compact ? 12.3 : TRIPOLI_MAP_CENTER.zoom,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

      map.on("load", () => {
        map.addSource("citymind-neighborhoods", { type: "geojson", data: emptyCollection });
        map.addLayer({
          id: "citymind-neighborhood-fill",
          type: "fill",
          source: "citymind-neighborhoods",
          paint: {
            "fill-color": [
              "match",
              ["get", "priority"],
              "critical",
              "#e11d48",
              "high",
              "#f59e0b",
              "#0ea5e9",
            ],
            "fill-opacity": compact ? 0.13 : 0.18,
          },
        });
        map.addLayer({
          id: "citymind-neighborhood-outline",
          type: "line",
          source: "citymind-neighborhoods",
          paint: {
            "line-color": "#0f172a",
            "line-opacity": 0.42,
            "line-width": compact ? 1 : 1.8,
          },
        });
        map.addSource("citymind-routes", { type: "geojson", data: emptyCollection });
        map.addLayer({
          id: "citymind-routes",
          type: "line",
          source: "citymind-routes",
          paint: {
            "line-color": [
              "match",
              ["get", "kind"],
              "green",
              "#059669",
              "traffic",
              "#dc2626",
              "#2563eb",
            ],
            "line-width": compact ? 3 : 5,
            "line-opacity": 0.78,
          },
        });
        map.addSource("citymind-assets", { type: "geojson", data: emptyCollection });
        map.addLayer({
          id: "citymind-assets",
          type: "line",
          source: "citymind-assets",
          paint: {
            "line-color": "#0f766e",
            "line-width": compact ? 2.5 : 4,
            "line-opacity": 0.72,
          },
        });

        map.on("click", "citymind-neighborhood-fill", (event) => {
          const slug = event.features?.[0]?.properties?.slug as string | undefined;
          const neighborhood = tripoliNeighborhoodLayers.find((item) => item.slug === slug);
          if (neighborhood) onSelectRef.current?.({ type: "neighborhood", item: neighborhood });
        });

        map.on("click", (event) => {
          if (!onMapPickRef.current) return;
          onMapPickRef.current({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
        });

        setMapState("ready");
      });

      mapRef.current = map;
    } catch {
      setMapState("error");
    }

    return () => {
      issueMarkersRef.current.forEach((marker) => marker.remove());
      assetMarkersRef.current.forEach((marker) => marker.remove());
      draftMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;

    setGeoJsonSource(map, "citymind-neighborhoods", neighborhoodFeatures(layers.neighborhoods));
    setGeoJsonSource(map, "citymind-routes", routeFeatures(routes, layers));
    setGeoJsonSource(map, "citymind-assets", assetLineFeatures(visibleAssets, layers));

    issueMarkersRef.current.forEach((marker) => marker.remove());
    assetMarkersRef.current.forEach((marker) => marker.remove());

    issueMarkersRef.current = visibleIssues.map((issue) => {
      const kind = issueMarkerKind(issue.category);
      const element = markerElement({
        kind,
        active: selected?.type === "issue" && selected.item.id === issue.id,
        ariaLabel: `Map marker: ${markerKindConfig[kind].label} - ${issue.title}; ${formatMapLabel(issue.severity)}; ${formatMapLabel(issue.status)}`,
        detailClassName: severityDotClass(issue.severity),
      });
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.({ type: "issue", item: issue });
      });

      return new maplibregl.Marker({ element })
        .setLngLat([issue.longitude, issue.latitude])
        .addTo(map);
    });

    assetMarkersRef.current = visibleAssets.map((asset) => {
      const element = markerElement({
        kind: "municipal_asset",
        active: selected?.type === "asset" && selected.item.id === asset.id,
        ariaLabel: `Map marker: ${markerKindConfig.municipal_asset.label} - ${asset.name}; ${formatMapLabel(asset.status)}`,
        detailClassName: assetDotClass(asset.status),
      });
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.({ type: "asset", item: asset });
      });

      return new maplibregl.Marker({ element })
        .setLngLat([asset.longitude, asset.latitude])
        .addTo(map);
    });
  }, [layers, mapState, onSelect, routes, selected, visibleAssets, visibleIssues]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== "ready") return;

    draftMarkerRef.current?.remove();
    draftMarkerRef.current = null;

    if (!draftPoint) return;

    draftMarkerRef.current = new maplibregl.Marker({
      element: markerElement({
        kind: "citizen",
        active: false,
        ariaLabel: "Map marker: موقع حدده المواطن لهذا البلاغ",
        detailClassName: "bg-white",
      }),
    })
      .setLngLat([draftPoint.longitude, draftPoint.latitude])
      .addTo(map);
  }, [draftPoint, mapState]);

  function resetView() {
    mapRef.current?.flyTo({
      center: [TRIPOLI_MAP_CENTER.longitude, TRIPOLI_MAP_CENTER.latitude],
      zoom: compact ? 12.3 : TRIPOLI_MAP_CENTER.zoom,
    });
  }

  function locateResident() {
    if (!navigator.geolocation) {
      mapRef.current?.flyTo({ center: [35.8449, 34.4356], zoom: 14.2 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14.5,
        });
      },
      () => mapRef.current?.flyTo({ center: [35.8449, 34.4356], zoom: 14.2 }),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }

  const selectedCoordinates =
    selected?.type === "issue" || selected?.type === "asset"
      ? { latitude: selected.item.latitude, longitude: selected.item.longitude }
      : selected?.type === "neighborhood"
        ? { latitude: selected.item.latitude, longitude: selected.item.longitude }
        : null;
  const selectedLatitude = selectedCoordinates?.latitude;
  const selectedLongitude = selectedCoordinates?.longitude;

  useEffect(() => {
    const map = mapRef.current;
    if (!focusSelected || !map || mapState !== "ready" || selectedLatitude == null || selectedLongitude == null) return;

    map.flyTo({
      center: [selectedLongitude, selectedLatitude],
      zoom: Math.max(map.getZoom(), compact ? 14.2 : 14),
      essential: true,
    });
  }, [compact, focusSelected, mapState, selectedLatitude, selectedLongitude]);

  return (
    <div className={cn("overflow-hidden rounded-md border border-slate-200 bg-white", className)}>
      <div className={cn("relative min-h-[520px] bg-slate-100", heightClassName, compact && "min-h-[360px]")}>
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          style={{ direction: "ltr" }}
          aria-label="خريطة طرابلس التفاعلية"
        />

        <div className={cn("pointer-events-none absolute left-3 right-3 top-3 flex flex-wrap gap-2", !showStatusBadges && "hidden")}>
          <Badge tone={mapState === "ready" ? "green" : mapState === "error" ? "rose" : "blue"}>
            {mapState === "ready" ? "الخريطة جاهزة" : mapState === "error" ? "الخريطة غير متاحة" : "جارٍ تحميل الخريطة"}
          </Badge>
          <Badge tone="amber">بيانات GIS رسمية غير مهيأة</Badge>
        </div>

        <div className="absolute bottom-3 right-3 flex gap-2">
          <button className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm" type="button" onClick={resetView}>
            إعادة الضبط
          </button>
          <button className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm" type="button" onClick={locateResident}>
            تحديد موقعي
          </button>
        </div>

        {mapState !== "ready" ? (
          <div className="absolute inset-0 grid place-items-center bg-slate-100/90 px-6 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {mapState === "error" ? "تعذر تحميل خريطة طرابلس" : "جارٍ تحميل خريطة طرابلس"}
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                تستخدم الخريطة مربعات OpenStreetMap وطبقات طرابلس التجريبية المحلية إلى حين ربط مصدر GIS رسمي.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {showLegend ? <MapLegend compact={compact} /> : null}

      {!compact ? (
        <div className="grid gap-4 border-t border-slate-200 p-4 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {tripoliMapLayers.slice(0, 8).map((layer) => (
              <div key={layer.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-slate-500">{layer.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {layers[layer.id] ? "ظاهرة" : "مخفية"}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {selected ? "المكان المحدد" : "سياق صورة طرابلس"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {selected?.type === "issue" || selected?.type === "asset"
                ? selected.type === "issue"
                  ? selected.item.title
                  : selected.item.name
                : selected?.type === "neighborhood"
                  ? selected.item.name
                  : selectionPhoto.title}
            </p>
            <div className="mt-3 overflow-hidden rounded-md bg-slate-200">
              <Image
                alt={selectionPhoto.title}
                className="h-28 w-full object-cover"
                height={224}
                src={selectionPhoto.imageUrl}
                unoptimized
                width={640}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {selectionPhoto.attribution} / {selectionPhoto.license}
            </p>
            {selectedCoordinates ? (
              <a
                className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                href={googleMapsUrl(selectedCoordinates.latitude, selectedCoordinates.longitude)}
                target="_blank"
                rel="noreferrer"
              >
                فتح في خرائط Google
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MapLegend({ compact }: { compact: boolean }) {
  return (
    <details className="border-t border-slate-200 bg-white p-3 sm:p-4" open={!compact}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        مفتاح الخريطة
      </summary>
      <div className={cn("mt-3 grid gap-2", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {mapLegendItems.map((kind) => {
          const item = markerKindConfig[kind];

          return (
            <div key={kind} className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <span
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white text-xs font-bold shadow-sm",
                  item.markerClass,
                )}
                aria-hidden="true"
              >
                {item.symbol}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-950">{item.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        النقطة الصغيرة على العلامة توضّح مستوى الخطورة أو حالة الأصل. لا توجد أي إشارة إلى إرسال رسمي أو حركة طوارئ مباشرة.
      </p>
    </details>
  );
}

function tripoliPhotoHighlightsFallback() {
  return photoForNeighborhood("old-souks");
}
