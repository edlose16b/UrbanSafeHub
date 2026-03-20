"use client";

import Image from "next/image";
import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import {
  INITIAL_ZOOM,
  LIMA_CENTER,
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

type LeafletMapProps = {
  lang: string;
  initialUser: AuthUserSnapshot;
  authTranslations: AuthMenuTranslations;
  translations: MapTranslations;
};

export default function LeafletMap({
  lang,
  initialUser,
  authTranslations,
  translations,
}: LeafletMapProps) {
  const [isDarkMode, setIsDarkMode] = useState(getSystemPrefersDarkMode);
  const tileUrl = isDarkMode ? MAP_TILE_STYLES.dark : MAP_TILE_STYLES.light;
  const toggleIcon = isDarkMode ? MAP_STYLE_ICON.dark : MAP_STYLE_ICON.light;
  const ariaLabel = isDarkMode
    ? translations.switchToLightMapStyle
    : translations.switchToDarkMapStyle;

  return (
    <div className="relative w-screen h-screen">
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

      <MapContainer
        center={LIMA_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        className="w-screen h-screen"
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
      </MapContainer>
    </div>
  );
}
