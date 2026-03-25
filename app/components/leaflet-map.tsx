"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
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
  ZoneCreationDraftLayer,
  ZoneCreationInteractionLayer,
  ZoneLayer,
} from "./leaflet-map.layers";
import {
  useMapTheme,
  useSelectedZoneDetail,
  useUserLocation,
  useZoneCreation,
  useZonesByViewport,
} from "./leaflet-map.hooks";
import type { LeafletMapProps } from "./leaflet-map.types";
import { POINT_RADIUS_OPTIONS_M } from "@/app/constants/map";
import { ZoneDetailCard } from "./zone-detail-card";

function LocationNotice({
  locationNotice,
}: {
  locationNotice: string | null;
}) {
  if (!locationNotice) {
    return null;
  }

  return (
    <p className="absolute top-4 left-4 z-[1000] max-w-80 rounded-md bg-overlay px-3 py-2 text-sm text-white shadow-md">
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
    <div className="absolute left-4 bottom-8 z-[1000] rounded-md border border-border bg-surface-solid px-3 py-2 text-xs text-foreground shadow-md">
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

type ZoneCreationPanelProps = {
  isVisible: boolean;
  hasAcceptedTerms: boolean;
  zoneName: string;
  pointRadiusM: number;
  pointCenterReady: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  onAcceptedTermsChange: (checked: boolean) => void;
  onNameChange: (nextName: string) => void;
  onRadiusChange: (value: number) => void;
  onClearDraft: () => void;
  onSubmit: () => Promise<boolean>;
  translations: LeafletMapProps["translations"];
};

function ZoneCreationPanel({
  isVisible,
  hasAcceptedTerms,
  zoneName,
  pointRadiusM,
  pointCenterReady,
  isSubmitting,
  submitError,
  submitSuccess,
  onAcceptedTermsChange,
  onNameChange,
  onRadiusChange,
  onClearDraft,
  onSubmit,
  translations,
}: ZoneCreationPanelProps) {
  if (!isVisible) {
    return null;
  }

  const isSubmitDisabled = isSubmitting || !zoneName.trim() || !hasAcceptedTerms;

  return (
    <form
      className="absolute top-4 left-4 z-[1000] w-80 rounded-xl border border-border bg-surface-solid p-4 text-sm text-foreground shadow-md backdrop-blur-[1px]"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <h2 className="text-sm font-semibold">{translations.zoneCreatePanelTitle}</h2>
      <div className="mt-3 rounded-lg border border-warning-border bg-warning px-3 py-2 text-xs text-warning-foreground">
        <p>{translations.zoneCreateTermsAlert}</p>
        <label className="mt-2 flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={hasAcceptedTerms}
            onChange={(event) => onAcceptedTermsChange(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>{translations.zoneCreateTermsCheckbox}</span>
        </label>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium">
          {translations.zoneCreateNameLabel}
        </span>
        <input
          type="text"
          value={zoneName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={translations.zoneCreateNamePlaceholder}
          className="w-full rounded-lg border border-border-muted bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-border"
          maxLength={120}
        />
      </label>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium">{translations.zoneCreateTypeLabel}</p>
        <div className="rounded-lg border border-blue-700 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-900">
          {translations.zoneCreateTypeRadius}
        </div>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs font-medium">{translations.zoneCreateRadiusLabel}</p>
        <div className="grid grid-cols-3 gap-2">
          {POINT_RADIUS_OPTIONS_M.map((radiusOption) => (
            <button
              key={radiusOption}
              type="button"
              onClick={() => onRadiusChange(radiusOption)}
              className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                pointRadiusM === radiusOption
                  ? "border-blue-700 bg-blue-50 text-blue-900"
                  : "border-border-muted bg-surface-muted text-text-muted"
              }`}
              aria-pressed={pointRadiusM === radiusOption}
            >
              {radiusOption}m
            </button>
          ))}
        </div>
        <span className="mt-1 block text-xs text-text-secondary">
          {translations.zoneCreateRadiusHint}
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        {pointCenterReady
          ? translations.zoneCreatePointReady
          : translations.zoneCreatePointHint}
      </p>
      <button
        type="button"
        onClick={onClearDraft}
        disabled={!pointCenterReady}
        className="mt-3 w-full rounded-lg border border-border-muted bg-surface-muted px-3 py-2 text-xs font-medium text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        {translations.zoneCreateClearDraft}
      </button>

      {submitError ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-danger px-3 py-2 text-xs text-danger-foreground"
        >
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="mt-3 rounded-lg bg-success px-3 py-2 text-xs text-success-foreground">
          {submitSuccess}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="mt-4 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting
          ? translations.zoneCreateSubmitting
          : translations.zoneCreateSubmit}
      </button>
    </form>
  );
}

export default function LeafletMap({
  lang,
  initialUser,
  authTranslations,
  translations,
}: LeafletMapProps) {
  const { isDarkMode, toggleTheme } = useMapTheme();
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const { zones, prependZone, scheduleZoneFetch, cancelScheduledZoneFetch } =
    useZonesByViewport();
  const {
    selectedZoneDetail,
    isZoneDetailLoading,
    zoneDetailError,
    selectZone,
    clearSelectedZone,
  } = useSelectedZoneDetail({
    detailFetchFailedFallback: translations.zoneDetailErrorFallback,
  });
  const { userPosition, locationStatus, requestUserLocation } = useUserLocation();
  const isAuthenticated = !initialUser.isAnonymous;
  const isCreatePanelVisible = isAuthenticated && isCreateMode;
  const effectiveCanCreateZone = isCreatePanelVisible && hasAcceptedTerms;
  const {
    zoneName,
    pointRadiusM,
    pointCenter,
    isSubmitting,
    submitError,
    submitSuccess,
    setZoneName,
    onPointRadiusChange,
    handleMapClick,
    clearGeometry,
    resetCreationState,
    submit,
  } = useZoneCreation({
    canCreate: effectiveCanCreateZone,
    existingZones: zones,
    translations,
    onZoneCreated: prependZone,
  });

  const handleSetCreateMode = useCallback(
    (nextValue: boolean) => {
      setIsCreateMode(nextValue);
      if (nextValue) {
        clearSelectedZone();
      }
      if (!nextValue) {
        setHasAcceptedTerms(false);
        resetCreationState();
      }
    },
    [clearSelectedZone, resetCreationState],
  );

  const handleAcceptedTermsChange = useCallback((checked: boolean) => {
    setHasAcceptedTerms(checked);
    if (!checked) {
      clearGeometry();
    }
  }, [clearGeometry]);

  const tileUrl = isDarkMode ? MAP_TILE_STYLES.dark : MAP_TILE_STYLES.light;
  const toggleIcon = isDarkMode ? MAP_STYLE_ICON.dark : MAP_STYLE_ICON.light;
  const iconClassName = isDarkMode ? "brightness-0 invert" : "";
  const themeAriaLabel = isDarkMode
    ? translations.switchToLightMapStyle
    : translations.switchToDarkMapStyle;
  const locationNotice =
    locationStatus === "denied"
      ? translations.locationDeniedMessage
      : locationStatus === "unavailable"
        ? translations.locationUnavailableMessage
        : null;
  const zoneSelectHandler = useMemo(() => {
    if (effectiveCanCreateZone) {
      return undefined;
    }

    return selectZone;
  }, [effectiveCanCreateZone, selectZone]);

  return (
    <div className="relative w-screen h-screen">
      <LocationNotice locationNotice={locationNotice} />
      <ZoneCreationPanel
        isVisible={isCreatePanelVisible}
        hasAcceptedTerms={hasAcceptedTerms}
        zoneName={zoneName}
        pointRadiusM={pointRadiusM}
        pointCenterReady={pointCenter !== null}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        onAcceptedTermsChange={handleAcceptedTermsChange}
        onNameChange={setZoneName}
        onRadiusChange={onPointRadiusChange}
        onClearDraft={clearGeometry}
        onSubmit={submit}
        translations={translations}
      />

      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        <AuthAvatarMenu
          lang={lang}
          initialUser={initialUser}
          isCreateMode={isCreateMode}
          onSetCreateMode={handleSetCreateMode}
          translations={authTranslations}
        />
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-border bg-surface p-2 text-foreground shadow-md transition-colors hover:bg-surface-solid"
          aria-label={themeAriaLabel}
          title={isDarkMode ? translations.lightModeTitle : translations.darkModeTitle}
        >
          <Image
            src={toggleIcon}
            alt=""
            width={20}
            height={20}
            aria-hidden
            className={iconClassName}
          />
        </button>
      </div>

      <div className="absolute right-4 bottom-10 z-[1000]">
        <button
          type="button"
          onClick={requestUserLocation}
          className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-foreground shadow-md transition-colors hover:bg-surface-solid"
          aria-label={translations.locateUserTitle}
          title={translations.locateUserTitle}
        >
          <Image
            src={LOCATE_USER_ICON}
            alt=""
            width={20}
            height={20}
            aria-hidden
            className={iconClassName}
          />
        </button>
      </div>

      <CrimeLegend
        title={translations.crimeLegendTitle}
        low={translations.crimeLegendLow}
        high={translations.crimeLegendHigh}
      />
      <ZoneDetailCard
        lang={lang}
        detail={selectedZoneDetail}
        isLoading={isZoneDetailLoading}
        error={zoneDetailError}
        onClose={clearSelectedZone}
        translations={translations}
      />

      <MapContainer
        center={LIMA_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="w-screen h-screen"
      >
        <ViewportZoneFetcher
          onViewportInteractionStarted={cancelScheduledZoneFetch}
          onViewportChanged={scheduleZoneFetch}
        />
        <ZoneCreationInteractionLayer
          canCreate={effectiveCanCreateZone}
          onMapClick={handleMapClick}
        />
        {userPosition ? <RecenterOnUserPosition position={userPosition} /> : null}
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
        <ZoneLayer
          zones={zones}
          translations={translations}
          onZoneSelect={zoneSelectHandler}
        />
        <ZoneCreationDraftLayer
          canCreate={isCreatePanelVisible}
          pointCenter={pointCenter}
          pointRadiusM={pointRadiusM}
        />
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
