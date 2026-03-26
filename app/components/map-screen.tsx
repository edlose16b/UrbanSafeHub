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
  zoneCreatePanelSubtitle: string;
  zoneCreateSectionBasic: string;
  zoneCreateSectionMetrics: string;
  zoneCreateSectionInfrastructure: string;
  zoneCreateNameLabel: string;
  zoneCreateNamePlaceholder: string;
  zoneCreateDescriptionLabel: string;
  zoneCreateDescriptionPlaceholder: string;
  zoneCreateDrawRadius: string;
  zoneCreateRedrawRadius: string;
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
  zoneCreateMetricCrime: string;
  zoneCreateMetricFootTraffic: string;
  zoneCreateMetricScaleLabel: string;
  zoneCreateMetricApplyAllDay: string;
  zoneCreateMetricCustomizeSchedule: string;
  zoneCreateMetricHideSchedule: string;
  zoneCreateMetricCustomizedSchedule: string;
  zoneCreateInfrastructureLighting: string;
  zoneCreateInfrastructureCctv: string;
  zoneCreateInfrastructureVigilance: string;
  zoneCreateInfrastructureCctvNone: string;
  zoneCreateInfrastructureCctvFew: string;
  zoneCreateInfrastructureCctvGood: string;
  zoneCreateInfrastructureCctvHint: string;
  zoneCreateLightingPlaceholder: string;
  zoneCreateScoreOption1: string;
  zoneCreateScoreOption2: string;
  zoneCreateScoreOption3: string;
  zoneCreateScoreOption4: string;
  zoneCreateScoreOption5: string;
  zoneCreateRatingsHint: string;
  zoneCreateRatingsRequired: string;
  zoneCreateCancel: string;
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
  zoneDetailDescriptionLabel: string;
  zoneDetailStreetViewLabel: string;
  zoneDetailStreetViewAlt: string;
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
  zoneDetailStatusSummarySafe: string;
  zoneDetailStatusSummaryModerate: string;
  zoneDetailStatusSummaryDanger: string;
  zoneDetailStatusSummaryUnknown: string;
  zoneDetailProfileTitle: string;
  zoneDetailProfileDayStronger: string;
  zoneDetailProfileNightStronger: string;
  zoneDetailProfileSteady: string;
  zoneDetailProfileInsufficientData: string;
  zoneDetailCommentsCountLabel: string;
  zoneDetailRatingsCountLabel: string;
  zoneDetailInfrastructureTitle: string;
  zoneDetailTrendCaption: string;
  zoneDetailMetadataTitle: string;
  zoneDetailVoteTitle: string;
  zoneDetailVoteSubtitleAnonymous: string;
  zoneDetailVoteSubtitleAuthenticated: string;
  zoneDetailVoteSegmentLabel: string;
  zoneDetailVoteOpen: string;
  zoneDetailVoteCurrentLabel: string;
  zoneDetailVoteAnonymousBadge: string;
  zoneDetailVoteExpand: string;
  zoneDetailVoteCollapse: string;
  zoneDetailVoteCrimeLabel: string;
  zoneDetailVoteLightingLabel: string;
  zoneDetailVoteFootTrafficLabel: string;
  zoneDetailVoteSubmit: string;
  zoneDetailVoteUpdate: string;
  zoneDetailVoteSubmitting: string;
  zoneDetailVoteSuccess: string;
  zoneDetailVoteErrorFallback: string;
  zoneDetailVoteOption1: string;
  zoneDetailVoteOption2: string;
  zoneDetailVoteOption3: string;
  zoneDetailVoteOption4: string;
  zoneDetailVoteOption5: string;
  zoneDetailVoteDetailTitle: string;
  zoneDetailVoteRequired: string;
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
