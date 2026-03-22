import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_POLYGON_DIAMETER_M } from "@/app/constants/map";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import dictionary from "@/app/i18n/dictionaries/en.json";
import type { MapTranslations } from "../map-screen";
import type { LatLngPosition } from "../leaflet-map.types";
import { useZoneCreation } from "../leaflet-map.hooks";

const translations = dictionary.map as MapTranslations;

function metersToLatDelta(meters: number): number {
  return meters / 111_320;
}

function metersToLngDelta(meters: number, latitude: number): number {
  return meters / (111_320 * Math.cos((latitude * Math.PI) / 180));
}

describe("useZoneCreation", () => {
  const baseLat = -12.0464;
  const baseLng = -77.0428;
  const base: LatLngPosition = [baseLat, baseLng];

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects a polygon vertex when it would make diameter exceed max", () => {
    const onZoneCreated = vi.fn();
    const { result } = renderHook(() =>
      useZoneCreation({
        canCreate: true,
        existingZones: [],
        translations,
        onZoneCreated,
      }),
    );

    act(() => {
      result.current.handleDrawModeChange("Polygon");
    });

    act(() => {
      result.current.handleMapClick(base);
    });
    expect(result.current.polygonVertices).toHaveLength(1);

    const farNorth: LatLngPosition = [
      baseLat + metersToLatDelta(400),
      baseLng,
    ];

    act(() => {
      result.current.handleMapClick(farNorth);
    });

    expect(result.current.polygonVertices).toHaveLength(1);
    expect(result.current.submitError).toBe(
      translations.zoneCreatePolygonDiameterExceeded.replace(
        "{maxM}",
        String(MAX_POLYGON_DIAMETER_M),
      ),
    );
    expect(onZoneCreated).not.toHaveBeenCalled();
  });

  it("accepts a compact triangle, POST succeeds, and clears draft", async () => {
    const createdZone: ZoneDTO = {
      id: "zone-1",
      name: "Test poly",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [baseLng, baseLat],
            [baseLng, baseLat + metersToLatDelta(50)],
            [baseLng + metersToLngDelta(50, baseLat), baseLat],
            [baseLng, baseLat],
          ],
        ],
      },
      crimeLevel: null,
      createdBy: "user-1",
      createdAt: new Date().toISOString(),
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ zone: createdZone }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const onZoneCreated = vi.fn();
    const { result } = renderHook(() =>
      useZoneCreation({
        canCreate: true,
        existingZones: [],
        translations,
        onZoneCreated,
      }),
    );

    act(() => {
      result.current.handleDrawModeChange("Polygon");
    });

    const p0 = base;
    const p1: LatLngPosition = [baseLat + metersToLatDelta(50), baseLng];
    const p2: LatLngPosition = [
      baseLat,
      baseLng + metersToLngDelta(50, baseLat),
    ];

    act(() => {
      result.current.handleMapClick(p0);
    });
    act(() => {
      result.current.handleMapClick(p1);
    });
    act(() => {
      result.current.handleMapClick(p2);
    });
    expect(result.current.polygonVertices).toHaveLength(3);

    act(() => {
      result.current.setZoneName("Test poly");
    });

    await act(async () => {
      const ok = await result.current.submit();
      expect(ok).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.name).toBe("Test poly");
    expect(body.geometry.type).toBe("Polygon");
    expect(onZoneCreated).toHaveBeenCalledWith(createdZone);
    expect(result.current.zoneName).toBe("");
    expect(result.current.polygonVertices).toHaveLength(0);
    expect(result.current.submitSuccess).toBe(translations.zoneCreateSuccess);
  });

  it("maps ZONE_POLYGON_DIAMETER_EXCEEDED from API to translated message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          errorCode: "ZONE_POLYGON_DIAMETER_EXCEEDED",
          error: `Polygon diameter exceeds ${MAX_POLYGON_DIAMETER_M} m.`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const onZoneCreated = vi.fn();
    const { result } = renderHook(() =>
      useZoneCreation({
        canCreate: true,
        existingZones: [],
        translations,
        onZoneCreated,
      }),
    );

    act(() => {
      result.current.handleDrawModeChange("Polygon");
    });

    act(() => {
      result.current.handleMapClick(base);
    });
    act(() => {
      result.current.handleMapClick([baseLat + metersToLatDelta(40), baseLng]);
    });
    act(() => {
      result.current.handleMapClick([
        baseLat,
        baseLng + metersToLngDelta(40, baseLat),
      ]);
    });
    act(() => {
      result.current.setZoneName("X");
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.submitError).toBe(
      translations.zoneCreatePolygonDiameterExceeded.replace(
        "{maxM}",
        String(MAX_POLYGON_DIAMETER_M),
      ),
    );
    expect(onZoneCreated).not.toHaveBeenCalled();
  });

  it("blocks submit when terms not accepted (canCreate false)", async () => {
    const { result } = renderHook(() =>
      useZoneCreation({
        canCreate: false,
        existingZones: [],
        translations,
        onZoneCreated: vi.fn(),
      }),
    );

    act(() => {
      result.current.setZoneName("N");
    });

    await act(async () => {
      const ok = await result.current.submit();
      expect(ok).toBe(false);
    });

    expect(result.current.submitError).toBe(translations.zoneCreateTermsRequired);
  });
});
