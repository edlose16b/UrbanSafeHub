"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import {
  INITIAL_ZOOM,
  LIMA_CENTER,
  LOCATE_USER_ICON,
  MAP_STYLE_ICON,
  MAP_TILE_STYLES,
  TILE_ATTRIBUTION,
} from "../constants/map";
import AuthAvatarMenu, { type AuthMenuTranslations } from "./auth-avatar-menu";
import type { MapTranslations } from "./map-screen";

function getSystemPrefersDarkMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getInitialLocationStatus(): LocationStatus {
  if (typeof window === "undefined") {
    return "idle";
  }

  return "geolocation" in navigator ? "idle" : "unavailable";
}

type LeafletMapProps = {
  lang: string;
  initialUser: AuthUserSnapshot;
  initialZones: ZoneDTO[];
  authTranslations: AuthMenuTranslations;
  translations: MapTranslations;
};

type LocationStatus = "idle" | "success" | "denied" | "unavailable";

const USER_LOCATION_ZOOM = 16;

function RecenterOnUserPosition({
  position,
}: {
  position: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, USER_LOCATION_ZOOM, { animate: true });
  }, [map, position]);

  return null;
}

export default function LeafletMap({
  lang,
  initialUser,
  initialZones,
  authTranslations,
  translations,
}: LeafletMapProps) {
  const [isDarkMode, setIsDarkMode] = useState(getSystemPrefersDarkMode);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>(getInitialLocationStatus);

  const requestUserLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPosition([position.coords.latitude, position.coords.longitude]);
        setLocationStatus("success");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          return;
        }

        setLocationStatus("unavailable");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );
  };

  useEffect(() => {
    if (locationStatus !== "idle") {
      return;
    }

    let isCancelled = false;
    navigator.geolocation.getCurrentPosition(
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

        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          return;
        }

        setLocationStatus("unavailable");
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [locationStatus]);

  const tileUrl = isDarkMode ? MAP_TILE_STYLES.dark : MAP_TILE_STYLES.light;
  const toggleIcon = isDarkMode ? MAP_STYLE_ICON.dark : MAP_STYLE_ICON.light;
  const ariaLabel = isDarkMode
    ? translations.switchToLightMapStyle
    : translations.switchToDarkMapStyle;
  const locationNotice =
    locationStatus === "denied"
      ? translations.locationDeniedMessage
      : locationStatus === "unavailable"
        ? translations.locationUnavailableMessage
        : null;

  return (
    <div className="relative w-screen h-screen">
      {locationNotice ? (
        <p className="absolute top-4 left-4 z-[1000] max-w-80 rounded-md bg-black/75 px-3 py-2 text-sm text-white shadow-md">
          {locationNotice}
        </p>
      ) : null}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <AuthAvatarMenu
          lang={lang}
          initialUser={initialUser}
          translations={authTranslations}
        />
        <button
          type="button"
          onClick={() => setIsDarkMode((current) => !current)}
          className="rounded-full border border-black/20 bg-white/95 p-2 text-black shadow-md transition-colors hover:bg-white"
          aria-label={ariaLabel}
          title={isDarkMode ? translations.lightModeTitle : translations.darkModeTitle}
        >
          <Image src={toggleIcon} alt="" width={20} height={20} aria-hidden />
        </button>
      </div>
      <div className="absolute right-4 bottom-10 z-[1000]">
        <button
          type="button"
          onClick={requestUserLocation}
          className="grid h-11 w-11 place-items-center rounded-full border border-black/20 bg-white/95 text-black shadow-md transition-colors hover:bg-white"
          aria-label={translations.locateUserTitle}
          title={translations.locateUserTitle}
        >
          <Image src={LOCATE_USER_ICON} alt="" width={20} height={20} aria-hidden />
        </button>
      </div>

      <MapContainer
        center={LIMA_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        className="w-screen h-screen"
      >
        {userPosition ? <RecenterOnUserPosition position={userPosition} /> : null}
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
        {initialZones.map((zone) => {
          if (zone.geometry.type === "Point") {
            const [longitude, latitude] = zone.geometry.coordinates;

            return (
              <CircleMarker
                key={zone.id}
                center={[latitude, longitude]}
                radius={8}
                pathOptions={{
                  color: "#0f172a",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.9,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  {zone.name}
                </Tooltip>
              </CircleMarker>
            );
          }

          const outerRing = zone.geometry.coordinates[0];
          const positions: [number, number][] = outerRing.map(
            ([longitude, latitude]) => [latitude, longitude],
          );

          return (
            <Polygon
              key={zone.id}
              positions={positions}
              pathOptions={{
                color: "#0f172a",
                fillColor: "#22c55e",
                fillOpacity: 0.25,
                weight: 1.5,
              }}
            >
              <Tooltip sticky>{zone.name}</Tooltip>
            </Polygon>
          );
        })}
        {userPosition ? (
          <>
            <CircleMarker
              center={userPosition}
              radius={14}
              interactive={false}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.2,
                weight: 0,
              }}
            />
            <CircleMarker
              center={userPosition}
              radius={6}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#2563eb",
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {translations.userLocationLabel}
              </Tooltip>
            </CircleMarker>
          </>
        ) : null}
      </MapContainer>
    </div>
  );
}
