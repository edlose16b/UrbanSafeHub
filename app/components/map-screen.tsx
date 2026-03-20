"use client";

import dynamic from "next/dynamic";

export type MapTranslations = {
  switchToDarkMapStyle: string;
  switchToLightMapStyle: string;
  darkModeTitle: string;
  lightModeTitle: string;
};

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
});

type MapScreenProps = {
  translations: MapTranslations;
};

export default function MapScreen({ translations }: MapScreenProps) {
  return <LeafletMap translations={translations} />;
}
