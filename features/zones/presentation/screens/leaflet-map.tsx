"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { CITY_OPTIONS, type CityOption } from "@/app/constants/cities";
import AuthAvatarMenu from "@/features/auth/presentation/components/auth-avatar-menu";
import { MapContainer, TileLayer } from "react-leaflet";
import {
  INITIAL_ZOOM,
  LIMA_CENTER,
  LOCATE_USER_ICON,
  MAP_STYLE_ICON,
  MAP_TILE_STYLES,
  TILE_ATTRIBUTION,
} from "@/app/constants/map";
import { CitySwitcher } from "../components/city-switcher";
import { CreateZoneButton } from "../components/create-zone-button";
import {
  FocusMapTarget,
  RecenterOnUserPosition,
  UserLocationLayer,
  ViewportZoneFetcher,
  ZoneCreationDraftLayer,
  ZoneCreationInteractionLayer,
  ZoneLayer,
} from "../components/leaflet-map.layers";
import {
  useMapTheme,
  useSelectedZoneDetail,
  useUserLocation,
  useZoneCreation,
  useZonesByViewport,
} from "../hooks/leaflet-map.hooks";
import type { LeafletMapProps } from "../types/leaflet-map.types";
import { ZoneDetailCard } from "../components/zone-detail-card";
import {
  getZoneCenter,
  zoneMatchesFilter,
  type ZoneFilterKey,
} from "../utils/leaflet-map.utils";
import { ZoneCreationForm } from "../components/zone-creation-form";

function LocationNotice({
  locationNotice,
}: {
  locationNotice: string | null;
}) {
  if (!locationNotice) {
    return null;
  }

  return (
    <p className="glass-panel ghost-outline absolute top-40 left-4 z-[1000] max-w-84 rounded-2xl px-3.5 py-2.5 text-sm text-foreground md:top-24">
      {locationNotice}
    </p>
  );
}

function CrimeLegend({
  title,
  translations,
  isVisible,
}: {
  title: string;
  translations: LeafletMapProps["translations"];
  isVisible: boolean;
}) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="glass-panel ghost-outline absolute right-4 bottom-24 z-[1000] rounded-[1.15rem] px-3.5 py-3 text-xs text-foreground md:bottom-8">
      <div className="mb-2 font-display text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-map-danger shadow-[0_0_14px_rgba(147,0,10,0.35)]" />
          <span className="text-text-secondary">{translations.legendCriticalRisk}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-secondary-container shadow-[0_0_14px_rgba(255,185,92,0.3)]" />
          <span className="text-text-secondary">{translations.legendModerateAlert}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-tertiary shadow-[0_0_14px_rgba(74,225,131,0.35)]" />
          <span className="text-text-secondary">{translations.legendVerifiedSafe}</span>
        </div>
      </div>
    </div>
  );
}

function FilterBar({
  activeFilter,
  onFilterChange,
  translations,
  className,
}: {
  activeFilter: ZoneFilterKey;
  onFilterChange: (nextValue: ZoneFilterKey) => void;
  translations: LeafletMapProps["translations"];
  className?: string;
}) {
  const options: { key: ZoneFilterKey; label: string }[] = [
    { key: "all", label: translations.filterAll },
    { key: "danger", label: translations.filterDanger },
    { key: "moderate", label: translations.filterModerate },
    { key: "safe", label: translations.filterSafe },
  ];

  return (
    <div className={className}>
      <div className="glass-panel ghost-outline flex flex-wrap items-center gap-2 rounded-full px-2 py-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onFilterChange(option.key)}
            className={`rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
              activeFilter === option.key
                ? "primary-glow text-primary-foreground"
                : "text-text-secondary hover:bg-surface-high"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
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
  const [activeFilter, setActiveFilter] = useState<ZoneFilterKey>("all");
  const [isFilterBarVisible, setIsFilterBarVisible] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(true);
  const [activeCity, setActiveCity] = useState<CityOption>(CITY_OPTIONS[0]);
  const [focusTarget, setFocusTarget] = useState<{
    position: [number, number];
    zoom?: number;
  } | null>(null);
  const { zones, prependZone, scheduleZoneFetch, cancelScheduledZoneFetch } =
    useZonesByViewport();
  const {
    selectedZoneDetail,
    isZoneDetailLoading,
    zoneDetailError,
    selectZone,
    clearSelectedZone,
    refreshSelectedZone,
  } = useSelectedZoneDetail({
    detailFetchFailedFallback: translations.zoneDetailErrorFallback,
  });
  const { userPosition, locationStatus, requestUserLocation } = useUserLocation();
  const isAuthenticated = !initialUser.isAnonymous;
  const isCreatePanelVisible = isAuthenticated && isCreateMode;
  const effectiveCanCreateZone = isCreatePanelVisible && hasAcceptedTerms;

  function handleSetCreateMode(nextValue: boolean) {
    setIsCreateMode(nextValue);
    if (nextValue) {
      clearSelectedZone();
    }
    if (!nextValue) {
      setHasAcceptedTerms(false);
      resetCreationState();
    }
  }

  const {
    zoneName,
    zoneDescription,
    pointRadiusM,
    pointCenter,
    crimeScores,
    footTrafficScores,
    infrastructureScores,
    isSubmitting,
    submitError,
    submitSuccess,
    setZoneName,
    setZoneDescription,
    onPointRadiusChange,
    onMetricScoreChange,
    onInfrastructureScoreChange,
    handleMapClick,
    clearGeometry,
    resetCreationState,
    submit,
  } = useZoneCreation({
    canCreate: effectiveCanCreateZone,
    existingZones: zones,
    translations,
    onZoneCreated: prependZone,
    onSubmitSuccess: () => handleSetCreateMode(false),
  });

  const handleAcceptedTermsChange = useCallback(
    (checked: boolean) => {
      setHasAcceptedTerms(checked);
      if (!checked) {
        clearGeometry();
      }
    },
    [clearGeometry],
  );

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
  const filteredZones = useMemo(
    () => zones.filter((zone) => zoneMatchesFilter(zone, activeFilter)),
    [activeFilter, zones],
  );
  const selectedZoneId = selectedZoneDetail?.zone.id ?? null;

  const handleZoneSelect = useCallback(
    (zoneId: string) => {
      const zone = zones.find((candidate) => candidate.id === zoneId);
      if (zone) {
        setFocusTarget({
          position: getZoneCenter(zone.geometry),
        });
      }
      selectZone(zoneId);
    },
    [selectZone, zones],
  );

  const handleCitySelect = useCallback(
    (city: CityOption) => {
      setActiveCity(city);
      clearSelectedZone();
      setIsFilterBarVisible(false);
      setFocusTarget({
        position: city.center,
        zoom: city.zoom,
      });
    },
    [clearSelectedZone],
  );

  const zoneSelectHandler = useMemo(() => {
    if (effectiveCanCreateZone) {
      return undefined;
    }

    return handleZoneSelect;
  }, [effectiveCanCreateZone, handleZoneSelect]);

  const desktopAuthMenu = (
    <AuthAvatarMenu
      lang={lang}
      initialUser={initialUser}
      onSignedOut={() => handleSetCreateMode(false)}
      translations={authTranslations}
    />
  );
  const mobileAuthMenu = (
    <AuthAvatarMenu
      lang={lang}
      initialUser={initialUser}
      onSignedOut={() => handleSetCreateMode(false)}
      translations={authTranslations}
    />
  );
  const desktopCreateAction = (
    <CreateZoneButton
      lang={lang}
      isAuthenticated={isAuthenticated}
      isCreateMode={isCreateMode}
      onSetCreateMode={handleSetCreateMode}
      translations={authTranslations}
      className="ghost-outline hidden rounded-[0.9rem] bg-primary px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
    />
  );
  return (
    <div className="relative w-screen h-screen">
      <header className="absolute top-0 left-0 right-0 z-[1000]">
        <div className="glass-panel flex items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-black tracking-tight text-primary md:text-[1.75rem]">
              {translations.projectName}
            </h1>
          </div>

          <div className="relative hidden max-w-md flex-1 md:block">
            <CitySwitcher
              activeCity={activeCity}
              cities={CITY_OPTIONS}
              onSelect={handleCitySelect}
              translations={translations}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="md:hidden">{mobileAuthMenu}</div>
            <button
              type="button"
              onClick={() => setIsFilterBarVisible((current) => !current)}
              className="ghost-outline hidden rounded-[0.9rem] bg-surface-high px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:bg-surface-bright md:inline-flex"
            >
              {translations.filterToggleTitle}
            </button>
            {desktopCreateAction}
            <button
              type="button"
              onClick={toggleTheme}
              className="glass-panel ghost-outline hidden rounded-full p-2.5 text-foreground transition-colors hover:bg-surface-bright/70 md:inline-flex"
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
            <div className="hidden md:block">{desktopAuthMenu}</div>
          </div>
        </div>

        <div className="px-4 pb-2 md:hidden">
          <div className="relative">
            <CitySwitcher
              activeCity={activeCity}
              cities={CITY_OPTIONS}
              onSelect={handleCitySelect}
              translations={translations}
            />
          </div>
        </div>

        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          translations={translations}
          className={`${isFilterBarVisible ? "hidden md:block" : "hidden"} px-4 pb-3 md:px-6`}
        />
      </header>

      <LocationNotice locationNotice={locationNotice} />
      <ZoneCreationForm
        isVisible={isCreatePanelVisible}
        hasAcceptedTerms={hasAcceptedTerms}
        zoneName={zoneName}
        zoneDescription={zoneDescription}
        pointRadiusM={pointRadiusM}
        pointCenterReady={pointCenter !== null}
        crimeScores={crimeScores}
        footTrafficScores={footTrafficScores}
        infrastructureScores={infrastructureScores}
        isSubmitting={isSubmitting}
        submitError={submitError}
        submitSuccess={submitSuccess}
        isSubmitDisabled={isSubmitting || !zoneName.trim() || !hasAcceptedTerms}
        onAcceptedTermsChange={handleAcceptedTermsChange}
        onNameChange={setZoneName}
        onDescriptionChange={setZoneDescription}
        onRadiusChange={onPointRadiusChange}
        onMetricScoreChange={onMetricScoreChange}
        onInfrastructureScoreChange={onInfrastructureScoreChange}
        onClearDraft={clearGeometry}
        onCancel={() => handleSetCreateMode(false)}
        onSubmit={submit}
        translations={translations}
      />

      <div className="absolute right-4 bottom-24 z-[1000] md:bottom-10">
        <button
          type="button"
          onClick={requestUserLocation}
          className="glass-panel ghost-outline grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors hover:bg-surface-bright/70"
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
        translations={translations}
        isVisible={isLegendVisible}
      />
      <ZoneDetailCard
        lang={lang}
        detail={selectedZoneDetail}
        isLoading={isZoneDetailLoading}
        error={zoneDetailError}
        isAuthenticated={isAuthenticated}
        onClose={clearSelectedZone}
        onRefreshDetail={refreshSelectedZone}
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
        <FocusMapTarget target={focusTarget} />
        {userPosition ? <RecenterOnUserPosition position={userPosition} /> : null}
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
        <ZoneLayer
          zones={filteredZones}
          translations={translations}
          onZoneSelect={zoneSelectHandler}
          selectedZoneId={selectedZoneId}
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
