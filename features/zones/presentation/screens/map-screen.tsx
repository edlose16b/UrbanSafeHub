"use client";

import dynamic from "next/dynamic";
import type { AuthMenuTranslations } from "@/features/auth/presentation/components/auth-avatar-menu";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { MapTranslations } from "../types/map-translations";

const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
});

type MapScreenProps = {
  lang: string;
  initialUser: AuthUserSnapshot;
  initialSelectedZoneDetail?: ZoneDetailDTO | null;
  authTranslations: AuthMenuTranslations;
  translations: MapTranslations;
};

export default function MapScreen({
  lang,
  initialUser,
  initialSelectedZoneDetail,
  authTranslations,
  translations,
}: MapScreenProps) {
  return (
    <LeafletMap
      lang={lang}
      initialUser={initialUser}
      initialSelectedZoneDetail={initialSelectedZoneDetail}
      authTranslations={authTranslations}
      translations={translations}
    />
  );
}
