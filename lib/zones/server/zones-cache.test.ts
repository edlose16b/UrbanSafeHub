import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ZoneDTO } from "../application/zone-dto";

vi.mock("server-only", () => ({}));

const getRedisClientMock = vi.fn();

vi.mock("@/lib/redis/client", () => ({
  getRedisClient: getRedisClientMock,
}));

const {
  buildZonesViewportCacheKey,
  getCachedVisibleZones,
  setCachedVisibleZones,
  invalidateVisibleZonesCache,
} = await import("./zones-cache");

function createZone(overrides: Partial<ZoneDTO> = {}): ZoneDTO {
  return {
    id: "zone-1",
    name: "Test zone",
    description: "desc",
    geometry: {
      type: "Point",
      coordinates: [-77.0428, -12.0464],
      radiusM: 50,
    },
    crimeLevel: 3,
    createdBy: "user-1",
    createdAt: "2026-03-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("zones-cache", () => {
  beforeEach(() => {
    getRedisClientMock.mockReset();
  });

  it("builds a stable cache key using normalized viewport values", () => {
    expect(
      buildZonesViewportCacheKey({
        lat: -12.04640004,
        lng: -77.04279996,
        radiusKm: 4.123456,
      }),
    ).toBe(
      "zones:visible:v1:lat:-12.0464000:lng:-77.0428000:radius:4.1235",
    );
  });

  it("returns cached zones on cache hit", async () => {
    const cachedZones = [createZone()];
    const get = vi.fn().mockResolvedValue(cachedZones);
    getRedisClientMock.mockReturnValue({
      get,
    });

    await expect(
      getCachedVisibleZones({
        lat: -12.0464,
        lng: -77.0428,
        radiusKm: 20,
      }),
    ).resolves.toEqual(cachedZones);

    expect(get).toHaveBeenCalledWith(
      "zones:visible:v1:lat:-12.0464000:lng:-77.0428000:radius:20.0000",
    );
  });

  it("ignores malformed cached payloads", async () => {
    getRedisClientMock.mockReturnValue({
      get: vi.fn().mockResolvedValue([{ foo: "bar" }]),
    });

    await expect(
      getCachedVisibleZones({
        lat: -12.0464,
        lng: -77.0428,
        radiusKm: 20,
      }),
    ).resolves.toBeNull();
  });

  it("stores cached zones with ttl and tracks the active key", async () => {
    const set = vi.fn().mockResolvedValue("OK");
    const sadd = vi.fn().mockResolvedValue(1);
    const zones = [createZone()];

    getRedisClientMock.mockReturnValue({
      set,
      sadd,
    });

    await setCachedVisibleZones(
      {
        lat: -12.0464,
        lng: -77.0428,
        radiusKm: 20,
      },
      zones,
    );

    expect(set).toHaveBeenCalledWith(
      "zones:visible:v1:lat:-12.0464000:lng:-77.0428000:radius:20.0000",
      zones,
      { ex: 300 },
    );
    expect(sadd).toHaveBeenCalledWith(
      "zones:visible:v1:keys",
      "zones:visible:v1:lat:-12.0464000:lng:-77.0428000:radius:20.0000",
    );
  });

  it("invalidates all tracked keys and clears the key index", async () => {
    const smembers = vi.fn().mockResolvedValue([
      "zones:visible:v1:lat:-12.0464000:lng:-77.0428000:radius:20.0000",
      "zones:visible:v1:lat:-12.0500000:lng:-77.0400000:radius:4.0000",
    ]);
    const del = vi.fn().mockResolvedValue(1);

    getRedisClientMock.mockReturnValue({
      smembers,
      del,
    });

    await invalidateVisibleZonesCache();

    expect(smembers).toHaveBeenCalledWith("zones:visible:v1:keys");
    expect(del).toHaveBeenCalledTimes(3);
    expect(del).toHaveBeenNthCalledWith(
      1,
      "zones:visible:v1:lat:-12.0464000:lng:-77.0428000:radius:20.0000",
    );
    expect(del).toHaveBeenNthCalledWith(
      2,
      "zones:visible:v1:lat:-12.0500000:lng:-77.0400000:radius:4.0000",
    );
    expect(del).toHaveBeenNthCalledWith(3, "zones:visible:v1:keys");
  });
});
