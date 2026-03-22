"use client";

import Image from "next/image";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
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

const POINT_RADIUS_OPTIONS_M = [100, 150, 200, 250, 300] as const;

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

type SegmentKey = "morning" | "afternoon" | "night" | "early_morning";

const SEGMENT_ORDER: SegmentKey[] = [
  "morning",
  "afternoon",
  "night",
  "early_morning",
];

function formatDateLabel(isoString: string, locale: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAggregateValue(avgScore: number | null, ratingsCount: number): string {
  if (avgScore === null || ratingsCount <= 0) {
    return "—";
  }

  return `${avgScore.toFixed(2)} (${ratingsCount})`;
}

function resolveCategoryLabel(
  categorySlug: string,
  translations: LeafletMapProps["translations"],
): string {
  if (categorySlug === "crime") {
    return translations.zoneDetailCategoryCrime;
  }

  if (categorySlug === "lighting") {
    return translations.zoneDetailCategoryLighting;
  }

  if (categorySlug === "foot_traffic") {
    return translations.zoneDetailCategoryFootTraffic;
  }

  return categorySlug;
}

function ZoneDetailCard({
  lang,
  detail,
  isLoading,
  error,
  onClose,
  translations,
}: {
  lang: string;
  detail: ZoneDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  translations: LeafletMapProps["translations"];
}) {
  if (!isLoading && !error && !detail) {
    return null;
  }

  const locale = lang === "es" ? "es-PE" : "en-US";
  const segmentLabelByKey: Record<SegmentKey, string> = {
    morning: translations.zoneDetailSegmentMorning,
    afternoon: translations.zoneDetailSegmentAfternoon,
    night: translations.zoneDetailSegmentNight,
    early_morning: translations.zoneDetailSegmentEarlyMorning,
  };

  let content: ReactNode = null;

  if (isLoading) {
    content = <p className="text-sm text-text-secondary">{translations.zoneDetailLoading}</p>;
  } else if (error) {
    content = <p className="text-sm text-danger-foreground">{error}</p>;
  } else if (detail) {
    const geometry = detail.zone.geometry;
    const geometryTypeLabel =
      geometry.type === "Point"
        ? translations.zoneDetailTypePoint
        : translations.zoneDetailTypePolygon;
    const vertexCount =
      geometry.type === "Polygon" ? Math.max(0, geometry.coordinates[0].length - 1) : 0;
    const createdAtLabel = formatDateLabel(detail.zone.createdAt, locale);
    const crimeLabel =
      detail.zone.crimeLevel === null
        ? translations.zoneDetailNoCrimeData
        : `${detail.zone.crimeLevel.toFixed(2)}/5`;

    const categoryOrder = ["crime", "lighting", "foot_traffic"];
    const categorySet = new Set(detail.aggregates.map((aggregate) => aggregate.categorySlug));
    for (const categorySlug of categoryOrder) {
      categorySet.add(categorySlug);
    }
    const categories = [...categorySet];

    const valueByCell = new Map<string, string>();
    for (const aggregate of detail.aggregates) {
      const segmentKey = aggregate.timeSegment ?? "general";
      const mapKey = `${aggregate.categorySlug}:${segmentKey}`;
      valueByCell.set(
        mapKey,
        formatAggregateValue(aggregate.avgScore, aggregate.ratingsCount),
      );
    }

    content = (
      <div className="space-y-4">
        <div className="rounded-lg border border-border p-3">
          <h3 className="text-base font-semibold text-foreground">{detail.zone.name}</h3>
          <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-text-secondary">
            <p>
              {translations.zoneDetailTypeLabel}: {geometryTypeLabel}
            </p>
            {geometry.type === "Point" ? (
              <p>
                {translations.zoneDetailRadiusLabel}: {geometry.radiusM}m
              </p>
            ) : (
              <p>
                {translations.zoneDetailVerticesLabel}: {vertexCount}
              </p>
            )}
            <p>
              {translations.zoneDetailCrimeLabel}: {crimeLabel}
            </p>
            <p>
              {translations.zoneDetailCreatedByLabel}: {detail.zone.createdBy}
            </p>
            <p>
              {translations.zoneDetailCreatedAtLabel}: {createdAtLabel}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <h4 className="text-sm font-semibold text-foreground">
            {translations.zoneDetailRatingsTitle}
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-border bg-surface-muted px-2 py-1 text-left">
                    {translations.zoneDetailCategoryLabel}
                  </th>
                  {SEGMENT_ORDER.map((segment) => (
                    <th
                      key={segment}
                      className="border border-border bg-surface-muted px-2 py-1 text-left"
                    >
                      {segmentLabelByKey[segment]}
                    </th>
                  ))}
                  <th className="border border-border bg-surface-muted px-2 py-1 text-left">
                    {translations.zoneDetailSegmentGeneral}
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((categorySlug) => (
                  <tr key={categorySlug}>
                    <td className="border border-border px-2 py-1 text-foreground">
                      {resolveCategoryLabel(categorySlug, translations)}
                    </td>
                    {SEGMENT_ORDER.map((segment) => (
                      <td
                        key={`${categorySlug}:${segment}`}
                        className="border border-border px-2 py-1 text-text-secondary"
                      >
                        {valueByCell.get(`${categorySlug}:${segment}`) ??
                          translations.zoneDetailNoData}
                      </td>
                    ))}
                    <td className="border border-border px-2 py-1 text-text-secondary">
                      {valueByCell.get(`${categorySlug}:general`) ??
                        translations.zoneDetailNoData}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border p-3">
          <h4 className="text-sm font-semibold text-foreground">
            {translations.zoneDetailCommentsTitle}
          </h4>
          {detail.comments.length === 0 ? (
            <p className="mt-2 text-xs text-text-secondary">
              {translations.zoneDetailNoComments}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {detail.comments.map((comment) => (
                <li key={comment.id} className="rounded-md bg-surface-muted px-2 py-2">
                  <p className="text-xs text-foreground">{comment.body}</p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {formatDateLabel(comment.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className="absolute right-4 bottom-4 left-4 z-[1000] max-h-[56vh] overflow-y-auto rounded-xl border border-border bg-surface-solid p-4 shadow-lg md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-[360px] md:max-h-[calc(100vh-2rem)]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{translations.zoneDetailTitle}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-surface-muted"
          aria-label={translations.zoneDetailClose}
          title={translations.zoneDetailClose}
        >
          {translations.zoneDetailClose}
        </button>
      </div>
      {content}
    </aside>
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
