import { MAX_POLYGON_DIAMETER_M } from "@/app/constants/map";
import type { GeoJsonPosition } from "./zone";

/** Tolerance for floating-point comparisons against max diameter (meters). */
export const POLYGON_DIAMETER_EPSILON_M = 1e-6;

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Great-circle distance in meters. Positions are GeoJSON order: [longitude, latitude].
 */
export function haversineDistanceMetersLngLat(
  first: GeoJsonPosition,
  second: GeoJsonPosition,
): number {
  const [firstLng, firstLat] = first;
  const [secondLng, secondLat] = second;

  const lat1 = toRadians(firstLat);
  const lat2 = toRadians(secondLat);
  const dLat = toRadians(secondLat - firstLat);
  const dLng = toRadians(secondLng - firstLng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Unique vertices of a closed GeoJSON ring (first point equals last).
 */
function uniqueRingVertices(ring: GeoJsonPosition[]): GeoJsonPosition[] {
  return ring.slice(0, -1);
}

/**
 * Maximum pairwise great-circle distance between unique vertices of a closed ring.
 */
export function maxPairwiseDistanceMetersFromRing(ring: GeoJsonPosition[]): number {
  const vertices = uniqueRingVertices(ring);
  if (vertices.length < 2) {
    return 0;
  }

  let max = 0;
  for (let i = 0; i < vertices.length; i += 1) {
    for (let j = i + 1; j < vertices.length; j += 1) {
      const d = haversineDistanceMetersLngLat(vertices[i], vertices[j]);
      if (d > max) {
        max = d;
      }
    }
  }
  return max;
}

/** Each position is Leaflet order: [latitude, longitude]. */
export function maxPairwiseDistanceMetersFromLatLngVertices(
  vertices: readonly [number, number][],
): number {
  if (vertices.length < 2) {
    return 0;
  }

  const asLngLat: GeoJsonPosition[] = vertices.map(([lat, lng]) => [lng, lat]);
  let max = 0;
  for (let i = 0; i < asLngLat.length; i += 1) {
    for (let j = i + 1; j < asLngLat.length; j += 1) {
      const d = haversineDistanceMetersLngLat(asLngLat[i], asLngLat[j]);
      if (d > max) {
        max = d;
      }
    }
  }
  return max;
}

export function isPolygonRingWithinMaxDiameter(
  ring: GeoJsonPosition[],
  maxMeters: number = MAX_POLYGON_DIAMETER_M,
): boolean {
  return (
    maxPairwiseDistanceMetersFromRing(ring) <= maxMeters + POLYGON_DIAMETER_EPSILON_M
  );
}

export function isLatLngVertexSetWithinMaxDiameter(
  vertices: readonly [number, number][],
  maxMeters: number = MAX_POLYGON_DIAMETER_M,
): boolean {
  return (
    maxPairwiseDistanceMetersFromLatLngVertices(vertices) <=
    maxMeters + POLYGON_DIAMETER_EPSILON_M
  );
}
