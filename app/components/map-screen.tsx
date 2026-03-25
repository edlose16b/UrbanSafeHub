"use client";

import dynamic from "next/dynamic";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { AuthMenuTranslations } from "./auth-avatar-menu";

export type MapTranslations = {
  projectName: string;
  switchToDarkMapStyle: string;
  switchToLightMapStyle: string;
  darkModeTitle: string;
  lightModeTitle: string;
  locateUserTitle: string;
  searchZonesLabel: string;
  searchZonesPlaceholder: string;
  searchZonesEmpty: string;
  searchZonesResultsTitle: string;
  filterToggleTitle: string;
  filterAll: string;
  filterDanger: string;
  filterModerate: string;
  filterSafe: string;
  legendCriticalRisk: string;
  legendModerateAlert: string;
  legendVerifiedSafe: string;
  mobileNavMap: string;
  mobileNavFilter: string;
  mobileNavLegend: string;
  mobileNavTheme: string;
  locationDeniedMessage: string;
  locationUnavailableMessage: string;
  userLocationLabel: string;
  crimeLegendTitle: string;
  crimeLegendLow: string;
  crimeLegendHigh: string;
  crimeTooltipNoData: string;
  crimeTooltipLevel: string;
  zoneCreatePanelTitle: string;
  zoneCreateNameLabel: string;
  zoneCreateNamePlaceholder: string;
  zoneCreateTypeLabel: string;
  zoneCreateTypeRadius: string;
  zoneCreateTypePolygon: string;
  zoneCreateRadiusLabel: string;
  zoneCreateRadiusHint: string;
  zoneCreatePointHint: string;
  zoneCreatePointReady: string;
  zoneCreatePolygonHint: string;
  zoneCreatePolygonDiameterExceeded: string;
  zoneCreatePolygonPoints: string;
  zoneCreateUndoPoint: string;
  zoneCreateClearDraft: string;
  zoneCreateSubmit: string;
  zoneCreateSubmitting: string;
  zoneCreateSuccess: string;
  zoneCreateNameRequired: string;
  zoneCreatePointRequired: string;
  zoneCreatePolygonRequired: string;
  zoneCreateOverlapError: string;
  zoneCreateFailedFallback: string;
  zoneCreateTermsAlert: string;
  zoneCreateTermsCheckbox: string;
  zoneCreateTermsRequired: string;
  zoneDetailLoading: string;
  zoneDetailClose: string;
  zoneDetailErrorFallback: string;
  zoneDetailTitle: string;
  zoneDetailTypeLabel: string;
  zoneDetailTypePoint: string;
  zoneDetailTypePolygon: string;
  zoneDetailRadiusLabel: string;
  zoneDetailVerticesLabel: string;
  zoneDetailCreatedByLabel: string;
  zoneDetailCreatedAtLabel: string;
  zoneDetailCrimeLabel: string;
  zoneDetailNoCrimeData: string;
  zoneDetailRatingsTitle: string;
  zoneDetailCommentsTitle: string;
  zoneDetailNoComments: string;
  zoneDetailNoData: string;
  zoneDetailCategoryLabel: string;
  zoneDetailCategoryCrime: string;
  zoneDetailCategoryLighting: string;
  zoneDetailCategoryFootTraffic: string;
  zoneDetailCategoryVigilance: string;
  zoneDetailCategoryCctv: string;
  zoneDetailSegmentMorning: string;
  zoneDetailSegmentAfternoon: string;
  zoneDetailSegmentNight: string;
  zoneDetailSegmentEarlyMorning: string;
  zoneDetailSegmentGeneral: string;
  zoneDetailStatusSafe: string;
  zoneDetailStatusModerate: string;
  zoneDetailStatusDanger: string;
  zoneDetailStatusUnknown: string;
  zoneDetailProfileTitle: string;
  zoneDetailProfileDayStronger: string;
  zoneDetailProfileNightStronger: string;
  zoneDetailProfileSteady: string;
  zoneDetailProfileInsufficientData: string;
  zoneDetailCommentsCountLabel: string;
  zoneDetailRatingsCountLabel: string;
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
