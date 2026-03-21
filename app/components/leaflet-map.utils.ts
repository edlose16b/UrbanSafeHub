import { clampRadiusKm } from "@/lib/zones/utils/number";
import type { Map as LeafletMap } from "leaflet";
import type { LocationStatus, ViewportQuery } from "./leaflet-map.types";

const NO_CRIME_DATA_COLOR = "#94a3b8";
const EARTH_RADIUS_METERS = 6_371_000;

export const MIN_CENTER_MOVEMENT_METERS = 100;
export const CENTER_MOVEMENT_RADIUS_RATIO = 0.2;
export const ZOOM_RADIUS_CHANGE_RATIO = 0.15;
const FLOATING_POINT_EPSILON = 1e-9;

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

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
  if (crimeLevel === null) {
    return NO_CRIME_DATA_COLOR;
  }

  const normalized = Math.max(1, Math.min(5, crimeLevel));
  const ratio = (normalized - 1) / 4;
  const red = Math.round(239 * ratio + 34 * (1 - ratio));
  const green = Math.round(68 * ratio + 197 * (1 - ratio));
  const blue = Math.round(68 * ratio + 94 * (1 - ratio));

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function getCrimeHeatIntensity(crimeLevel: number | null): number {
  if (crimeLevel === null) {
    return 0.45;
  }

  const normalized = Math.max(1, Math.min(5, crimeLevel));
  return 0.35 + ((normalized - 1) / 4) * 0.65;
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
