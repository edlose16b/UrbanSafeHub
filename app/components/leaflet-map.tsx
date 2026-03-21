"use client";

import Image from "next/image";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  INITIAL_ZOOM,
  LIMA_CENTER,
  LOCATE_USER_ICON,
  MAP_STYLE_ICON,
  MAP_TILE_STYLES,
  TILE_ATTRIBUTION,
} from "../constants/map";
import AuthAvatarMenu from "./auth-avatar-menu";
import {
  RecenterOnUserPosition,
  UserLocationLayer,
  ViewportZoneFetcher,
  ZoneLayer,
} from "./leaflet-map.layers";
import { useMapTheme, useUserLocation, useZonesByViewport } from "./leaflet-map.hooks";
import type { LeafletMapProps } from "./leaflet-map.types";

function LocationNotice({
  locationNotice,
}: {
  locationNotice: string | null;
}) {
  if (!locationNotice) {
    return null;
  }

  return (
    <p className="absolute top-4 left-4 z-[1000] max-w-80 rounded-md bg-black/75 px-3 py-2 text-sm text-white shadow-md">
      {locationNotice}
    </p>
  );
}

function CrimeLegend({
  title,
  low,
  high,
}: {
  title: string;
  low: string;
  high: string;
}) {
  return (
    <div className="absolute left-4 bottom-8 z-[1000] rounded-md border border-black/10 bg-white/95 px-3 py-2 text-xs text-slate-800 shadow-md">
      <div className="mb-1 font-medium">{title}</div>
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-6 rounded bg-[#22c55e]" />
        <span>{low}</span>
        <span className="inline-block h-2 w-6 rounded bg-[#e11d48]" />
        <span>{high}</span>
      </div>
    </div>
  );
}

export default function LeafletMap({
  lang,
  initialUser,
  authTranslations,
  translations,
}: LeafletMapProps) {
  const { isDarkMode, toggleTheme } = useMapTheme();
  const { zones, scheduleZoneFetch, cancelScheduledZoneFetch } = useZonesByViewport();
  const { userPosition, locationStatus, requestUserLocation } = useUserLocation();

  const tileUrl = isDarkMode ? MAP_TILE_STYLES.dark : MAP_TILE_STYLES.light;
  const toggleIcon = isDarkMode ? MAP_STYLE_ICON.dark : MAP_STYLE_ICON.light;
  const themeAriaLabel = isDarkMode
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
      <LocationNotice locationNotice={locationNotice} />

      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <AuthAvatarMenu
          lang={lang}
          initialUser={initialUser}
          translations={authTranslations}
        />
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-black/20 bg-white/95 p-2 text-black shadow-md transition-colors hover:bg-white"
          aria-label={themeAriaLabel}
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

      <CrimeLegend
        title={translations.crimeLegendTitle}
        low={translations.crimeLegendLow}
        high={translations.crimeLegendHigh}
      />

      <MapContainer
        center={LIMA_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        className="w-screen h-screen"
      >
        <ViewportZoneFetcher
          onViewportInteractionStarted={cancelScheduledZoneFetch}
          onViewportChanged={scheduleZoneFetch}
        />
        {userPosition ? <RecenterOnUserPosition position={userPosition} /> : null}
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
        <ZoneLayer zones={zones} translations={translations} />
        {userPosition ? (
          <UserLocationLayer
            userPosition={userPosition}
            userLocationLabel={translations.userLocationLabel}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
