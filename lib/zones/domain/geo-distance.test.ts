import { MAX_POLYGON_DIAMETER_M } from "@/app/constants/map";
import { describe, expect, it } from "vitest";
import {
  haversineDistanceMetersLngLat,
  isLatLngVertexSetWithinMaxDiameter,
  isPolygonRingWithinMaxDiameter,
  maxPairwiseDistanceMetersFromRing,
} from "./geo-distance";

/** Approximate north–south meters per degree latitude at mid-latitudes. */
const METERS_PER_DEGREE_LAT = 111_320;

describe("geo-distance", () => {
  const baseLng = -77.0428;
  const baseLat = -12.0464;

  it("reports ~100 m between two points separated by ~100 m north–south", () => {
    const a: [number, number] = [baseLng, baseLat];
    const b: [number, number] = [baseLng, baseLat + 100 / METERS_PER_DEGREE_LAT];
    const d = haversineDistanceMetersLngLat(a, b);
    expect(d).toBeGreaterThan(99);
    expect(d).toBeLessThan(101);
  });

  it("reports ~400 m between two points separated by ~400 m north–south", () => {
    const a: [number, number] = [baseLng, baseLat];
    const b: [number, number] = [baseLng, baseLat + 400 / METERS_PER_DEGREE_LAT];
    const d = haversineDistanceMetersLngLat(a, b);
    expect(d).toBeGreaterThan(399);
    expect(d).toBeLessThan(401);
  });

  it("maxPairwiseDistanceMetersFromRing matches farthest pair on a triangle", () => {
    const p0: [number, number] = [baseLng, baseLat];
    const p1: [number, number] = [baseLng, baseLat + 50 / METERS_PER_DEGREE_LAT];
    const p2: [number, number] = [baseLng + 80 / (METERS_PER_DEGREE_LAT * Math.cos((baseLat * Math.PI) / 180)), baseLat];
    const ring: [number, number][] = [p0, p1, p2, p0];
    const maxPair = maxPairwiseDistanceMetersFromRing(ring);
    const manual = Math.max(
      haversineDistanceMetersLngLat(p0, p1),
      haversineDistanceMetersLngLat(p0, p2),
      haversineDistanceMetersLngLat(p1, p2),
    );
    expect(Math.abs(maxPair - manual)).toBeLessThan(1e-3);
  });

  it("isPolygonRingWithinMaxDiameter allows ~100 m span and rejects ~400 m span", () => {
    const shortA: [number, number] = [baseLng, baseLat];
    const shortB: [number, number] = [baseLng, baseLat + 100 / METERS_PER_DEGREE_LAT];
    const shortRing: [number, number][] = [shortA, shortB, [baseLng + 0.0001, baseLat + 0.0001], shortA];
    expect(isPolygonRingWithinMaxDiameter(shortRing, MAX_POLYGON_DIAMETER_M)).toBe(true);

    const longA: [number, number] = [baseLng, baseLat];
    const longB: [number, number] = [baseLng, baseLat + 400 / METERS_PER_DEGREE_LAT];
    const longRing: [number, number][] = [longA, longB, [baseLng + 0.0001, baseLat + 0.0001], longA];
    expect(isPolygonRingWithinMaxDiameter(longRing, MAX_POLYGON_DIAMETER_M)).toBe(false);
  });

  it("isLatLngVertexSetWithinMaxDiameter matches ring check for same vertices", () => {
    const latLngVertices: [number, number][] = [
      [baseLat, baseLng],
      [baseLat + 100 / METERS_PER_DEGREE_LAT, baseLng],
      [baseLat + 0.00005, baseLng + 0.00005],
    ];
    const ring: [number, number][] = [
      [baseLng, baseLat],
      [baseLng, baseLat + 100 / METERS_PER_DEGREE_LAT],
      [baseLng + 0.00005, baseLat + 0.00005],
      [baseLng, baseLat],
    ];
    expect(isLatLngVertexSetWithinMaxDiameter(latLngVertices)).toBe(
      isPolygonRingWithinMaxDiameter(ring),
    );
  });
});
