import type { GeoJsonPosition, ZoneGeometry } from "./zone";

type CartesianPoint = {
  x: number;
  y: number;
};

type CircleGeometry = {
  type: "circle";
  center: CartesianPoint;
  radiusM: number;
};

type PolygonGeometry = {
  type: "polygon";
  vertices: CartesianPoint[];
};

const METERS_PER_DEGREE_LAT = 111_320;
const TOUCH_EPSILON_M = 0.001;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function meanLatitude(first: ZoneGeometry, second: ZoneGeometry): number {
  const latitudes: number[] = [];

  const collectLatitudes = (geometry: ZoneGeometry) => {
    if (geometry.type === "Point") {
      latitudes.push(geometry.coordinates[1]);
      return;
    }

    for (const [_, latitude] of geometry.coordinates[0]) {
      latitudes.push(latitude);
    }
  };

  collectLatitudes(first);
  collectLatitudes(second);

  if (latitudes.length === 0) {
    return 0;
  }

  const sum = latitudes.reduce((accumulator, latitude) => accumulator + latitude, 0);
  return sum / latitudes.length;
}

function toCartesian(position: GeoJsonPosition, referenceLatitude: number): CartesianPoint {
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos(toRadians(referenceLatitude));
  return {
    x: position[0] * metersPerDegreeLng,
    y: position[1] * METERS_PER_DEGREE_LAT,
  };
}

function toNormalizedGeometry(
  geometry: ZoneGeometry,
  referenceLatitude: number,
): CircleGeometry | PolygonGeometry {
  if (geometry.type === "Point") {
    return {
      type: "circle",
      center: toCartesian(geometry.coordinates, referenceLatitude),
      radiusM: geometry.radiusM,
    };
  }

  return {
    type: "polygon",
    vertices: normalizeRing(geometry.coordinates[0]).map((position) =>
      toCartesian(position, referenceLatitude),
    ),
  };
}

function normalizeRing(ring: GeoJsonPosition[]): GeoJsonPosition[] {
  if (ring.length < 2) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = first[0] === last[0] && first[1] === last[1];

  if (isClosed) {
    return ring.slice(0, -1);
  }

  return ring;
}

function squaredDistance(first: CartesianPoint, second: CartesianPoint): number {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;
  return deltaX * deltaX + deltaY * deltaY;
}

function pointOnSegment(
  point: CartesianPoint,
  start: CartesianPoint,
  end: CartesianPoint,
): boolean {
  const cross =
    (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
  if (Math.abs(cross) > TOUCH_EPSILON_M) {
    return false;
  }

  const dot =
    (point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y);
  if (dot < -TOUCH_EPSILON_M) {
    return false;
  }

  const segmentLengthSquared = squaredDistance(start, end);
  return dot <= segmentLengthSquared + TOUCH_EPSILON_M;
}

function pointInPolygonOrBoundary(point: CartesianPoint, polygon: CartesianPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  let inside = false;

  for (let index = 0; index < polygon.length; index += 1) {
    const nextIndex = (index + 1) % polygon.length;
    const current = polygon[index];
    const next = polygon[nextIndex];

    if (pointOnSegment(point, current, next)) {
      return true;
    }

    const intersects =
      current.y > point.y !== next.y > point.y &&
      point.x < ((next.x - current.x) * (point.y - current.y)) / (next.y - current.y) + current.x;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function orientation(
  first: CartesianPoint,
  second: CartesianPoint,
  third: CartesianPoint,
): number {
  const value =
    (second.y - first.y) * (third.x - second.x) -
    (second.x - first.x) * (third.y - second.y);

  if (Math.abs(value) <= TOUCH_EPSILON_M) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function segmentsTouchOrIntersect(
  firstStart: CartesianPoint,
  firstEnd: CartesianPoint,
  secondStart: CartesianPoint,
  secondEnd: CartesianPoint,
): boolean {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart);
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

  if (firstOrientation !== secondOrientation && thirdOrientation !== fourthOrientation) {
    return true;
  }

  if (firstOrientation === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }
  if (secondOrientation === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }
  if (thirdOrientation === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }
  if (fourthOrientation === 0 && pointOnSegment(firstEnd, secondStart, secondEnd)) {
    return true;
  }

  return false;
}

function pointToSegmentDistanceSquared(
  point: CartesianPoint,
  start: CartesianPoint,
  end: CartesianPoint,
): number {
  const segmentLengthSquared = squaredDistance(start, end);

  if (segmentLengthSquared <= TOUCH_EPSILON_M) {
    return squaredDistance(point, start);
  }

  const projection =
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
    segmentLengthSquared;
  const clampedProjection = Math.max(0, Math.min(1, projection));
  const closestPoint = {
    x: start.x + clampedProjection * (end.x - start.x),
    y: start.y + clampedProjection * (end.y - start.y),
  };

  return squaredDistance(point, closestPoint);
}

function polygonsTouchOrIntersect(first: CartesianPoint[], second: CartesianPoint[]): boolean {
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    const firstNextIndex = (firstIndex + 1) % first.length;
    const firstStart = first[firstIndex];
    const firstEnd = first[firstNextIndex];

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      const secondNextIndex = (secondIndex + 1) % second.length;
      const secondStart = second[secondIndex];
      const secondEnd = second[secondNextIndex];

      if (segmentsTouchOrIntersect(firstStart, firstEnd, secondStart, secondEnd)) {
        return true;
      }
    }
  }

  if (pointInPolygonOrBoundary(first[0], second)) {
    return true;
  }

  return pointInPolygonOrBoundary(second[0], first);
}

function circleAndPolygonTouchOrIntersect(
  circle: CircleGeometry,
  polygon: PolygonGeometry,
): boolean {
  const radiusSquared = circle.radiusM * circle.radiusM;

  if (pointInPolygonOrBoundary(circle.center, polygon.vertices)) {
    return true;
  }

  for (let index = 0; index < polygon.vertices.length; index += 1) {
    const nextIndex = (index + 1) % polygon.vertices.length;
    const start = polygon.vertices[index];
    const end = polygon.vertices[nextIndex];

    if (pointToSegmentDistanceSquared(circle.center, start, end) <= radiusSquared + TOUCH_EPSILON_M) {
      return true;
    }
  }

  return false;
}

export function zoneGeometriesTouchOrIntersect(
  first: ZoneGeometry,
  second: ZoneGeometry,
): boolean {
  const referenceLatitude = meanLatitude(first, second);
  const firstGeometry = toNormalizedGeometry(first, referenceLatitude);
  const secondGeometry = toNormalizedGeometry(second, referenceLatitude);

  if (firstGeometry.type === "circle" && secondGeometry.type === "circle") {
    const maxDistance = firstGeometry.radiusM + secondGeometry.radiusM;
    return squaredDistance(firstGeometry.center, secondGeometry.center) <= maxDistance * maxDistance;
  }

  if (firstGeometry.type === "polygon" && secondGeometry.type === "polygon") {
    return polygonsTouchOrIntersect(firstGeometry.vertices, secondGeometry.vertices);
  }

  if (firstGeometry.type === "circle") {
    return circleAndPolygonTouchOrIntersect(firstGeometry, secondGeometry);
  }

  return circleAndPolygonTouchOrIntersect(secondGeometry, firstGeometry);
}
