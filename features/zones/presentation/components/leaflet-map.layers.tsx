import { Fragment, useEffect } from "react";
import {
  Circle,
  CircleMarker,
  Polygon,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { ZoneDTO } from "@/lib/zones/application/zone-dto";
import type { MapTranslations } from "../types/map-translations";
import type { LatLngPosition, ViewportQuery } from "../types/leaflet-map.types";
import {
  getCrimeHeatColor,
  getCrimeHeatIntensity,
  getZoneSeverity,
  toViewportQuery,
} from "../utils/leaflet-map.utils";

const USER_LOCATION_ZOOM = 16;
const DRAFT_ZONE_STROKE = "#ff5352";
const DRAFT_ZONE_FILL = "#ff7a74";
const DRAFT_ZONE_CENTER = "#ffcb8d";
const POLYGON_OUTLINE = "#393939";
const USER_LOCATION_OUTER = "#4ae183";
const USER_LOCATION_CORE = "#ffcb8d";

type Position = [number, number];
type FocusTarget = {
  position: Position;
  zoom?: number;
};

type ViewportZoneFetcherProps = {
  onViewportInteractionStarted: () => void;
  onViewportChanged: (query: ViewportQuery) => void;
};

export function ViewportZoneFetcher({
  onViewportInteractionStarted,
  onViewportChanged,
}: ViewportZoneFetcherProps) {
  const map = useMap();

  useMapEvents({
    movestart() {
      onViewportInteractionStarted();
    },
    moveend() {
      onViewportChanged(toViewportQuery(map));
    },
    zoomstart() {
      onViewportInteractionStarted();
    },
    zoomend() {
      onViewportChanged(toViewportQuery(map));
    },
  });

  useEffect(() => {
    onViewportChanged(toViewportQuery(map));
  }, [map, onViewportChanged]);

  return null;
}

export function RecenterOnUserPosition({
  position,
  requestKey,
}: {
  position: Position;
  requestKey: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, USER_LOCATION_ZOOM, { animate: true });
  }, [map, position, requestKey]);

  return null;
}

export function FocusMapTarget({ target }: { target: FocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo(target.position, target.zoom ?? Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.8,
    });
  }, [map, target]);

  return null;
}

type ZoneCreationInteractionLayerProps = {
  canCreate: boolean;
  onMapClick: (position: LatLngPosition) => void;
};

export function ZoneCreationInteractionLayer({
  canCreate,
  onMapClick,
}: ZoneCreationInteractionLayerProps) {
  useMapEvents({
    click(event) {
      if (!canCreate) {
        return;
      }

      onMapClick([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
}

type ZoneCreationDraftLayerProps = {
  canCreate: boolean;
  pointCenter: LatLngPosition | null;
  pointRadiusM: number;
};

export function ZoneCreationDraftLayer({
  canCreate,
  pointCenter,
  pointRadiusM,
}: ZoneCreationDraftLayerProps) {
  if (!canCreate) {
    return null;
  }

  if (!pointCenter) {
    return null;
  }

  return (
    <>
      <Circle
        center={pointCenter}
        radius={pointRadiusM}
        pathOptions={{
          color: DRAFT_ZONE_STROKE,
          fillColor: DRAFT_ZONE_FILL,
          fillOpacity: 0.28,
          weight: 2,
        }}
      />
      <CircleMarker
        center={pointCenter}
        radius={5}
        pathOptions={{
          color: "#ffffff",
          fillColor: DRAFT_ZONE_CENTER,
          fillOpacity: 1,
          weight: 2,
        }}
      />
    </>
  );
}

type ZoneLayerProps = {
  zones: ZoneDTO[];
  translations: MapTranslations;
  onZoneSelect?: (zoneId: string) => void;
  selectedZoneId?: string | null;
};

type PointZoneDTO = ZoneDTO & {
  geometry: Extract<ZoneDTO["geometry"], { type: "Point" }>;
};

type PolygonZoneDTO = ZoneDTO & {
  geometry: Extract<ZoneDTO["geometry"], { type: "Polygon" }>;
};

function isPointZone(zone: ZoneDTO): zone is PointZoneDTO {
  return zone.geometry.type === "Point";
}

function isPolygonZone(zone: ZoneDTO): zone is PolygonZoneDTO {
  return zone.geometry.type === "Polygon";
}

function getCrimeTooltipText(zone: ZoneDTO, translations: MapTranslations): string {
  if (zone.crimeLevel === null) {
    return `${zone.name} • ${translations.crimeTooltipNoData}`;
  }

  return `${zone.name} • ${translations.crimeTooltipLevel} ${zone.crimeLevel.toFixed(2)}/5`;
}

function PointZone({
  zone,
  heatColor,
  heatIntensity,
  translations,
  onZoneSelect,
  selectedZoneId,
}: {
  zone: PointZoneDTO;
  heatColor: string;
  heatIntensity: number;
  translations: MapTranslations;
  onZoneSelect?: (zoneId: string) => void;
  selectedZoneId?: string | null;
}) {
  const [longitude, latitude] = zone.geometry.coordinates;
  const center: Position = [latitude, longitude];
  const tooltipText = getCrimeTooltipText(zone, translations);
  const radiusM = zone.geometry.radiusM;
  const outerRadiusM = Math.round(radiusM * 1.6);
  const coreRadiusM = Math.max(18, Math.round(radiusM * 0.2));
  const isSelected = zone.id === selectedZoneId;
  const severity = getZoneSeverity(zone.crimeLevel);
  const midFillOpacity = severity === "danger" ? 0.28 : severity === "moderate" ? 0.22 : 0.18;

  return (
    <Fragment key={zone.id}>
      <Circle
        key={`${zone.id}-outer`}
        center={center}
        radius={outerRadiusM}
        interactive={false}
        pathOptions={{
          stroke: false,
          fillColor: heatColor,
          fillOpacity: (severity === "danger" ? 0.12 : 0.09) * heatIntensity,
        }}
      />
      <Circle
        key={`${zone.id}-mid`}
        center={center}
        radius={radiusM}
        eventHandlers={
          onZoneSelect
            ? {
                click() {
                  onZoneSelect(zone.id);
                },
              }
            : undefined
        }
        pathOptions={{
          color: isSelected ? "#e5e2e1" : heatColor,
          stroke: isSelected,
          fillColor: heatColor,
          fillOpacity: midFillOpacity * heatIntensity,
          weight: isSelected ? 1.2 : 0,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          {tooltipText}
        </Tooltip>
      </Circle>
      <Circle
        key={`${zone.id}-core`}
        center={center}
        radius={coreRadiusM}
        interactive={false}
        pathOptions={{
          stroke: false,
          fillColor: heatColor,
          fillOpacity: (severity === "safe" ? 0.78 : 0.52) * heatIntensity,
        }}
      />
      <CircleMarker
        key={`${zone.id}-hotspot`}
        center={center}
        radius={4}
        pathOptions={{
          stroke: false,
          fillColor: heatColor,
          fillOpacity: 0.95,
        }}
      />
    </Fragment>
  );
}

function PolygonZone({
  zone,
  heatColor,
  translations,
  onZoneSelect,
  selectedZoneId,
}: {
  zone: PolygonZoneDTO;
  heatColor: string;
  translations: MapTranslations;
  onZoneSelect?: (zoneId: string) => void;
  selectedZoneId?: string | null;
}) {
  const outerRing = zone.geometry.coordinates[0];
  const positions: Position[] = outerRing.map(([longitude, latitude]) => [
    latitude,
    longitude,
  ]);
  const isSelected = zone.id === selectedZoneId;
  const severity = getZoneSeverity(zone.crimeLevel);

  return (
    <Polygon
      key={zone.id}
      positions={positions}
      pathOptions={{
        color: isSelected ? "#e5e2e1" : POLYGON_OUTLINE,
        fillColor: heatColor,
        fillOpacity: severity === "danger" ? 0.42 : severity === "moderate" ? 0.34 : 0.28,
        weight: isSelected ? 2 : 1.5,
      }}
      eventHandlers={
        onZoneSelect
          ? {
              click() {
                onZoneSelect(zone.id);
              },
            }
          : undefined
      }
    >
      <Tooltip sticky>{getCrimeTooltipText(zone, translations)}</Tooltip>
    </Polygon>
  );
}

export function ZoneLayer({
  zones,
  translations,
  onZoneSelect,
  selectedZoneId,
}: ZoneLayerProps) {
  return (
    <>
      {zones.map((zone) => {
        const heatColor = getCrimeHeatColor(zone.crimeLevel);
        const heatIntensity = getCrimeHeatIntensity(zone.crimeLevel);

        if (isPointZone(zone)) {
          return (
            <PointZone
              key={zone.id}
              zone={zone}
              heatColor={heatColor}
              heatIntensity={heatIntensity}
              translations={translations}
              onZoneSelect={onZoneSelect}
              selectedZoneId={selectedZoneId}
            />
          );
        }

        if (!isPolygonZone(zone)) {
          return null;
        }

        return (
          <PolygonZone
            key={zone.id}
            zone={zone}
            heatColor={heatColor}
            translations={translations}
            onZoneSelect={onZoneSelect}
            selectedZoneId={selectedZoneId}
          />
        );
      })}
    </>
  );
}

export function UserLocationLayer({
  userPosition,
  userLocationLabel,
}: {
  userPosition: Position;
  userLocationLabel: string;
}) {
  return (
    <>
      <CircleMarker
        center={userPosition}
        radius={14}
        interactive={false}
        pathOptions={{
          color: USER_LOCATION_OUTER,
          fillColor: USER_LOCATION_OUTER,
          fillOpacity: 0.22,
          weight: 0,
        }}
      />
      <CircleMarker
        center={userPosition}
        radius={6}
        pathOptions={{
          color: "#ffffff",
          fillColor: USER_LOCATION_CORE,
          fillOpacity: 1,
          weight: 2,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]}>
          {userLocationLabel}
        </Tooltip>
      </CircleMarker>
    </>
  );
}
