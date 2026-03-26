import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { ViewportQuery } from "../leaflet-map.types";
import { useSelectedZoneDetail, useZonesByViewport } from "../leaflet-map.hooks";

function createZonesResponse() {
  return new Response(JSON.stringify({ zones: [] }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function createZoneDetailResponse(detail: ZoneDetailDTO) {
  return new Response(JSON.stringify({ detail }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function metersToLatDelta(meters: number): number {
  return meters / 111_320;
}

describe("useZonesByViewport", () => {
  const baseViewport: ViewportQuery = {
    lat: -12.0464,
    lng: -77.0428,
    radiusKm: 0.5,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("debounces rapid viewport updates and fetches only once", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createZonesResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useZonesByViewport());
    const movedViewport: ViewportQuery = {
      ...baseViewport,
      lat: baseViewport.lat + metersToLatDelta(150),
    };

    act(() => {
      result.current.scheduleZoneFetch(baseViewport);
      result.current.scheduleZoneFetch(movedViewport);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(349);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain(movedViewport.lat.toFixed(7));
  });

  it("does not fetch again when movement is below threshold", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createZonesResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useZonesByViewport());

    act(() => {
      result.current.scheduleZoneFetch(baseViewport);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const tinyMoveViewport: ViewportQuery = {
      ...baseViewport,
      lat: baseViewport.lat + metersToLatDelta(1),
    };

    act(() => {
      result.current.scheduleZoneFetch(tinyMoveViewport);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches on zoom when radius changes by 15% or more", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createZonesResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useZonesByViewport());

    act(() => {
      result.current.scheduleZoneFetch(baseViewport);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const zoomedViewport: ViewportQuery = {
      ...baseViewport,
      radiusKm: baseViewport.radiusKm * 1.2,
    };

    act(() => {
      result.current.scheduleZoneFetch(zoomedViewport);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fetch on zoom when radius change is below 15%", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createZonesResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useZonesByViewport());

    act(() => {
      result.current.scheduleZoneFetch(baseViewport);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const smallZoomViewport: ViewportQuery = {
      ...baseViewport,
      radiusKm: baseViewport.radiusKm * 1.1,
    };

    act(() => {
      result.current.scheduleZoneFetch(smallZoomViewport);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send request if scheduled debounce is cancelled before timeout", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createZonesResponse());
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useZonesByViewport());

    act(() => {
      result.current.scheduleZoneFetch(baseViewport);
      result.current.cancelScheduledZoneFetch();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

});

describe("useSelectedZoneDetail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads selected zone details and exposes them in state", async () => {
    const detail: ZoneDetailDTO = {
      zone: {
        id: "zone-1",
        name: "Zona 1",
        description: "Cerca a la avenida principal",
        geometry: {
          type: "Point",
          coordinates: [-77.0428, -12.0464],
          radiusM: 150,
        },
        crimeLevel: 3.5,
        createdBy: "user-1",
        createdAt: "2026-03-20T10:00:00.000Z",
      },
      aggregates: [],
      comments: [],
      viewerRatings: [],
    };
    const fetchMock = vi.fn().mockResolvedValue(createZoneDetailResponse(detail));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useSelectedZoneDetail({
        detailFetchFailedFallback: "fallback",
      }),
    );

    await act(async () => {
      result.current.selectZone("zone-1");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/zones/zone-1", {
      method: "GET",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    expect(result.current.selectedZoneDetail?.zone.id).toBe("zone-1");
    expect(result.current.zoneDetailError).toBeNull();
  });

  it("stores translated fallback error when request fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network"));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useSelectedZoneDetail({
        detailFetchFailedFallback: "No se pudo cargar.",
      }),
    );

    await act(async () => {
      result.current.selectZone("zone-2");
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.zoneDetailError).toBe("No se pudo cargar.");
    expect(result.current.selectedZoneDetail).toBeNull();
  });
});
