import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
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

function resolveLocationStatus(error: GeolocationPositionError): LocationStatus {
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
    setZones((current) => [zone, ...current.filter((item) => item.id !== zone.id)]);
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
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>(getInitialLocationStatus);

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
  translations: MapTranslations;
  onZoneCreated: (zone: ZoneDTO) => void;
};

function clampPointRadiusM(value: number): number {
  if (!Number.isFinite(value)) {
    return 10;
  }

  return Math.max(10, Math.min(2000, Math.round(value)));
}

export function useZoneCreation({
  canCreate,
  translations,
  onZoneCreated,
}: ZoneCreationHookOptions) {
  const [drawMode, setDrawMode] = useState<DrawMode>("Point");
  const [zoneName, setZoneName] = useState("");
  const [pointRadiusM, setPointRadiusM] = useState(150);
  const [pointCenter, setPointCenter] = useState<LatLngPosition | null>(null);
  const [polygonVertices, setPolygonVertices] = useState<LatLngPosition[]>([]);
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
    setPointRadiusM(150);
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

      setPolygonVertices((current) => [...current, position]);
    },
    [canCreate, drawMode],
  );

  const removeLastPolygonVertex = useCallback(() => {
    setPolygonVertices((current) => current.slice(0, -1));
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const onPointRadiusChange = useCallback((value: number) => {
    setPointRadiusM(clampPointRadiusM(value));
  }, []);

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

    let geometry: unknown;

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

      const ring = [...polygonVertices, polygonVertices[0]].map(([lat, lng]) => [
        lng,
        lat,
      ]);

      geometry = {
        type: "Polygon",
        coordinates: [ring],
      };
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
        error?: string;
        zone?: ZoneDTO;
      };

      if (!response.ok) {
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
    isSubmitting,
    onZoneCreated,
    pointCenter,
    pointRadiusM,
    polygonVertices,
    translations.zoneCreateFailedFallback,
    translations.zoneCreateNameRequired,
    translations.zoneCreatePointRequired,
    translations.zoneCreatePolygonRequired,
    translations.zoneCreateSuccess,
    translations.zoneCreateTermsRequired,
    zoneName,
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
