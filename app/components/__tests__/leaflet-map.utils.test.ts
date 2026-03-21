import { describe, expect, it } from "vitest";
import type { ViewportQuery } from "../leaflet-map.types";
import {
  distanceBetweenViewportCentersMeters,
  shouldFetchViewport,
} from "../leaflet-map.utils";

function metersToLatDelta(meters: number): number {
  return meters / 111_320;
}

describe("leaflet-map.utils", () => {
  const baseViewport: ViewportQuery = {
    lat: -12.0464,
    lng: -77.0428,
    radiusKm: 0.5,
  };

  it("returns true on first viewport fetch", () => {
    expect(shouldFetchViewport(baseViewport, null)).toBe(true);
  });

  it("does not fetch when center movement is below threshold", () => {
    const tinyMovementViewport: ViewportQuery = {
      ...baseViewport,
      lat: baseViewport.lat + metersToLatDelta(1),
    };

    expect(shouldFetchViewport(tinyMovementViewport, baseViewport)).toBe(false);
  });

  it("fetches when center movement reaches threshold boundary", () => {
    const boundaryMovementViewport: ViewportQuery = {
      ...baseViewport,
      lat: baseViewport.lat + metersToLatDelta(101),
    };

    expect(shouldFetchViewport(boundaryMovementViewport, baseViewport)).toBe(true);
  });

  it("uses radius-proportional threshold for bigger viewports", () => {
    const largeRadiusViewport: ViewportQuery = {
      ...baseViewport,
      radiusKm: 2,
    };
    const mediumMovementViewport: ViewportQuery = {
      ...largeRadiusViewport,
      lat: largeRadiusViewport.lat + metersToLatDelta(250),
    };

    expect(shouldFetchViewport(mediumMovementViewport, largeRadiusViewport)).toBe(false);
  });

  it("fetches when radius changes by at least 15%", () => {
    const zoomedViewport: ViewportQuery = {
      ...baseViewport,
      radiusKm: baseViewport.radiusKm * 1.15,
    };

    expect(shouldFetchViewport(zoomedViewport, baseViewport)).toBe(true);
  });

  it("does not fetch when radius changes by less than 15%", () => {
    const slightlyZoomedViewport: ViewportQuery = {
      ...baseViewport,
      radiusKm: baseViewport.radiusKm * 1.1,
    };

    expect(shouldFetchViewport(slightlyZoomedViewport, baseViewport)).toBe(false);
  });

  it("computes near-zero distance for equal viewports", () => {
    const distance = distanceBetweenViewportCentersMeters(baseViewport, baseViewport);

    expect(distance).toBeLessThan(0.001);
  });
});
