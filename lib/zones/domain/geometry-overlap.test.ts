import { describe, expect, it } from "vitest";
import type { ZoneGeometry } from "./zone";
import { zoneGeometriesTouchOrIntersect } from "./geometry-overlap";

function pointZone(lng: number, lat: number, radiusM: number): ZoneGeometry {
  return {
    type: "Point",
    coordinates: [lng, lat],
    radiusM,
  };
}

function squarePolygon(lng: number, lat: number, halfSideDegrees: number): ZoneGeometry {
  return {
    type: "Polygon",
    coordinates: [[
      [lng - halfSideDegrees, lat - halfSideDegrees],
      [lng + halfSideDegrees, lat - halfSideDegrees],
      [lng + halfSideDegrees, lat + halfSideDegrees],
      [lng - halfSideDegrees, lat + halfSideDegrees],
      [lng - halfSideDegrees, lat - halfSideDegrees],
    ]],
  };
}

describe("zoneGeometriesTouchOrIntersect", () => {
  it("returns true for overlapping circles", () => {
    const first = pointZone(-77.0428, -12.0464, 120);
    const second = pointZone(-77.0419, -12.0464, 120);

    expect(zoneGeometriesTouchOrIntersect(first, second)).toBe(true);
  });

  it("returns false for separated circles", () => {
    const first = pointZone(-77.0428, -12.0464, 100);
    const second = pointZone(-77.0378, -12.0464, 100);

    expect(zoneGeometriesTouchOrIntersect(first, second)).toBe(false);
  });

  it("returns true when circle touches polygon border", () => {
    const circle = pointZone(-77.0428, -12.0464, 100);
    const polygon = squarePolygon(-77.0417, -12.0464, 0.0005);

    expect(zoneGeometriesTouchOrIntersect(circle, polygon)).toBe(true);
  });

  it("returns true when polygons overlap", () => {
    const first = squarePolygon(-77.0428, -12.0464, 0.0008);
    const second = squarePolygon(-77.0422, -12.0464, 0.0008);

    expect(zoneGeometriesTouchOrIntersect(first, second)).toBe(true);
  });

  it("returns false when polygons are disjoint", () => {
    const first = squarePolygon(-77.0428, -12.0464, 0.0004);
    const second = squarePolygon(-77.038, -12.0464, 0.0004);

    expect(zoneGeometriesTouchOrIntersect(first, second)).toBe(false);
  });
});
