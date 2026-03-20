"use client";

import dynamic from "next/dynamic";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { AuthMenuTranslations } from "./auth-avatar-menu";

export type MapTranslations = {
  switchToDarkMapStyle: string;
  switchToLightMapStyle: string;
  darkModeTitle: string;
  lightModeTitle: string;
  locateUserTitle: string;
  locationDeniedMessage: string;
  locationUnavailableMessage: string;
  userLocationLabel: string;
};

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
});

type MapScreenProps = {
  lang: string;
  initialUser: AuthUserSnapshot;
  initialZones: ZoneDTO[];
  authTranslations: AuthMenuTranslations;
  translations: MapTranslations;
};

export default function MapScreen({
  lang,
  initialUser,
  initialZones,
  authTranslations,
  translations,
}: MapScreenProps) {
  return (
    <LeafletMap
      lang={lang}
      initialUser={initialUser}
      initialZones={initialZones}
      authTranslations={authTranslations}
      translations={translations}
    />
  );
}
