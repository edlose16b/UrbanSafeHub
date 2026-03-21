import { useCallback, useEffect, useRef, useState } from "react";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { LocationStatus, ViewportQuery } from "./leaflet-map.types";
import {
  getInitialLocationStatus,
  getSystemPrefersDarkMode,
} from "./leaflet-map.utils";

const VIEWPORT_FETCH_DEBOUNCE_MS = 250;

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
  const [isDarkMode, setIsDarkMode] = useState(getSystemPrefersDarkMode);

  const toggleTheme = useCallback(() => {
    setIsDarkMode((current) => !current);
  }, []);

  return {
    isDarkMode,
    toggleTheme,
  };
}

export function useZonesByViewport() {
  const [zones, setZones] = useState<ZoneDTO[]>([]);
  const activeRequestRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const payload = (await response.json()) as {
      zones?: ZoneDTO[];
    };

    if (activeRequestRef.current !== requestId) {
      return;
    }

    setZones(Array.isArray(payload.zones) ? payload.zones : []);
  }, []);

  const scheduleZoneFetch = useCallback(
    (query: ViewportQuery) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        void fetchZones(query);
      }, VIEWPORT_FETCH_DEBOUNCE_MS);
    },
    [fetchZones],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    zones,
    scheduleZoneFetch,
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
