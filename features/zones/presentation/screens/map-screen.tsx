"use client";

import dynamic from "next/dynamic";
import type { AuthMenuTranslations } from "@/features/auth/presentation/components/auth-avatar-menu";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { MapTranslations } from "../types/map-translations";

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
