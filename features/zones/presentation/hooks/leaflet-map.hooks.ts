import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { zoneGeometriesTouchOrIntersect } from "@/lib/zones/domain/geometry-overlap";
import { DEFAULT_POINT_RADIUS_M, POINT_RADIUS_OPTIONS_M } from "@/app/constants/map";
import type { ZoneGeometry } from "@/lib/zones/domain/zone";
import type { SegmentKey } from "@/lib/zones/rating-time-segments";
import type { MapTranslations } from "../types/map-translations";
import type { LatLngPosition, LocationStatus, ViewportQuery } from "../types/leaflet-map.types";
import {
  buildZoneCreationRatingsPayload,
  createEmptyInfrastructureScores,
  createEmptyMetricScores,
  type ZoneCreationInfrastructureScores,
  type ZoneCreationMetricScores,
  type ZoneRatingScore,
} from "../utils/zone-creation-form.utils";
import {
  shouldFetchViewport,
  getInitialLocationStatus,
} from "../utils/leaflet-map.utils";

const VIEWPORT_FETCH_DEBOUNCE_MS = 900;

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

  const removeZoneById = useCallback((zoneId: string) => {
    setZones((current) => current.filter((zone) => zone.id !== zoneId));
  }, []);

  const refreshZones = useCallback(async () => {
    const lastViewport = lastFetchedViewportRef.current;

    if (!lastViewport) {
      return;
    }

    cancelScheduledZoneFetch();
    await fetchZones(lastViewport);
  }, [cancelScheduledZoneFetch, fetchZones]);

  return {
    zones,
    prependZone,
    removeZoneById,
    refreshZones,
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
  onSubmitSuccess?: () => void;
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
  onSubmitSuccess,
}: ZoneCreationHookOptions) {
  const [zoneName, setZoneName] = useState("");
  const [zoneDescription, setZoneDescription] = useState("");
  const [pointRadiusM, setPointRadiusM] = useState(DEFAULT_POINT_RADIUS_M);
  const [pointCenter, setPointCenter] = useState<LatLngPosition | null>(null);
  const [crimeScores, setCrimeScores] = useState<ZoneCreationMetricScores>(
    createEmptyMetricScores,
  );
  const [footTrafficScores, setFootTrafficScores] = useState<ZoneCreationMetricScores>(
    createEmptyMetricScores,
  );
  const [infrastructureScores, setInfrastructureScores] =
    useState<ZoneCreationInfrastructureScores>(createEmptyInfrastructureScores);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const clearGeometry = useCallback(() => {
    setPointCenter(null);
  }, []);

  const resetCreationState = useCallback(() => {
    setZoneName("");
    setZoneDescription("");
    setPointRadiusM(DEFAULT_POINT_RADIUS_M);
    setPointCenter(null);
    setCrimeScores(createEmptyMetricScores());
    setFootTrafficScores(createEmptyMetricScores());
    setInfrastructureScores(createEmptyInfrastructureScores());
    setSubmitError(null);
    setSubmitSuccess(null);
  }, []);

  const onMetricScoreChange = useCallback(
    (
      category: "crime" | "foot_traffic" | "vigilance",
      segment: SegmentKey,
      score: ZoneRatingScore,
    ) => {
      setSubmitError(null);
      setSubmitSuccess(null);

      if (category === "crime") {
        setCrimeScores((current) => ({
          ...current,
          [segment]: score,
        }));
        return;
      }

      if (category === "foot_traffic") {
        setFootTrafficScores((current) => ({
          ...current,
          [segment]: score,
        }));
        return;
      }

      setInfrastructureScores((current) => ({
        ...current,
        vigilance: {
          ...current.vigilance,
          [segment]: score,
        },
      }));
    },
    [],
  );

  const onInfrastructureScoreChange = useCallback(
    (category: "lighting" | "cctv", score: ZoneRatingScore) => {
      setSubmitError(null);
      setSubmitSuccess(null);
      setInfrastructureScores((current) => ({
        ...current,
        [category]: score,
      }));
    },
    [],
  );

  const handleMapClick = useCallback(
    (position: LatLngPosition) => {
      if (!canCreate) {
        return;
      }

      setSubmitError(null);
      setSubmitSuccess(null);
      setPointCenter(position);
    },
    [canCreate],
  );

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
    const description = zoneDescription.trim();

    if (!name) {
      setSubmitError(translations.zoneCreateNameRequired);
      setSubmitSuccess(null);
      return false;
    }

    if (!pointCenter) {
      setSubmitError(translations.zoneCreatePointRequired);
      setSubmitSuccess(null);
      return false;
    }

    const geometry: ZoneGeometry = {
      type: "Point",
      coordinates: [pointCenter[1], pointCenter[0]],
      radiusM: pointRadiusM,
    };

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

    const ratings = buildZoneCreationRatingsPayload({
      crimeScores,
      footTrafficScores,
      infrastructureScores,
    });

    if (ratings.length === 0) {
      setSubmitError(translations.zoneCreateRatingsRequired);
      setSubmitSuccess(null);
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
          description,
          geometry,
          ratings,
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

        setSubmitError(payload.error ?? translations.zoneCreateFailedFallback);
        return false;
      }

      if (payload.zone) {
        onZoneCreated(payload.zone);
      }

      resetCreationState();
      setSubmitSuccess(translations.zoneCreateSuccess);
      onSubmitSuccess?.();
      return true;
    } catch {
      setSubmitError(translations.zoneCreateFailedFallback);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canCreate,
    crimeScores,
    existingZones,
    footTrafficScores,
    infrastructureScores,
    isSubmitting,
    onZoneCreated,
    onSubmitSuccess,
    pointCenter,
    pointRadiusM,
    resetCreationState,
    translations.zoneCreateFailedFallback,
    translations.zoneCreateNameRequired,
    translations.zoneCreatePointRequired,
    translations.zoneCreateRatingsRequired,
    translations.zoneCreateSuccess,
    translations.zoneCreateTermsRequired,
    zoneDescription,
    zoneName,
    notifyOverlapError,
  ]);

  return {
    zoneName,
    zoneDescription,
    pointRadiusM,
    pointCenter,
    crimeScores,
    footTrafficScores,
    infrastructureScores,
    isSubmitting,
    submitError,
    submitSuccess,
    setZoneName,
    setZoneDescription,
    onPointRadiusChange,
    onMetricScoreChange,
    onInfrastructureScoreChange,
    handleMapClick,
    clearGeometry,
    resetCreationState,
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

  const fetchZoneDetail = useCallback(
    async (zoneId: string, signal?: AbortSignal): Promise<ZoneDetailDTO | null> => {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        detail?: ZoneDetailDTO;
        error?: string;
      };

      if (!response.ok) {
        const error = new Error(payload.error ?? detailFetchFailedFallback) as Error & {
          fromResponse?: boolean;
        };
        error.fromResponse = true;
        throw error;
      }

      return payload.detail ?? null;
    },
    [detailFetchFailedFallback],
  );

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
        const detail = await fetchZoneDetail(selectedZoneId, controller.signal);
        setSelectedZoneDetail(detail);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setZoneDetailError(
          error instanceof Error && "fromResponse" in error
            ? error.message
            : detailFetchFailedFallback,
        );
        setSelectedZoneDetail(null);
      } finally {
        setIsZoneDetailLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [detailFetchFailedFallback, fetchZoneDetail, selectedZoneId]);

  const selectZone = useCallback((zoneId: string) => {
    setSelectedZoneId(zoneId);
  }, []);

  const clearSelectedZone = useCallback(() => {
    setSelectedZoneId(null);
  }, []);

  const refreshSelectedZone = useCallback(async () => {
    if (!selectedZoneId) {
      return null;
    }

    setIsZoneDetailLoading(true);
    setZoneDetailError(null);

    try {
      const detail = await fetchZoneDetail(selectedZoneId);
      setSelectedZoneDetail(detail);
      return detail;
    } catch (error) {
      setZoneDetailError(
        error instanceof Error && "fromResponse" in error
          ? error.message
          : detailFetchFailedFallback,
      );
      setSelectedZoneDetail(null);
      return null;
    } finally {
      setIsZoneDetailLoading(false);
    }
  }, [detailFetchFailedFallback, fetchZoneDetail, selectedZoneId]);

  return {
    selectedZoneId,
    selectedZoneDetail,
    isZoneDetailLoading,
    zoneDetailError,
    selectZone,
    clearSelectedZone,
    refreshSelectedZone,
  };
}
