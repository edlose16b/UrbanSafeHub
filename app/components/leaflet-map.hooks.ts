import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { zoneGeometriesTouchOrIntersect } from "@/lib/zones/domain/geometry-overlap";
import {
  DEFAULT_POINT_RADIUS_M,
  MAX_POLYGON_DIAMETER_M,
  POINT_RADIUS_OPTIONS_M,
} from "@/app/constants/map";
import { isLatLngVertexSetWithinMaxDiameter } from "@/lib/zones/domain/geo-distance";
import type { GeoJsonPosition, ZoneGeometry } from "@/lib/zones/domain/zone";
import type { MapTranslations } from "./map-screen";
import type {
  DrawMode,
  LatLngPosition,
  LocationStatus,
  ViewportQuery,
} from "./leaflet-map.types";
import {
  shouldFetchViewport,
  getInitialLocationStatus,
} from "./leaflet-map.utils";

const VIEWPORT_FETCH_DEBOUNCE_MS = 350;

type GeolocationOptions = {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
};

const DEFAULT_GEOLOCATION_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

function resolveLocationStatus(
  error: GeolocationPositionError,
): LocationStatus {
  if (error.code === error.PERMISSION_DENIED) {
    return "denied";
  }

  return "unavailable";
}

export function useMapTheme() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const toggleTheme = useCallback(() => {
    setTheme(isDarkMode ? "light" : "dark");
  }, [isDarkMode, setTheme]);

  return {
    isDarkMode,
    toggleTheme,
  };
}

export function useZonesByViewport() {
  const [zones, setZones] = useState<ZoneDTO[]>([]);
  const activeRequestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedViewportRef = useRef<ViewportQuery | null>(null);

  const fetchZones = useCallback(async (query: ViewportQuery) => {
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;

    const params = new URLSearchParams({
      lat: query.lat.toFixed(7),
      lng: query.lng.toFixed(7),
      radiusKm: query.radiusKm.toFixed(4),
    });

    const response = await fetch(`/api/zones?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    if (response.bodyUsed) {
      return;
    }

    const payload = (await response.json()) as {
      zones?: ZoneDTO[];
    };

    if (activeRequestRef.current !== requestId) {
      return;
    }

    setZones(Array.isArray(payload.zones) ? payload.zones : []);
  }, []);

  const cancelScheduledZoneFetch = useCallback(() => {
    if (!debounceRef.current) {
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = null;
  }, []);

  const scheduleZoneFetch = useCallback(
    (query: ViewportQuery) => {
      if (!shouldFetchViewport(query, lastFetchedViewportRef.current)) {
        return;
      }

      cancelScheduledZoneFetch();

      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        lastFetchedViewportRef.current = query;
        void fetchZones(query);
      }, VIEWPORT_FETCH_DEBOUNCE_MS);
    },
    [cancelScheduledZoneFetch, fetchZones],
  );

  useEffect(() => {
    return () => {
      cancelScheduledZoneFetch();
    };
  }, [cancelScheduledZoneFetch]);

  const prependZone = useCallback((zone: ZoneDTO) => {
    setZones((current) => [
      zone,
      ...current.filter((item) => item.id !== zone.id),
    ]);
  }, []);

  return {
    zones,
    prependZone,
    scheduleZoneFetch,
    cancelScheduledZoneFetch,
  };
}

function requestCurrentPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void,
) {
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    onError,
    DEFAULT_GEOLOCATION_OPTIONS,
  );
}

export function useUserLocation() {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(
    null,
  );
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(
    getInitialLocationStatus,
  );

  const requestUserLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }

    requestCurrentPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("success");
      },
      (error) => {
        setLocationStatus(resolveLocationStatus(error));
      },
    );
  }, []);

  useEffect(() => {
    if (locationStatus !== "idle") {
      return;
    }

    let isCancelled = false;

    requestCurrentPosition(
      (position) => {
        if (isCancelled) {
          return;
        }

        setUserPosition([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("success");
      },
      (error) => {
        if (isCancelled) {
          return;
        }

        setLocationStatus(resolveLocationStatus(error));
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [locationStatus]);

  return {
    userPosition,
    locationStatus,
    requestUserLocation,
  };
}

type ZoneCreationHookOptions = {
  canCreate: boolean;
  existingZones: ZoneDTO[];
  translations: MapTranslations;
  onZoneCreated: (zone: ZoneDTO) => void;
};

function clampPointRadiusM(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_POINT_RADIUS_M;
  }

  return POINT_RADIUS_OPTIONS_M.reduce((closest, candidate) => {
    const isCloser = Math.abs(candidate - value) < Math.abs(closest - value);
    return isCloser ? candidate : closest;
  }, POINT_RADIUS_OPTIONS_M[0]);
}

export function useZoneCreation({
  canCreate,
  existingZones,
  translations,
  onZoneCreated,
}: ZoneCreationHookOptions) {
  const [drawMode, setDrawMode] = useState<DrawMode>("Point");
  const [zoneName, setZoneName] = useState("");
  const [pointRadiusM, setPointRadiusM] = useState(DEFAULT_POINT_RADIUS_M);
  const [pointCenter, setPointCenter] = useState<LatLngPosition | null>(null);
  const [polygonVertices, setPolygonVertices] = useState<LatLngPosition[]>([]);
  const polygonVerticesRef = useRef<LatLngPosition[]>(polygonVertices);
  polygonVerticesRef.current = polygonVertices;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const clearGeometry = useCallback(() => {
    setPointCenter(null);
    setPolygonVertices([]);
  }, []);

  const resetCreationState = useCallback(() => {
    setDrawMode("Point");
    setZoneName("");
    setPointRadiusM(DEFAULT_POINT_RADIUS_M);
    setPointCenter(null);
    setPolygonVertices([]);
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const handleDrawModeChange = useCallback(
    (nextMode: DrawMode) => {
      setDrawMode(nextMode);
      clearGeometry();
      setSubmitError(null);
      setSubmitSuccess(null);
    },
    [clearGeometry],
  );

  const handleMapClick = useCallback(
    (position: LatLngPosition) => {
      if (!canCreate) {
        return;
      }

      setSubmitError(null);
      setSubmitSuccess(null);

      if (drawMode === "Point") {
        setPointCenter(position);
        return;
      }

      const nextVertices: LatLngPosition[] = [...polygonVerticesRef.current, position];
      if (!isLatLngVertexSetWithinMaxDiameter(nextVertices)) {
        setSubmitError(
          translations.zoneCreatePolygonDiameterExceeded.replace(
            "{maxM}",
            String(MAX_POLYGON_DIAMETER_M),
          ),
        );
        setSubmitSuccess(null);
        return;
      }

      setPolygonVertices(nextVertices);
    },
    [canCreate, drawMode, translations.zoneCreatePolygonDiameterExceeded],
  );

  const removeLastPolygonVertex = useCallback(() => {
    setPolygonVertices((current) => current.slice(0, -1));
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const onPointRadiusChange = useCallback((value: number) => {
    setPointRadiusM(clampPointRadiusM(value));
  }, []);

  const notifyOverlapError = useCallback(() => {
    setSubmitError(translations.zoneCreateOverlapError);
    setSubmitSuccess(null);
  }, [translations.zoneCreateOverlapError]);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!canCreate || isSubmitting) {
      if (!canCreate) {
        setSubmitError(translations.zoneCreateTermsRequired);
        setSubmitSuccess(null);
      }
      return false;
    }

    const name = zoneName.trim();

    if (!name) {
      setSubmitError(translations.zoneCreateNameRequired);
      setSubmitSuccess(null);
      return false;
    }

    let geometry: ZoneGeometry;

    if (drawMode === "Point") {
      if (!pointCenter) {
        setSubmitError(translations.zoneCreatePointRequired);
        setSubmitSuccess(null);
        return false;
      }

      geometry = {
        type: "Point",
        coordinates: [pointCenter[1], pointCenter[0]],
        radiusM: pointRadiusM,
      };
    } else {
      if (polygonVertices.length < 3) {
        setSubmitError(translations.zoneCreatePolygonRequired);
        setSubmitSuccess(null);
        return false;
      }

      if (!isLatLngVertexSetWithinMaxDiameter(polygonVertices)) {
        setSubmitError(
          translations.zoneCreatePolygonDiameterExceeded.replace(
            "{maxM}",
            String(MAX_POLYGON_DIAMETER_M),
          ),
        );
        setSubmitSuccess(null);
        return false;
      }

      const ring: GeoJsonPosition[] = [...polygonVertices, polygonVertices[0]].map(
        ([lat, lng]): GeoJsonPosition => [lng, lat],
      );

      geometry = {
        type: "Polygon",
        coordinates: [ring],
      };
    }

    let hasClientConflict = false;
    try {
      hasClientConflict = existingZones.some((zone) =>
        zoneGeometriesTouchOrIntersect(zone.geometry, geometry),
      );
    } catch {
      hasClientConflict = false;
    }
    if (hasClientConflict) {
      notifyOverlapError();
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch("/api/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          geometry,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        errorCode?: string;
        error?: string;
        zone?: ZoneDTO;
      };

      if (!response.ok) {
        if (payload.errorCode === "ZONE_GEOMETRY_CONFLICT") {
          notifyOverlapError();
          return false;
        }

        if (payload.errorCode === "ZONE_POLYGON_DIAMETER_EXCEEDED") {
          setSubmitError(
            translations.zoneCreatePolygonDiameterExceeded.replace(
              "{maxM}",
              String(MAX_POLYGON_DIAMETER_M),
            ),
          );
          return false;
        }

        setSubmitError(payload.error ?? translations.zoneCreateFailedFallback);
        return false;
      }

      if (payload.zone) {
        onZoneCreated(payload.zone);
      }

      setZoneName("");
      clearGeometry();
      setSubmitSuccess(translations.zoneCreateSuccess);
      return true;
    } catch {
      setSubmitError(translations.zoneCreateFailedFallback);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canCreate,
    clearGeometry,
    drawMode,
    existingZones,
    isSubmitting,
    onZoneCreated,
    pointCenter,
    pointRadiusM,
    polygonVertices,
    translations.zoneCreateFailedFallback,
    translations.zoneCreateNameRequired,
    translations.zoneCreatePointRequired,
    translations.zoneCreatePolygonDiameterExceeded,
    translations.zoneCreatePolygonRequired,
    translations.zoneCreateSuccess,
    translations.zoneCreateTermsRequired,
    zoneName,
    notifyOverlapError,
  ]);

  return {
    drawMode,
    zoneName,
    pointRadiusM,
    pointCenter,
    polygonVertices,
    isSubmitting,
    submitError,
    submitSuccess,
    setZoneName,
    onPointRadiusChange,
    handleDrawModeChange,
    handleMapClick,
    clearGeometry,
    resetCreationState,
    removeLastPolygonVertex,
    submit,
  };
}

type ZoneDetailHookOptions = {
  detailFetchFailedFallback: string;
};

export function useSelectedZoneDetail({
  detailFetchFailedFallback,
}: ZoneDetailHookOptions) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneDetail, setSelectedZoneDetail] = useState<ZoneDetailDTO | null>(
    null,
  );
  const [isZoneDetailLoading, setIsZoneDetailLoading] = useState(false);
  const [zoneDetailError, setZoneDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedZoneId) {
      setSelectedZoneDetail(null);
      setIsZoneDetailLoading(false);
      setZoneDetailError(null);
      return;
    }

    const controller = new AbortController();
    setIsZoneDetailLoading(true);
    setZoneDetailError(null);
    setSelectedZoneDetail(null);

    void (async () => {
      try {
        const response = await fetch(`/api/zones/${selectedZoneId}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => ({}))) as {
          detail?: ZoneDetailDTO;
          error?: string;
        };

        if (!response.ok) {
          setZoneDetailError(payload.error ?? detailFetchFailedFallback);
          setSelectedZoneDetail(null);
          return;
        }

        setSelectedZoneDetail(payload.detail ?? null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setZoneDetailError(detailFetchFailedFallback);
      } finally {
        setIsZoneDetailLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [detailFetchFailedFallback, selectedZoneId]);

  const selectZone = useCallback((zoneId: string) => {
    setSelectedZoneId(zoneId);
  }, []);

  const clearSelectedZone = useCallback(() => {
    setSelectedZoneId(null);
  }, []);

  return {
    selectedZoneId,
    selectedZoneDetail,
    isZoneDetailLoading,
    zoneDetailError,
    selectZone,
    clearSelectedZone,
  };
}
