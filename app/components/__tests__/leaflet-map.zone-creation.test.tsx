import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import dictionary from "@/app/i18n/dictionaries/en.json";
import type { MapTranslations } from "../map-screen";
import type { LatLngPosition } from "../leaflet-map.types";
import { useZoneCreation } from "../leaflet-map.hooks";

const translations = dictionary.map as MapTranslations;

describe("useZoneCreation", () => {
  const baseLat = -12.0464;
  const baseLng = -77.0428;
  const base: LatLngPosition = [baseLat, baseLng];

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a point zone, POST succeeds, and clears draft", async () => {
    const createdZone: ZoneDTO = {
      id: "zone-1",
      name: "Test point",
      geometry: {
        type: "Point",
        coordinates: [baseLng, baseLat],
        radiusM: 150,
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
      result.current.handleMapClick(base);
    });
    expect(result.current.pointCenter).toEqual(base);

    act(() => {
      result.current.setZoneName("Test point");
    });

    await act(async () => {
      const ok = await result.current.submit();
      expect(ok).toBe(true);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe("POST");
    const body = JSON.parse((init?.body as string) ?? "{}");
    expect(body.name).toBe("Test point");
    expect(body.geometry.type).toBe("Point");
    expect(body.geometry.coordinates).toEqual([baseLng, baseLat]);
    expect(body.geometry.radiusM).toBe(150);
    expect(onZoneCreated).toHaveBeenCalledWith(createdZone);
    expect(result.current.zoneName).toBe("");
    expect(result.current.pointCenter).toBeNull();
    expect(result.current.submitSuccess).toBe(translations.zoneCreateSuccess);
  });

  it("blocks submit until a center point is selected", async () => {
    const { result } = renderHook(() =>
      useZoneCreation({
        canCreate: true,
        existingZones: [],
        translations,
        onZoneCreated: vi.fn(),
      }),
    );

    act(() => {
      result.current.setZoneName("Test point");
    });

    await act(async () => {
      const ok = await result.current.submit();
      expect(ok).toBe(false);
    });

    expect(result.current.submitError).toBe(translations.zoneCreatePointRequired);
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
