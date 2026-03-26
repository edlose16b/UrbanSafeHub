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
import type { TimeSegment } from "./zone-detail";

const MIN_ZONE_NAME_LENGTH = 2;
const MAX_ZONE_NAME_LENGTH = 120;
const MAX_ZONE_DESCRIPTION_LENGTH = 400;
const VALID_TIME_SEGMENTS: readonly TimeSegment[] = [
  "morning",
  "afternoon",
  "night",
  "early_morning",
] as const;

export type ZoneRatingCategorySlug =
  | "crime"
  | "foot_traffic"
  | "lighting"
  | "vigilance"
  | "cctv"
  | "overall_safety";

export type SubmitZoneRatingCategorySlug =
  | "crime"
  | "lighting"
  | "foot_traffic"
  | "vigilance"
  | "cctv";

export type CreateZoneRatingRecord = {
  categorySlug: ZoneRatingCategorySlug;
  timeSegment: TimeSegment | null;
  score: number;
};

export type SubmitZoneRatingRecord = {
  categorySlug: SubmitZoneRatingCategorySlug;
  timeSegment: TimeSegment | null;
  score: number;
};

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

export function sanitizeZoneDescription(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ZoneValidationError("Zone description must be a string.");
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > MAX_ZONE_DESCRIPTION_LENGTH) {
    throw new ZoneValidationError(
      `Zone description must have at most ${MAX_ZONE_DESCRIPTION_LENGTH} characters.`,
    );
  }

  return normalized;
}

function isValidTimeSegment(value: unknown): value is TimeSegment {
  return typeof value === "string" && VALID_TIME_SEGMENTS.includes(value as TimeSegment);
}

function isValidCategorySlug(value: unknown): value is ZoneRatingCategorySlug {
  return (
    value === "crime" ||
    value === "foot_traffic" ||
    value === "lighting" ||
    value === "vigilance" ||
    value === "cctv" ||
    value === "overall_safety"
  );
}

function isValidSubmitCategorySlug(
  value: unknown,
): value is SubmitZoneRatingCategorySlug {
  return (
    value === "crime" ||
    value === "lighting" ||
    value === "foot_traffic" ||
    value === "vigilance" ||
    value === "cctv"
  );
}

function toRatingKey(
  categorySlug: ZoneRatingCategorySlug,
  timeSegment: TimeSegment | null,
): string {
  return `${categorySlug}:${timeSegment ?? "general"}`;
}

export function parseCreateZoneRatings(value: unknown): CreateZoneRatingRecord[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new ZoneValidationError("Zone ratings payload must be an array.");
  }

  const ratings = value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new ZoneValidationError(`Zone rating at index ${index} is invalid.`);
    }

    const candidate = entry as {
      categorySlug?: unknown;
      timeSegment?: unknown;
      score?: unknown;
    };

    if (!isValidCategorySlug(candidate.categorySlug)) {
      throw new ZoneValidationError(`Unknown rating category at index ${index}.`);
    }

    if (
      !isFiniteNumber(candidate.score) ||
      !Number.isInteger(candidate.score) ||
      candidate.score < 1 ||
      candidate.score > 5
    ) {
      throw new ZoneValidationError(`Rating score at index ${index} must be between 1 and 5.`);
    }

    const expectsSegment =
      candidate.categorySlug === "crime" ||
      candidate.categorySlug === "foot_traffic" ||
      candidate.categorySlug === "vigilance";

    if (expectsSegment) {
      if (!isValidTimeSegment(candidate.timeSegment)) {
        throw new ZoneValidationError(
          `Rating category ${candidate.categorySlug} requires a valid time segment.`,
        );
      }
    } else if (candidate.timeSegment !== null && candidate.timeSegment !== undefined) {
      throw new ZoneValidationError(
        `Rating category ${candidate.categorySlug} does not allow a time segment.`,
      );
    }

    return {
      categorySlug: candidate.categorySlug,
      timeSegment: expectsSegment
        ? (candidate.timeSegment as TimeSegment)
        : null,
      score: Math.round(candidate.score),
    } satisfies CreateZoneRatingRecord;
  });

  const seen = new Set<string>();
  for (const rating of ratings) {
    const key = toRatingKey(rating.categorySlug, rating.timeSegment);
    if (seen.has(key)) {
      throw new ZoneValidationError(`Duplicate rating detected for ${key}.`);
    }
    seen.add(key);
  }

  return ratings;
}

export function parseSubmitZoneRatings(value: unknown): SubmitZoneRatingRecord[] {
  if (!Array.isArray(value)) {
    throw new ZoneValidationError("Vote ratings payload must be an array.");
  }

  const ratings = value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new ZoneValidationError(`Vote rating at index ${index} is invalid.`);
    }

    const candidate = entry as {
      categorySlug?: unknown;
      timeSegment?: unknown;
      score?: unknown;
    };

    if (!isValidSubmitCategorySlug(candidate.categorySlug)) {
      throw new ZoneValidationError(`Unknown vote category at index ${index}.`);
    }

    if (
      !isFiniteNumber(candidate.score) ||
      !Number.isInteger(candidate.score) ||
      candidate.score < 1 ||
      candidate.score > 5
    ) {
      throw new ZoneValidationError(
        `Vote score at index ${index} must be between 1 and 5.`,
      );
    }

    const expectsSegment =
      candidate.categorySlug === "crime" ||
      candidate.categorySlug === "foot_traffic" ||
      candidate.categorySlug === "vigilance";

    if (expectsSegment) {
      if (!isValidTimeSegment(candidate.timeSegment)) {
        throw new ZoneValidationError(
          `Vote category ${candidate.categorySlug} requires a valid time segment.`,
        );
      }
    } else if (candidate.timeSegment !== null && candidate.timeSegment !== undefined) {
      throw new ZoneValidationError(
        `Vote category ${candidate.categorySlug} does not allow a time segment.`,
      );
    }

    return {
      categorySlug: candidate.categorySlug,
      timeSegment: expectsSegment ? (candidate.timeSegment as TimeSegment) : null,
      score: Math.round(candidate.score),
    } satisfies SubmitZoneRatingRecord;
  });

  const seen = new Set<string>();
  for (const rating of ratings) {
    const key = `${rating.categorySlug}:${rating.timeSegment ?? "general"}`;
    if (seen.has(key)) {
      throw new ZoneValidationError(
        `Duplicate vote rating detected for ${key}.`,
      );
    }

    seen.add(key);
  }

  if (ratings.length === 0) {
    throw new ZoneValidationError("Votes must include at least one rating.");
  }

  return ratings;
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
