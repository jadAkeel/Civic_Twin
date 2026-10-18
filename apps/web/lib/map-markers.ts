import type { SmartReport } from "@citymind/shared";

import {
  tripoliNeighborhoodLayers,
  type MapAssetStatus,
  type MapStatus,
  type TripoliAssetMarker,
  type TripoliIssueMarker,
} from "@/features/map/tripoli-map-data";
import type { PublicAsset, PublicReport } from "@/lib/api-client";

/**
 * Converters from live API records to map markers. The map never falls back to a
 * built-in list: if the API has nothing, the map shows nothing.
 */

const neighborhoodNames = new Map(tripoliNeighborhoodLayers.map((layer) => [layer.slug, layer.name]));

function neighborhoodName(slug: string | null | undefined, fallback: string) {
  return (slug && neighborhoodNames.get(slug)) || fallback;
}

function mapStatus(status: SmartReport["status"]): MapStatus {
  // Closed outcomes share the map's "resolved" styling.
  return status === "duplicate" || status === "rejected" ? "resolved" : status;
}

export function smartReportMarkers(reports: SmartReport[]): TripoliIssueMarker[] {
  return reports
    .filter((report) => report.latitude != null && report.longitude != null)
    .map((report) => ({
      id: report.id,
      title: report.title,
      description: report.description,
      category: report.category,
      severity: report.severity,
      status: mapStatus(report.status),
      neighborhood: neighborhoodName(report.neighborhoodSlug, report.neighborhood),
      neighborhoodSlug: report.neighborhoodSlug ?? "manual-location",
      latitude: report.latitude as number,
      longitude: report.longitude as number,
    }));
}

/** Public feed markers: titles are redacted and positions rounded by the API. */
export function publicReportMarkers(reports: PublicReport[]): TripoliIssueMarker[] {
  return reports
    .filter((report) => report.approximate_latitude != null && report.approximate_longitude != null)
    .map((report) => {
      const neighborhood = neighborhoodName(report.neighborhood_slug, report.neighborhood);
      return {
        id: report.id,
        title: report.title,
        description: `بلاغ في ${neighborhood}. الموقع تقريبي لحماية خصوصية المُبلِّغ.`,
        category: report.category,
        severity: report.severity,
        status: mapStatus(report.status),
        neighborhood,
        neighborhoodSlug: report.neighborhood_slug ?? "manual-location",
        latitude: report.approximate_latitude as number,
        longitude: report.approximate_longitude as number,
      };
    });
}

export function publicAssetMarkers(assets: PublicAsset[]): TripoliAssetMarker[] {
  return assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    assetType: asset.asset_type,
    status: (asset.status === "inactive" ? "needs_maintenance" : asset.status) as MapAssetStatus,
    neighborhood: neighborhoodName(asset.neighborhood_slug, "طرابلس"),
    neighborhoodSlug: asset.neighborhood_slug ?? "tripoli",
    latitude: asset.latitude,
    longitude: asset.longitude,
    line: asset.line.length > 1 ? (asset.line as [number, number][]) : undefined,
  }));
}
