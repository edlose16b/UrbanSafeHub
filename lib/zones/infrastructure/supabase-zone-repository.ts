import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ListVisibleNearCenterQuery,
  SubmitZoneRatingsRecord,
  ZoneCommandRepository,
  ZoneQueryRepository,
} from "../domain/ports";
import type {
  TimeSegment,
  ZoneCommentSnapshot,
  ZoneDetailSnapshot,
  ZoneRatingAggregateSnapshot,
  ZoneViewerRatingSnapshot,
} from "../domain/zone-detail";
import type {
  GeoJsonPosition,
  ZoneGeometry,
  ZoneSnapshot,
} from "../domain/zone";
import {
  type CreateZoneRatingRecord,
  ZoneGeometryConflictError,
  ZoneValidationError,
} from "../domain/validation";
import { isFiniteNumber } from "../utils/number";
import { zoneGeometriesTouchOrIntersect } from "../domain/geometry-overlap";

type ZoneRow = {
  id: string;
  name: string;
  description: string | null;
  geom: unknown;
  radius_m: number | null;
  created_by: string;
  created_at: string;
};

type ZoneCrimeAggregateRow = {
  zone_id: string;
  ratings_count: number;
  avg_score: number | null;
};

type ZoneAggregateRow = {
  category_slug: string;
  time_segment: TimeSegment | null;
  ratings_count: number;
  avg_score: number | null;
};

type ZoneCommentRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type ZoneViewerRatingRow = {
  category_slug: string;
  time_segment: TimeSegment | null;
  score: number;
};

type AnonymousVoteActorUpsertRow = {
  fingerprint_hash: string;
  last_ip_hash: string | null;
  last_user_agent_hash: string | null;
  last_zone_id: string;
};

function isPosition(value: unknown): value is GeoJsonPosition {
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

function parseGeometryObject(raw: unknown, radiusM: number | null): ZoneGeometry {
  if (!raw || typeof raw !== "object") {
    throw new ZoneValidationError("Invalid geometry payload from database.");
  }

  const candidate = raw as { type?: unknown; coordinates?: unknown };

  if (candidate.type === "Point") {
    if (!isPosition(candidate.coordinates)) {
      throw new ZoneValidationError("Invalid Point geometry from database.");
    }

    if (!isFiniteNumber(radiusM)) {
      throw new ZoneValidationError("Point geometry requires radius_m.");
    }

    return {
      type: "Point",
      coordinates: candidate.coordinates,
      radiusM: Math.round(radiusM),
    };
  }

  if (candidate.type === "Polygon") {
    if (
      !Array.isArray(candidate.coordinates) ||
      candidate.coordinates.length < 1
    ) {
      throw new ZoneValidationError("Invalid Polygon geometry from database.");
    }

    const coordinates = candidate.coordinates.map((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new ZoneValidationError("Invalid Polygon ring from database.");
      }

      return ring.map((position) => {
        if (!isPosition(position)) {
          throw new ZoneValidationError(
            "Invalid Polygon coordinate from database.",
          );
        }

        return position;
      });
    });

    return {
      type: "Polygon",
      coordinates,
    };
  }

  throw new ZoneValidationError("Unsupported geometry type from database.");
}

function parseGeometry(raw: unknown, radiusM: number | null): ZoneGeometry {
  if (typeof raw === "string") {
    try {
      return parseGeometryObject(JSON.parse(raw), radiusM);
    } catch {
      throw new ZoneValidationError("Unable to parse geometry from database.");
    }
  }

  return parseGeometryObject(raw, radiusM);
}

function toSnapshot(row: ZoneRow, crimeLevel: number | null): ZoneSnapshot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    geometry: parseGeometry(row.geom, row.radius_m),
    crimeLevel,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function parseNullableScore(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (isFiniteNumber(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toAggregateSnapshot(row: ZoneAggregateRow): ZoneRatingAggregateSnapshot {
  return {
    categorySlug: row.category_slug,
    timeSegment: row.time_segment,
    ratingsCount:
      isFiniteNumber(row.ratings_count) && row.ratings_count > 0
        ? Math.round(row.ratings_count)
        : 0,
    avgScore: parseNullableScore(row.avg_score),
  };
}

function toCommentSnapshot(row: ZoneCommentRow): ZoneCommentSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function toViewerRatingSnapshot(
  row: ZoneViewerRatingRow,
): ZoneViewerRatingSnapshot {
  return {
    categorySlug: row.category_slug,
    timeSegment: row.time_segment,
    score: Math.round(row.score),
  };
}

function positionToWkt(position: GeoJsonPosition): string {
  return `${position[0]} ${position[1]}`;
}

function toEwktGeometry(geometry: ZoneGeometry): string {
  if (geometry.type === "Point") {
    return `SRID=4326;POINT(${positionToWkt(geometry.coordinates)})`;
  }

  const rings = geometry.coordinates
    .map(
      (ring) =>
        `(${ring.map((position) => positionToWkt(position)).join(",")})`,
    )
    .join(",");

  return `SRID=4326;POLYGON(${rings})`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  first: GeoJsonPosition,
  second: GeoJsonPosition,
): number {
  const [firstLng, firstLat] = first;
  const [secondLng, secondLat] = second;
  const earthRadiusKm = 6371;

  const dLat = toRadians(secondLat - firstLat);
  const dLng = toRadians(secondLng - firstLng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(firstLat)) *
      Math.cos(toRadians(secondLat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function isPointInsidePolygon(
  point: GeoJsonPosition,
  polygonRing: GeoJsonPosition[],
): boolean {
  let inside = false;
  const [pointLng, pointLat] = point;

  for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
    const [lngI, latI] = polygonRing[i];
    const [lngJ, latJ] = polygonRing[j];
    const intersects =
      latI > pointLat !== latJ > pointLat &&
      pointLng < ((lngJ - lngI) * (pointLat - latI)) / (latJ - latI) + lngI;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isZoneWithinRadius(
  zone: ZoneSnapshot,
  center: GeoJsonPosition,
  radiusKm: number,
): boolean {
  if (zone.geometry.type === "Point") {
    const zoneRadiusKm = zone.geometry.radiusM / 1000;
    return haversineDistanceKm(zone.geometry.coordinates, center) <= radiusKm + zoneRadiusKm;
  }

  const outerRing = zone.geometry.coordinates[0];

  if (isPointInsidePolygon(center, outerRing)) {
    return true;
  }

  return outerRing.some(
    (vertex) => haversineDistanceKm(vertex, center) <= radiusKm,
  );
}

export class SupabaseZoneRepository
  implements ZoneQueryRepository, ZoneCommandRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  private async assertNoGeometryConflict(geometry: ZoneGeometry): Promise<void> {
    const { data, error } = await this.supabase
      .from("zones")
      .select("geom, radius_m")
      .eq("visibility", "active")
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Unable to check existing zones: ${error.message}`);
    }

    for (const row of (data ?? []) as Pick<ZoneRow, "geom" | "radius_m">[]) {
      const existingGeometry = parseGeometry(row.geom, row.radius_m);
      if (zoneGeometriesTouchOrIntersect(existingGeometry, geometry)) {
        throw new ZoneGeometryConflictError("Zone geometry intersects an existing zone.");
      }
    }
  }

  async listVisibleNearCenter(
    query: ListVisibleNearCenterQuery,
  ): Promise<ZoneSnapshot[]> {
    const { data, error } = await this.supabase
      .from("zones")
      .select("id, name, description, geom, radius_m, created_by, created_at")
      .eq("visibility", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to list zones: ${error.message}`);
    }

    const center: GeoJsonPosition = [query.lng, query.lat];
    const zoneRows = (data ?? []) as ZoneRow[];
    const zoneIds = zoneRows.map((row) => row.id);

    const zoneCrimeById = new Map<string, number | null>();

    if (zoneIds.length > 0) {
      const { data: aggregateData, error: aggregateError } = await this.supabase
        .from("zone_rating_aggregates")
        .select("zone_id, ratings_count, avg_score")
        .eq("category_slug", "crime")
        .in("zone_id", zoneIds);

      if (aggregateError) {
        throw new Error(`Unable to load zone crime aggregates: ${aggregateError.message}`);
      }

      const weightedSumByZone = new Map<string, number>();
      const weightByZone = new Map<string, number>();

      for (const aggregate of (aggregateData ?? []) as ZoneCrimeAggregateRow[]) {
        if (
          !isFiniteNumber(aggregate.avg_score) ||
          !isFiniteNumber(aggregate.ratings_count) ||
          aggregate.ratings_count <= 0
        ) {
          continue;
        }

        const previousWeightedSum = weightedSumByZone.get(aggregate.zone_id) ?? 0;
        const previousWeight = weightByZone.get(aggregate.zone_id) ?? 0;
        weightedSumByZone.set(
          aggregate.zone_id,
          previousWeightedSum + aggregate.avg_score * aggregate.ratings_count,
        );
        weightByZone.set(aggregate.zone_id, previousWeight + aggregate.ratings_count);
      }

      for (const zoneId of zoneIds) {
        const weightedSum = weightedSumByZone.get(zoneId);
        const weight = weightByZone.get(zoneId);

        if (!isFiniteNumber(weightedSum) || !isFiniteNumber(weight) || weight <= 0) {
          zoneCrimeById.set(zoneId, null);
          continue;
        }

        zoneCrimeById.set(zoneId, Math.max(1, Math.min(5, weightedSum / weight)));
      }
    }

    const zones = zoneRows.map((row) => toSnapshot(row, zoneCrimeById.get(row.id) ?? null));

    return zones.filter((zone) =>
      isZoneWithinRadius(zone, center, query.radiusKm),
    );
  }

  async getVisibleDetailById(
    zoneId: string,
    viewerUserId?: string | null,
  ): Promise<ZoneDetailSnapshot | null> {
    const { data: zoneData, error: zoneError } = await this.supabase
      .from("zones")
      .select("id, name, description, geom, radius_m, created_by, created_at")
      .eq("id", zoneId)
      .eq("visibility", "active")
      .is("deleted_at", null)
      .maybeSingle();

    if (zoneError) {
      throw new Error(`Unable to load zone detail: ${zoneError.message}`);
    }

    if (!zoneData) {
      return null;
    }

    const zoneRow = zoneData as ZoneRow;
    const { data: crimeAggregateData, error: crimeAggregateError } = await this.supabase
      .from("zone_rating_aggregates")
      .select("avg_score")
      .eq("zone_id", zoneId)
      .eq("category_slug", "crime");

    if (crimeAggregateError) {
      throw new Error(
        `Unable to load zone crime aggregate: ${crimeAggregateError.message}`,
      );
    }

    let crimeLevel: number | null = null;
    const crimeScores = (crimeAggregateData ?? [])
      .map((row) => parseNullableScore((row as { avg_score: unknown }).avg_score))
      .filter((score): score is number => score !== null);

    if (crimeScores.length > 0) {
      const averageCrimeScore = crimeScores.reduce((sum, score) => sum + score, 0) / crimeScores.length;
      crimeLevel = Math.max(1, Math.min(5, averageCrimeScore));
    }

    const zone = toSnapshot(zoneRow, crimeLevel);

    const { data: aggregateData, error: aggregateError } = await this.supabase
      .from("zone_rating_aggregates")
      .select("category_slug, time_segment, ratings_count, avg_score")
      .eq("zone_id", zoneId)
      .order("category_slug", { ascending: true })
      .order("time_segment", { ascending: true, nullsFirst: true });

    if (aggregateError) {
      throw new Error(`Unable to load zone aggregates: ${aggregateError.message}`);
    }

    const aggregates = ((aggregateData ?? []) as ZoneAggregateRow[]).map(
      toAggregateSnapshot,
    );

    const { data: commentData, error: commentError } = await this.supabase
      .from("zone_comments")
      .select("id, user_id, body, created_at")
      .eq("zone_id", zoneId)
      .eq("visibility", "visible")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (commentError) {
      throw new Error(`Unable to load zone comments: ${commentError.message}`);
    }

    const comments = ((commentData ?? []) as ZoneCommentRow[]).map(
      toCommentSnapshot,
    );

    let viewerRatings: ZoneViewerRatingSnapshot[] = [];

    if (viewerUserId) {
      const { data: viewerRatingData, error: viewerRatingError } = await this.supabase
        .from("zone_ratings")
        .select("category_slug, time_segment, score")
        .eq("zone_id", zoneId)
        .eq("user_id", viewerUserId)
        .eq("is_current", true)
        .order("category_slug", { ascending: true })
        .order("time_segment", { ascending: true });

      if (viewerRatingError) {
        throw new Error(
          `Unable to load viewer ratings: ${viewerRatingError.message}`,
        );
      }

      viewerRatings = ((viewerRatingData ?? []) as ZoneViewerRatingRow[]).map(
        toViewerRatingSnapshot,
      );
    }

    return {
      zone,
      aggregates,
      comments,
      viewerRatings,
    };
  }

  async create(record: {
    name: string;
    description: string | null;
    geometry: ZoneGeometry;
    ratings: CreateZoneRatingRecord[];
    createdBy: string;
  }): Promise<ZoneSnapshot> {
    await this.assertNoGeometryConflict(record.geometry);

    const { data, error } = await this.supabase
      .from("zones")
      .insert({
        name: record.name,
        description: record.description,
        geom: toEwktGeometry(record.geometry),
        radius_m: record.geometry.type === "Point" ? record.geometry.radiusM : null,
        created_by: record.createdBy,
      })
      .select("id, name, description, geom, radius_m, created_by, created_at")
      .single();

    if (error) {
      throw new Error(`Unable to create zone: ${error.message}`);
    }

    if (record.ratings.length > 0) {
      const { error: ratingsError } = await this.supabase.from("zone_ratings").insert(
        record.ratings.map((rating) => ({
          zone_id: data.id,
          user_id: record.createdBy,
          category_slug: rating.categorySlug,
          time_segment: rating.timeSegment,
          score: rating.score,
          is_current: true,
        })),
      );

      if (ratingsError) {
        await this.supabase.from("zones").delete().eq("id", data.id);
        throw new Error(`Unable to create zone ratings: ${ratingsError.message}`);
      }
    }

    return toSnapshot(data as ZoneRow, null);
  }

  async submitRatings(record: SubmitZoneRatingsRecord): Promise<void> {
    const actorConstraintSatisfied =
      (record.userId !== null && record.anonymousFingerprint === null) ||
      (record.userId === null && record.anonymousFingerprint !== null);

    if (!actorConstraintSatisfied) {
      throw new Error("Ratings require either a user id or an anonymous fingerprint.");
    }

    if (record.anonymousActor) {
      const actorRow: AnonymousVoteActorUpsertRow = {
        fingerprint_hash: record.anonymousActor.fingerprintHash,
        last_ip_hash: record.anonymousActor.ipHash,
        last_user_agent_hash: record.anonymousActor.userAgentHash,
        last_zone_id: record.zoneId,
      };

      const { error: actorError } = await this.supabase
        .from("anonymous_vote_actors")
        .upsert(actorRow, { onConflict: "fingerprint_hash" });

      if (actorError) {
        throw new Error(
          `Unable to record anonymous vote actor: ${actorError.message}`,
        );
      }
    }

    const rows = record.ratings.map((rating) => ({
      zone_id: record.zoneId,
      user_id: record.userId,
      anonymous_fingerprint: record.anonymousFingerprint,
      category_slug: rating.categorySlug,
      time_segment: rating.timeSegment,
      score: rating.score,
      is_current: true,
    }));

    const { error } = await this.supabase.from("zone_ratings").insert(rows);

    if (error) {
      throw new Error(`Unable to submit zone ratings: ${error.message}`);
    }
  }
}
