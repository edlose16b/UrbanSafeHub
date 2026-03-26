import { clampRadiusKm } from "@/lib/zones/utils/number";
import type { ZoneGeometry } from "@/lib/zones/domain/zone";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { Map as LeafletMap } from "leaflet";
import type { LocationStatus, ViewportQuery } from "./leaflet-map.types";

const NO_CRIME_DATA_COLOR = "#7f8a93";
const SAFE_COLOR = "#00a657";
const MODERATE_COLOR = "#ffb95c";
const DANGER_COLOR = "#93000a";
const EARTH_RADIUS_METERS = 6_371_000;

export const MIN_CENTER_MOVEMENT_METERS = 100;
export const CENTER_MOVEMENT_RADIUS_RATIO = 0.4;
export const ZOOM_RADIUS_CHANGE_RATIO = 0.15;
const FLOATING_POINT_EPSILON = 1e-9;

export type ZoneSeverity = "unknown" | "safe" | "moderate" | "danger";
export type ZoneFilterKey = "all" | ZoneSeverity;
export type ZoneTrendDirection =
  | "insufficient_data"
  | "steady"
  | "day_stronger"
  | "night_stronger";

export type ZoneTrendSummary = {
  direction: ZoneTrendDirection;
  progressPercent: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function getSystemPrefersDarkMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function getInitialLocationStatus(): LocationStatus {
  if (typeof window === "undefined") {
    return "idle";
  }

  return "geolocation" in navigator ? "idle" : "unavailable";
}

export function getCrimeHeatColor(crimeLevel: number | null): string {
  const severity = getZoneSeverity(crimeLevel);
  if (severity === "safe") {
    return SAFE_COLOR;
  }

  if (severity === "moderate") {
    return MODERATE_COLOR;
  }

  if (severity === "danger") {
    return DANGER_COLOR;
  }

  return NO_CRIME_DATA_COLOR;
}

export function getCrimeHeatIntensity(crimeLevel: number | null): number {
  const severity = getZoneSeverity(crimeLevel);
  if (severity === "danger") {
    return 1;
  }

  if (severity === "moderate") {
    return 0.78;
  }

  if (severity === "safe") {
    return 0.72;
  }

  return 0.5;
}

export function getZoneSeverity(crimeLevel: number | null): ZoneSeverity {
  if (crimeLevel === null) {
    return "unknown";
  }

  if (crimeLevel >= 4) {
    return "safe";
  }

  if (crimeLevel > 2) {
    return "moderate";
  }

  return "danger";
}

export function zoneMatchesFilter(zone: ZoneDTO, filterKey: ZoneFilterKey): boolean {
  if (filterKey === "all") {
    return true;
  }

  return getZoneSeverity(zone.crimeLevel) === filterKey;
}

export function zoneMatchesSearch(zone: ZoneDTO, rawQuery: string): boolean {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return zone.name.toLowerCase().includes(normalizedQuery);
}

export function getZoneCenter(geometry: ZoneGeometry): [number, number] {
  if (geometry.type === "Point") {
    const [longitude, latitude] = geometry.coordinates;
    return [latitude, longitude];
  }

  const ring = geometry.coordinates[0] ?? [];
  if (ring.length === 0) {
    return [0, 0];
  }

  const sum = ring.reduce(
    (accumulator, [longitude, latitude]) => ({
      latitude: accumulator.latitude + latitude,
      longitude: accumulator.longitude + longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return [sum.latitude / ring.length, sum.longitude / ring.length];
}

export function getZoneStreetViewUrl(geometry: ZoneGeometry, apiKey: string): string {
  const [latitude, longitude] = getZoneCenter(geometry);
  const params = new URLSearchParams({
    size: "1200x720",
    location: `${latitude},${longitude}`,
    heading: "0",
    pitch: "0",
    fov: "90",
    key: apiKey,
  });

  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

function getSegmentSafetyScore(detail: ZoneDetailDTO, segmentKey: string): number | null {
  const scores = detail.aggregates
    .filter((aggregate) => aggregate.timeSegment === segmentKey && aggregate.avgScore !== null)
    .map((aggregate) => aggregate.avgScore ?? 0);

  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function clampPercent(value: number): number {
  return Math.max(12, Math.min(100, Math.round(value)));
}

export function getZoneTrendSummary(detail: ZoneDetailDTO): ZoneTrendSummary {
  const dayScores = [
    getSegmentSafetyScore(detail, "morning"),
    getSegmentSafetyScore(detail, "afternoon"),
  ].filter((value): value is number => value !== null);
  const nightScores = [
    getSegmentSafetyScore(detail, "night"),
    getSegmentSafetyScore(detail, "early_morning"),
  ].filter((value): value is number => value !== null);
  const allScores = [...dayScores, ...nightScores];

  if (allScores.length === 0) {
    return {
      direction: "insufficient_data",
      progressPercent: 22,
    };
  }

  const overallAverage = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  const progressPercent = clampPercent((overallAverage / 5) * 100);

  if (dayScores.length === 0 || nightScores.length === 0) {
    return {
      direction: "steady",
      progressPercent,
    };
  }

  const dayAverage = dayScores.reduce((sum, score) => sum + score, 0) / dayScores.length;
  const nightAverage = nightScores.reduce((sum, score) => sum + score, 0) / nightScores.length;
  const delta = dayAverage - nightAverage;

  if (delta >= 0.35) {
    return {
      direction: "day_stronger",
      progressPercent,
    };
  }

  if (delta <= -0.35) {
    return {
      direction: "night_stronger",
      progressPercent,
    };
  }

  return {
    direction: "steady",
    progressPercent,
  };
}

export function distanceBetweenViewportCentersMeters(
  current: ViewportQuery,
  previous: ViewportQuery,
): number {
  const currentLatRadians = toRadians(current.lat);
  const previousLatRadians = toRadians(previous.lat);
  const latDelta = toRadians(current.lat - previous.lat);
  const lngDelta = toRadians(current.lng - previous.lng);
  const haversineDelta =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(currentLatRadians) *
      Math.cos(previousLatRadians) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversineDelta), Math.sqrt(1 - haversineDelta));

  return EARTH_RADIUS_METERS * centralAngle;
}

export function shouldFetchViewport(
  next: ViewportQuery,
  previous: ViewportQuery | null,
): boolean {
  if (!previous) {
    return true;
  }

  const distanceMeters = distanceBetweenViewportCentersMeters(next, previous);
  const movementThresholdMeters = Math.max(
    MIN_CENTER_MOVEMENT_METERS,
    next.radiusKm * 1000 * CENTER_MOVEMENT_RADIUS_RATIO,
  );

  if (distanceMeters + FLOATING_POINT_EPSILON >= movementThresholdMeters) {
    return true;
  }

  if (previous.radiusKm <= 0) {
    return true;
  }

  const radiusChangeRatio = Math.abs(next.radiusKm - previous.radiusKm) / previous.radiusKm;
  return radiusChangeRatio + FLOATING_POINT_EPSILON >= ZOOM_RADIUS_CHANGE_RATIO;
}

export function toViewportQuery(map: LeafletMap): ViewportQuery {
  const center = map.getCenter();
  const bounds = map.getBounds();
  const radiusKm = clampRadiusKm(center.distanceTo(bounds.getNorthEast()) / 1000);

  return {
    lat: center.lat,
    lng: center.lng,
    radiusKm,
  };
}
