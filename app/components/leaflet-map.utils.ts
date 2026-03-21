import { clampRadiusKm } from "@/lib/zones/utils/number";
import type { Map as LeafletMap } from "leaflet";
import type { LocationStatus, ViewportQuery } from "./leaflet-map.types";

const NO_CRIME_DATA_COLOR = "#94a3b8";

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
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
