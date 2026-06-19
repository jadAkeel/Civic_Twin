"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type LngLatLike,
  type Map as MapLibreMap,
  type Marker,
  type StyleSpecification,
} from "maplibre-gl";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import {
  TRIPOLI_MAP_CENTER,
  formatMapLabel,
  photoForNeighborhood,
  tripoliAssetMarkers,
  tripoliIssueMarkers,
  tripoliMapLayers,
  tripoliNeighborhoodLayers,
  tripoliRouteOverlays,
  type TripoliAssetMarker,
  type TripoliIssueMarker,
  type TripoliMapLayerId,
  type TripoliNeighborhoodLayer,
  type TripoliRouteOverlay,
} from "@/features/map/tripoli-map-data";

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
  className?: string;
  heightClassName?: string;
};

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

function severityClass(severity: TripoliIssueMarker["severity"]) {
  if (severity === "critical") return "bg-rose-600 text-white";
  if (severity === "high") return "bg-amber-500 text-slate-950";
  if (severity === "medium") return "bg-sky-600 text-white";
  return "bg-slate-600 text-white";
}

function assetClass(status: TripoliAssetMarker["status"]) {
  if (status === "needs_maintenance") return "bg-amber-600 text-white";
  if (status === "planned") return "bg-emerald-600 text-white";
  return "bg-teal-700 text-white";
}

function issueMarkerLabel(category: string) {
  if (category === "garbage" || category === "waste") return "W";
  if (category === "street_lighting") return "L";
  if (category === "pollution" || category === "fire_hazard") return "P";
  if (category === "traffic_congestion" || category === "traffic_obstruction") return "T";
  if (category === "pothole" || category === "broken_sidewalk" || category === "water_leakage") return "R";
  if (category === "medical_emergency") return "+";
  return "!";
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

function markerElement(label: string, className: string, active: boolean) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = [
    "grid h-8 w-8 place-items-center rounded-full border-2 border-white text-[11px] font-bold shadow-lg transition-transform hover:scale-110",
    active ? "ring-4 ring-slate-900/25" : "",
    className,
  ].join(" ");
  element.textContent = label;
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
  issues = tripoliIssueMarkers,
  assets = tripoliAssetMarkers,
  routes = tripoliRouteOverlays,
  selected,
  onSelect,
  onMapPick,
  draftPoint,
  compact = false,
  focusSelected = false,
  showStatusBadges = true,
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
      const element = markerElement(
        issueMarkerLabel(issue.category),
        severityClass(issue.severity),
        selected?.type === "issue" && selected.item.id === issue.id,
      );
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect?.({ type: "issue", item: issue });
      });

      return new maplibregl.Marker({ element })
        .setLngLat([issue.longitude, issue.latitude])
        .addTo(map);
    });

    assetMarkersRef.current = visibleAssets.map((asset) => {
      const element = markerElement(
        asset.assetType === "street_light" ? "L" : asset.assetType === "waste_container" ? "W" : "+",
        assetClass(asset.status),
        selected?.type === "asset" && selected.item.id === asset.id,
      );
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
      element: markerElement("N", "bg-slate-950 text-white", false),
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

  useEffect(() => {
    const map = mapRef.current;
    if (!focusSelected || !map || mapState !== "ready" || !selectedCoordinates) return;

    map.flyTo({
      center: [selectedCoordinates.longitude, selectedCoordinates.latitude],
      zoom: Math.max(map.getZoom(), compact ? 14.2 : 14),
      essential: true,
    });
  }, [compact, focusSelected, mapState, selectedCoordinates?.latitude, selectedCoordinates?.longitude]);

  return (
    <div className={cn("overflow-hidden rounded-md border border-slate-200 bg-white", className)}>
      <div className={cn("relative min-h-[520px] bg-slate-100", heightClassName, compact && "min-h-[360px]")}>
        <div ref={mapContainerRef} className="absolute inset-0" aria-label="خريطة طرابلس التفاعلية" />

        <div className={cn("pointer-events-none absolute left-3 right-3 top-3 flex flex-wrap gap-2", !showStatusBadges && "hidden")}>
          <Badge tone={mapState === "ready" ? "green" : mapState === "error" ? "rose" : "blue"}>
            {mapState === "ready" ? "الخريطة مباشرة" : mapState === "error" ? "الخريطة غير متاحة" : "جارٍ تحميل الخريطة"}
          </Badge>
          <Badge tone="amber">حدود GIS تجريبية</Badge>
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
                تستخدم الخريطة المؤقتة مربعات OpenStreetMap وطبقات طرابلس التجريبية المحلية.
              </p>
            </div>
          </div>
        ) : null}
      </div>

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
              <img
                alt={selectionPhoto.title}
                className="h-28 w-full object-cover"
                src={selectionPhoto.imageUrl}
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

function tripoliPhotoHighlightsFallback() {
  return photoForNeighborhood("old-souks");
}
