import {
  type GeoJsonPoint,
  type GeoJsonPolygon,
  type GeoJsonPosition,
  type ZoneGeometry,
} from "./zone";
import {
  MAX_POLYGON_DIAMETER_M,
  POINT_RADIUS_OPTIONS_M,
} from "@/app/constants/map";
import { isPolygonRingWithinMaxDiameter } from "./geo-distance";
import { isFiniteNumber } from "../utils/number";

const MIN_ZONE_NAME_LENGTH = 2;
const MAX_ZONE_NAME_LENGTH = 120;

export class ZoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZoneValidationError";
  }
}

export class ZoneGeometryConflictError extends ZoneValidationError {
  constructor(message: string) {
    super(message);
    this.name = "ZoneGeometryConflictError";
  }
}

export class ZonePolygonDiameterExceededError extends ZoneValidationError {
  constructor(public readonly maxMeters: number) {
    super(`Polygon diameter exceeds ${maxMeters} m.`);
    this.name = "ZonePolygonDiameterExceededError";
  }
}

function isValidPosition(value: unknown): value is GeoJsonPosition {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  const [longitude, latitude] = value;
  return (
    isFiniteNumber(longitude) &&
    isFiniteNumber(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function areSamePosition(
  first: GeoJsonPosition,
  second: GeoJsonPosition,
): boolean {
  return first[0] === second[0] && first[1] === second[1];
}

function parsePointCoordinates(raw: unknown): GeoJsonPosition {
  if (!isValidPosition(raw)) {
    throw new ZoneValidationError("Invalid Point coordinates.");
  }

  return raw;
}

function parsePointRadiusM(raw: unknown): number {
  if (!isFiniteNumber(raw)) {
    throw new ZoneValidationError("Point radiusM must be a number.");
  }

  const minRadiusM = POINT_RADIUS_OPTIONS_M[0];
  const maxRadiusM = POINT_RADIUS_OPTIONS_M[POINT_RADIUS_OPTIONS_M.length - 1];

  if (raw < minRadiusM || raw > maxRadiusM) {
    throw new ZoneValidationError(
      `Point radiusM must be between ${minRadiusM} and ${maxRadiusM}.`,
    );
  }

  return Math.round(raw);
}

function parsePolygonCoordinates(raw: unknown): GeoJsonPosition[][] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ZoneValidationError(
      "Invalid Polygon coordinates: at least one ring is required.",
    );
  }

  return raw.map((ringCandidate, ringIndex) => {
    if (!Array.isArray(ringCandidate) || ringCandidate.length < 4) {
      throw new ZoneValidationError(
        `Invalid Polygon ring at index ${ringIndex}: at least four coordinates are required.`,
      );
    }

    const ring = ringCandidate.map((positionCandidate, positionIndex) => {
      if (!isValidPosition(positionCandidate)) {
        throw new ZoneValidationError(
          `Invalid Polygon coordinate at ring ${ringIndex}, position ${positionIndex}.`,
        );
      }

      return positionCandidate;
    });

    const first = ring[0];
    const last = ring[ring.length - 1];

    if (!areSamePosition(first, last)) {
      throw new ZoneValidationError(
        `Invalid Polygon ring at index ${ringIndex}: first and last coordinates must be the same.`,
      );
    }

    return ring;
  });
}

export function sanitizeZoneName(value: unknown): string {
  if (typeof value !== "string") {
    throw new ZoneValidationError("Zone name must be a string.");
  }

  const normalized = value.trim();

  if (normalized.length < MIN_ZONE_NAME_LENGTH) {
    throw new ZoneValidationError(
      `Zone name must have at least ${MIN_ZONE_NAME_LENGTH} characters.`,
    );
  }

  if (normalized.length > MAX_ZONE_NAME_LENGTH) {
    throw new ZoneValidationError(
      `Zone name must have at most ${MAX_ZONE_NAME_LENGTH} characters.`,
    );
  }

  return normalized;
}

export function parseZoneGeometry(value: unknown): ZoneGeometry {
  if (!value || typeof value !== "object") {
    throw new ZoneValidationError("Geometry payload must be an object.");
  }

  const candidate = value as {
    type?: unknown;
    coordinates?: unknown;
    radiusM?: unknown;
  };

  if (candidate.type === "Point") {
    const coordinates = parsePointCoordinates(candidate.coordinates);
    const radiusM = parsePointRadiusM(candidate.radiusM);
    const point: GeoJsonPoint = {
      type: "Point",
      coordinates,
      radiusM,
    };
    return point;
  }

  if (candidate.type === "Polygon") {
    const coordinates = parsePolygonCoordinates(candidate.coordinates);
    for (const ring of coordinates) {
      if (!isPolygonRingWithinMaxDiameter(ring, MAX_POLYGON_DIAMETER_M)) {
        throw new ZonePolygonDiameterExceededError(MAX_POLYGON_DIAMETER_M);
      }
    }
    const polygon: GeoJsonPolygon = {
      type: "Polygon",
      coordinates,
    };
    return polygon;
  }

  throw new ZoneValidationError("Geometry type must be Point or Polygon.");
}
