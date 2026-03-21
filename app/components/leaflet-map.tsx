"use client";

import Image from "next/image";
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
    <p className="absolute top-4 left-4 z-[1000] max-w-80 rounded-md bg-black/75 px-3 py-2 text-sm text-white shadow-md">
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
    <div className="absolute left-4 bottom-8 z-[1000] rounded-md border border-black/10 bg-white/95 px-3 py-2 text-xs text-slate-800 shadow-md">
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
  zoneName: string;
  drawMode: "Point" | "Polygon";
  pointRadiusM: number;
  polygonVertexCount: number;
  pointCenterReady: boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
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
  zoneName,
  drawMode,
  pointRadiusM,
  polygonVertexCount,
  pointCenterReady,
  isSubmitting,
  submitError,
  submitSuccess,
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
  const isSubmitDisabled = isSubmitting || !zoneName.trim();

  return (
    <form
      className="absolute top-4 left-4 z-[1000] w-80 rounded-xl border border-black/15 bg-white/95 p-4 text-sm text-slate-900 shadow-md backdrop-blur-[1px]"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <h2 className="text-sm font-semibold">{translations.zoneCreatePanelTitle}</h2>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium">
          {translations.zoneCreateNameLabel}
        </span>
        <input
          type="text"
          value={zoneName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={translations.zoneCreateNamePlaceholder}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-600"
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
                : "border-slate-300 bg-white text-slate-700"
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
                : "border-slate-300 bg-white text-slate-700"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-slate-600"
            />
            <span className="mt-1 block text-xs text-slate-600">
              {translations.zoneCreateRadiusHint}
            </span>
          </label>
          <p className="mt-3 text-xs text-slate-700">
            {pointCenterReady
              ? translations.zoneCreatePointReady
              : translations.zoneCreatePointHint}
          </p>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs text-slate-700">
            {translations.zoneCreatePolygonHint}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-800">{polygonPointsLabel}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onUndoPolygonPoint}
              disabled={shouldDisableUndo}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translations.zoneCreateUndoPoint}
            </button>
            <button
              type="button"
              onClick={onClearDraft}
              disabled={shouldDisableUndo}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translations.zoneCreateClearDraft}
            </button>
          </div>
        </>
      )}

      {submitError ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {submitSuccess}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
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
  const { zones, prependZone, scheduleZoneFetch, cancelScheduledZoneFetch } =
    useZonesByViewport();
  const { userPosition, locationStatus, requestUserLocation } = useUserLocation();
  const isAuthenticated = !initialUser.isAnonymous;
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
    removeLastPolygonVertex,
    submit,
  } = useZoneCreation({
    canCreate: isAuthenticated,
    translations,
    onZoneCreated: prependZone,
  });

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
        isVisible={isAuthenticated}
        zoneName={zoneName}
        drawMode={drawMode}
        pointRadiusM={pointRadiusM}
        polygonVertexCount={polygonVertices.length}
        pointCenterReady={pointCenter !== null}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
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
          translations={authTranslations}
        />
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-black/20 bg-white/95 p-2 text-black shadow-md transition-colors hover:bg-white"
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
          className="grid h-11 w-11 place-items-center rounded-full border border-black/20 bg-white/95 text-black shadow-md transition-colors hover:bg-white"
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
          canCreate={isAuthenticated}
          onMapClick={handleMapClick}
        />
        {userPosition ? <RecenterOnUserPosition position={userPosition} /> : null}
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
        <ZoneLayer zones={zones} translations={translations} />
        <ZoneCreationDraftLayer
          canCreate={isAuthenticated}
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
