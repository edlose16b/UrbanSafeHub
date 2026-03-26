import "server-only";

import type { ZoneDTO } from "../application/zone-dto";
import { getRedisClient } from "@/lib/redis/client";

const ZONES_VISIBLE_CACHE_PREFIX = "zones:visible:v1";
const ZONES_VISIBLE_KEYS_SET = `${ZONES_VISIBLE_CACHE_PREFIX}:keys`;
const ZONES_VISIBLE_TTL_SECONDS = 300;

type VisibleZonesViewportQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

function normalizeViewportValue(value: number, digits: number): string {
  return value.toFixed(digits);
}

function isZoneDTOArray(value: unknown): value is ZoneDTO[] {
  return (
    Array.isArray(value) &&
    value.every((zone) => {
      if (!zone || typeof zone !== "object") {
        return false;
      }

      const candidate = zone as Partial<ZoneDTO>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        "geometry" in candidate &&
        "crimeLevel" in candidate &&
        typeof candidate.createdBy === "string" &&
        typeof candidate.createdAt === "string"
      );
    })
  );
}

export function buildZonesViewportCacheKey(
  query: VisibleZonesViewportQuery,
): string {
  const normalizedLat = normalizeViewportValue(query.lat, 7);
  const normalizedLng = normalizeViewportValue(query.lng, 7);
  const normalizedRadiusKm = normalizeViewportValue(query.radiusKm, 4);

  return `${ZONES_VISIBLE_CACHE_PREFIX}:lat:${normalizedLat}:lng:${normalizedLng}:radius:${normalizedRadiusKm}`;
}

export async function getCachedVisibleZones(
  query: VisibleZonesViewportQuery,
): Promise<ZoneDTO[] | null> {
  const redis = getRedisClient();

  if (!redis) {
    return null;
  }

  const cacheKey = buildZonesViewportCacheKey(query);

  try {
    const cached = await redis.get<ZoneDTO[] | null>(cacheKey);
    return isZoneDTOArray(cached) ? cached : null;
  } catch (error) {
    console.warn("Unable to read zones cache.", error);
    return null;
  }
}

export async function setCachedVisibleZones(
  query: VisibleZonesViewportQuery,
  zones: ZoneDTO[],
): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  const cacheKey = buildZonesViewportCacheKey(query);

  try {
    await redis.set(cacheKey, zones, { ex: ZONES_VISIBLE_TTL_SECONDS });
    await redis.sadd(ZONES_VISIBLE_KEYS_SET, cacheKey);
  } catch (error) {
    console.warn("Unable to write zones cache.", error);
  }
}

export async function invalidateVisibleZonesCache(): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    const keys = (await redis.smembers<string[]>(ZONES_VISIBLE_KEYS_SET)).filter(
      (key): key is string => typeof key === "string" && key.length > 0,
    );

    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis.del(key)));
    }

    await redis.del(ZONES_VISIBLE_KEYS_SET);
  } catch (error) {
    console.warn("Unable to invalidate zones cache.", error);
  }
}
