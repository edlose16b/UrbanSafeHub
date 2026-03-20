"use client";

import dynamic from "next/dynamic";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
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
  authTranslations: AuthMenuTranslations;
  translations: MapTranslations;
};

export default function MapScreen({
  lang,
  initialUser,
  authTranslations,
  translations,
}: MapScreenProps) {
  return (
    <LeafletMap
      lang={lang}
      initialUser={initialUser}
      authTranslations={authTranslations}
      translations={translations}
    />
  );
}
