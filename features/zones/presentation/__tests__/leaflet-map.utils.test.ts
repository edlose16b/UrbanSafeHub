import { describe, expect, it } from "vitest";
import { CITY_OPTIONS } from "@/app/constants/cities";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { ViewportQuery } from "../types/leaflet-map.types";
import {
  distanceBetweenViewportCentersMeters,
  getCrimeHeatColor,
  getZoneCenter,
  getZoneSeverity,
  getZoneStreetViewUrl,
  getZoneTrendSummary,
  shouldFetchViewport,
  zoneMatchesFilter,
} from "../utils/leaflet-map.utils";

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

  it("fetches when center movement reaches the viewport threshold", () => {
    const boundaryMovementViewport: ViewportQuery = {
      ...baseViewport,
      lat: baseViewport.lat + metersToLatDelta(201),
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

  it("maps crime levels into discrete severity buckets", () => {
    expect(getZoneSeverity(null)).toBe("unknown");
    expect(getZoneSeverity(1.8)).toBe("danger");
    expect(getZoneSeverity(3.1)).toBe("moderate");
    expect(getZoneSeverity(4.2)).toBe("safe");
  });

  it("matches zones by safety filter", () => {
    const zone: ZoneDTO = {
      id: "zone-1",
      name: "Avenida Central",
      description: null,
      geometry: {
        type: "Point",
        coordinates: [-77.1, -12.1],
        radiusM: 150,
      },
      crimeLevel: 4.3,
      createdBy: "user-1",
      createdAt: "2026-03-01T00:00:00.000Z",
    };

    expect(zoneMatchesFilter(zone, "danger")).toBe(false);
    expect(zoneMatchesFilter(zone, "safe")).toBe(true);
  });

  it("exposes a fixed city catalog for the map switcher", () => {
    expect(CITY_OPTIONS[0]?.id).toBe("lima");
    expect(CITY_OPTIONS.map((city) => city.id)).toContain("bogota");
    expect(CITY_OPTIONS.map((city) => city.id)).toContain("ciudad-de-mexico");
  });

  it("computes zone centers for point and polygon geometries", () => {
    expect(
      getZoneCenter({
        type: "Point",
        coordinates: [-77.0428, -12.0464],
        radiusM: 150,
      }),
    ).toEqual([-12.0464, -77.0428]);

    expect(
      getZoneCenter({
        type: "Polygon",
        coordinates: [
          [
            [-77.04, -12.04],
            [-77.02, -12.04],
            [-77.02, -12.02],
            [-77.04, -12.02],
            [-77.04, -12.04],
          ],
        ],
      }),
    ).toEqual([
      expect.closeTo(-12.032, 10),
      expect.closeTo(-77.032, 10),
    ]);
  });

  it("builds a Google Street View URL from the zone center", () => {
    const url = getZoneStreetViewUrl(
      {
        type: "Point",
        coordinates: [-77.0428, -12.0464],
        radiusM: 150,
      },
      "test-key",
    );

    expect(url).toContain("maps.googleapis.com/maps/api/streetview");
    expect(url).toContain("size=1200x720");
    expect(url).toContain("location=-12.0464%2C-77.0428");
    expect(url).toContain("key=test-key");
  });

  it("derives discrete heat colors and a day-stronger trend summary", () => {
    expect(getCrimeHeatColor(1.4)).toBe("#93000a");
    expect(getCrimeHeatColor(3.1)).toBe("#ffb95c");
    expect(getCrimeHeatColor(4.5)).toBe("#00a657");

    const detail: ZoneDetailDTO = {
      zone: {
        id: "zone-1",
        name: "Avenida Central",
        description: null,
        geometry: {
          type: "Point",
          coordinates: [-77.0428, -12.0464],
          radiusM: 150,
        },
        crimeLevel: 3.2,
        createdBy: "user-1",
        createdAt: "2026-03-20T10:00:00.000Z",
      },
      aggregates: [
        { categorySlug: "crime", timeSegment: "morning", ratingsCount: 3, avgScore: 4.6 },
        { categorySlug: "lighting", timeSegment: "morning", ratingsCount: 3, avgScore: 4.8 },
        { categorySlug: "crime", timeSegment: "afternoon", ratingsCount: 3, avgScore: 4.2 },
        { categorySlug: "foot_traffic", timeSegment: "afternoon", ratingsCount: 3, avgScore: 4.3 },
        { categorySlug: "crime", timeSegment: "night", ratingsCount: 3, avgScore: 2.0 },
        { categorySlug: "lighting", timeSegment: "night", ratingsCount: 3, avgScore: 2.6 },
        { categorySlug: "crime", timeSegment: "early_morning", ratingsCount: 3, avgScore: 1.5 },
      ],
      comments: [],
      viewerRatings: [],
    };

    expect(getZoneTrendSummary(detail)).toEqual({
      direction: "day_stronger",
      progressPercent: 64,
    });
  });
});
