import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZoneCommandRepository, ZoneQueryRepository } from "../domain/ports";
import type {
  GeoJsonPosition,
  ZoneGeometry,
  ZoneSnapshot,
  ZoneType,
} from "../domain/zone";
import { ZoneValidationError } from "../domain/validation";

type ZoneRow = {
  id: string;
  name: string;
  zone_type: ZoneType;
  geom: unknown;
  created_by: string;
  created_at: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

function parseGeometryObject(raw: unknown): ZoneGeometry {
  if (!raw || typeof raw !== "object") {
    throw new ZoneValidationError("Invalid geometry payload from database.");
  }

  const candidate = raw as { type?: unknown; coordinates?: unknown };

  if (candidate.type === "Point") {
    if (!isPosition(candidate.coordinates)) {
      throw new ZoneValidationError("Invalid Point geometry from database.");
    }

    return {
      type: "Point",
      coordinates: candidate.coordinates,
    };
  }

  if (candidate.type === "Polygon") {
    if (!Array.isArray(candidate.coordinates) || candidate.coordinates.length < 1) {
      throw new ZoneValidationError("Invalid Polygon geometry from database.");
    }

    const coordinates = candidate.coordinates.map((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) {
        throw new ZoneValidationError("Invalid Polygon ring from database.");
      }

      return ring.map((position) => {
        if (!isPosition(position)) {
          throw new ZoneValidationError("Invalid Polygon coordinate from database.");
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

function parseGeometry(raw: unknown): ZoneGeometry {
  if (typeof raw === "string") {
    try {
      return parseGeometryObject(JSON.parse(raw));
    } catch {
      throw new ZoneValidationError("Unable to parse geometry from database.");
    }
  }

  return parseGeometryObject(raw);
}

function toSnapshot(row: ZoneRow): ZoneSnapshot {
  return {
    id: row.id,
    name: row.name,
    zoneType: row.zone_type,
    geometry: parseGeometry(row.geom),
    createdBy: row.created_by,
    createdAt: row.created_at,
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
    .map((ring) => `(${ring.map((position) => positionToWkt(position)).join(",")})`)
    .join(",");

  return `SRID=4326;POLYGON(${rings})`;
}

export class SupabaseZoneRepository
  implements ZoneQueryRepository, ZoneCommandRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async listVisible(): Promise<ZoneSnapshot[]> {
    const { data, error } = await this.supabase
      .from("zones")
      .select("id, name, zone_type, geom, created_by, created_at")
      .eq("visibility", "active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Unable to list zones: ${error.message}`);
    }

    return (data ?? []).map((row) => toSnapshot(row as ZoneRow));
  }

  async create(record: {
    name: string;
    zoneType: ZoneType;
    geometry: ZoneGeometry;
    createdBy: string;
  }): Promise<ZoneSnapshot> {
    const { data, error } = await this.supabase
      .from("zones")
      .insert({
        name: record.name,
        zone_type: record.zoneType,
        geom: toEwktGeometry(record.geometry),
        created_by: record.createdBy,
      })
      .select("id, name, zone_type, geom, created_by, created_at")
      .single();

    if (error) {
      throw new Error(`Unable to create zone: ${error.message}`);
    }

    return toSnapshot(data as ZoneRow);
  }
}
