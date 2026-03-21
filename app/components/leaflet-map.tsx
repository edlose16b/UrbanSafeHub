"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
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
  useUserLocation,
  useZoneCreation,
  useZonesByViewport,
} from "./leaflet-map.hooks";
import type { LeafletMapProps } from "./leaflet-map.types";

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
    <div className="absolute left-4 bottom-8 z-[1000] rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground shadow-md">
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
  drawMode: "Point" | "Polygon";
  pointRadiusM: number;
  polygonVertexCount: number;
  pointCenterReady: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  onAcceptedTermsChange: (checked: boolean) => void;
  onNameChange: (nextName: string) => void;
  onModeChange: (mode: "Point" | "Polygon") => void;
  onRadiusChange: (value: number) => void;
  onUndoPolygonPoint: () => void;
  onClearDraft: () => void;
  onSubmit: () => Promise<boolean>;
  translations: LeafletMapProps["translations"];
};

function ZoneCreationPanel({
  isVisible,
  hasAcceptedTerms,
  zoneName,
  drawMode,
  pointRadiusM,
  polygonVertexCount,
  pointCenterReady,
  isSubmitting,
  submitError,
  submitSuccess,
  onAcceptedTermsChange,
  onNameChange,
  onModeChange,
  onRadiusChange,
  onUndoPolygonPoint,
  onClearDraft,
  onSubmit,
  translations,
}: ZoneCreationPanelProps) {
  if (!isVisible) {
    return null;
  }

  const polygonPointsLabel = translations.zoneCreatePolygonPoints.replace(
    "{count}",
    String(polygonVertexCount),
  );
  const shouldDisableUndo = polygonVertexCount === 0;
  const isPointMode = drawMode === "Point";
  const isSubmitDisabled = isSubmitting || !zoneName.trim() || !hasAcceptedTerms;

  return (
    <form
      className="absolute top-4 left-4 z-[1000] w-80 rounded-xl border border-border bg-surface p-4 text-sm text-foreground shadow-md backdrop-blur-[1px]"
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
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onModeChange("Point")}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              isPointMode
                ? "border-blue-700 bg-blue-50 text-blue-900"
                : "border-border-muted bg-surface-muted text-text-muted"
            }`}
          >
            {translations.zoneCreateTypeRadius}
          </button>
          <button
            type="button"
            onClick={() => onModeChange("Polygon")}
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              !isPointMode
                ? "border-teal-700 bg-teal-50 text-teal-900"
                : "border-border-muted bg-surface-muted text-text-muted"
            }`}
          >
            {translations.zoneCreateTypePolygon}
          </button>
        </div>
      </div>

      {isPointMode ? (
        <>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium">
              {translations.zoneCreateRadiusLabel}
            </span>
            <input
              type="number"
              min={10}
              max={2000}
              step={10}
              value={pointRadiusM}
              onChange={(event) => onRadiusChange(Number(event.target.value))}
              className="w-full rounded-lg border border-border-muted bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-border"
            />
            <span className="mt-1 block text-xs text-text-secondary">
              {translations.zoneCreateRadiusHint}
            </span>
          </label>
          <p className="mt-3 text-xs text-text-muted">
            {pointCenterReady
              ? translations.zoneCreatePointReady
              : translations.zoneCreatePointHint}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs text-text-muted">
            {translations.zoneCreatePolygonHint}
          </p>
          <p className="mt-1 text-xs font-medium text-text-muted">{polygonPointsLabel}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onUndoPolygonPoint}
              disabled={shouldDisableUndo}
              className="rounded-lg border border-border-muted bg-surface-muted px-3 py-2 text-xs font-medium text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translations.zoneCreateUndoPoint}
            </button>
            <button
              type="button"
              onClick={onClearDraft}
              disabled={shouldDisableUndo}
              className="rounded-lg border border-border-muted bg-surface-muted px-3 py-2 text-xs font-medium text-text-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translations.zoneCreateClearDraft}
            </button>
          </div>
        </>
      )}

      {submitError ? (
        <p className="mt-3 rounded-lg bg-danger px-3 py-2 text-xs text-danger-foreground">
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
  const { userPosition, locationStatus, requestUserLocation } = useUserLocation();
  const isAuthenticated = !initialUser.isAnonymous;
  const isCreatePanelVisible = isAuthenticated && isCreateMode;
  const effectiveCanCreateZone = isCreatePanelVisible && hasAcceptedTerms;
  const {
    drawMode,
    zoneName,
    pointRadiusM,
    pointCenter,
    polygonVertices,
    isSubmitting,
    submitError,
    submitSuccess,
    setZoneName,
    onPointRadiusChange,
    handleDrawModeChange,
    handleMapClick,
    clearGeometry,
    resetCreationState,
    removeLastPolygonVertex,
    submit,
  } = useZoneCreation({
    canCreate: effectiveCanCreateZone,
    translations,
    onZoneCreated: prependZone,
  });

  const handleSetCreateMode = useCallback(
    (nextValue: boolean) => {
      setIsCreateMode(nextValue);
      if (!nextValue) {
        setHasAcceptedTerms(false);
        resetCreationState();
      }
    },
    [resetCreationState],
  );

  const handleAcceptedTermsChange = useCallback((checked: boolean) => {
    setHasAcceptedTerms(checked);
    if (!checked) {
      clearGeometry();
    }
  }, [clearGeometry]);

  const tileUrl = isDarkMode ? MAP_TILE_STYLES.dark : MAP_TILE_STYLES.light;
  const toggleIcon = isDarkMode ? MAP_STYLE_ICON.dark : MAP_STYLE_ICON.light;
  const themeAriaLabel = isDarkMode
    ? translations.switchToLightMapStyle
    : translations.switchToDarkMapStyle;
  const locationNotice =
    locationStatus === "denied"
      ? translations.locationDeniedMessage
      : locationStatus === "unavailable"
        ? translations.locationUnavailableMessage
        : null;

  return (
    <div className="relative w-screen h-screen">
      <LocationNotice locationNotice={locationNotice} />
      <ZoneCreationPanel
        isVisible={isCreatePanelVisible}
        hasAcceptedTerms={hasAcceptedTerms}
        zoneName={zoneName}
        drawMode={drawMode}
        pointRadiusM={pointRadiusM}
        polygonVertexCount={polygonVertices.length}
        pointCenterReady={pointCenter !== null}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        onAcceptedTermsChange={handleAcceptedTermsChange}
        onNameChange={setZoneName}
        onModeChange={handleDrawModeChange}
        onRadiusChange={onPointRadiusChange}
        onUndoPolygonPoint={removeLastPolygonVertex}
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
          <Image src={toggleIcon} alt="" width={20} height={20} aria-hidden />
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
          <Image src={LOCATE_USER_ICON} alt="" width={20} height={20} aria-hidden />
        </button>
      </div>

      <CrimeLegend
        title={translations.crimeLegendTitle}
        low={translations.crimeLegendLow}
        high={translations.crimeLegendHigh}
      />

      <MapContainer
        center={LIMA_CENTER}
        zoom={INITIAL_ZOOM}
        scrollWheelZoom
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
        <ZoneLayer zones={zones} translations={translations} />
        <ZoneCreationDraftLayer
          canCreate={isCreatePanelVisible}
          drawMode={drawMode}
          pointCenter={pointCenter}
          pointRadiusM={pointRadiusM}
          polygonVertices={polygonVertices}
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
