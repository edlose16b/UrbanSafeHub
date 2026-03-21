import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewportQuery } from "../leaflet-map.types";
import { useZonesByViewport } from "../leaflet-map.hooks";

function createZonesResponse() {
  return new Response(JSON.stringify({ zones: [] }), {
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
