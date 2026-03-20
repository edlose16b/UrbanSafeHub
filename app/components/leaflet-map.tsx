"use client";

import Image from "next/image";
import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  INITIAL_ZOOM,
  LIMA_CENTER,
  MAP_STYLE_ICON,
  MAP_TILE_STYLES,
  TILE_ATTRIBUTION,
} from "../constants/map";

function getSystemPrefersDarkMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function LeafletMap() {
  const [isDarkMode, setIsDarkMode] = useState(getSystemPrefersDarkMode);
  const tileUrl = isDarkMode ? MAP_TILE_STYLES.dark : MAP_TILE_STYLES.light;
  const toggleIcon = isDarkMode ? MAP_STYLE_ICON.dark : MAP_STYLE_ICON.light;
  const ariaLabel = isDarkMode
    ? "Switch to light map style"
    : "Switch to dark map style";

  return (
    <div className="relative w-screen h-screen">
      <button
        type="button"
        onClick={() => setIsDarkMode((current) => !current)}
        className="absolute top-4 right-4 z-[1000] rounded-full border border-black/20 bg-white/95 p-2 text-black shadow-md transition-colors hover:bg-white"
        aria-label={ariaLabel}
        title={isDarkMode ? "Light mode" : "Dark mode"}
      >
        <Image src={toggleIcon} alt="" width={20} height={20} aria-hidden />
      </button>

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
