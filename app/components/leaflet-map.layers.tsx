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
import type { MapTranslations } from "./map-screen";
import type { ViewportQuery } from "./leaflet-map.types";
import {
  getCrimeHeatColor,
  getCrimeHeatIntensity,
  toViewportQuery,
} from "./leaflet-map.utils";

const USER_LOCATION_ZOOM = 16;

type Position = [number, number];

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

export function RecenterOnUserPosition({ position }: { position: Position }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, USER_LOCATION_ZOOM, { animate: true });
  }, [map, position]);

  return null;
}

type ZoneLayerProps = {
  zones: ZoneDTO[];
  translations: MapTranslations;
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
}: {
  zone: PointZoneDTO;
  heatColor: string;
  heatIntensity: number;
  translations: MapTranslations;
}) {
  const [longitude, latitude] = zone.geometry.coordinates;
  const center: Position = [latitude, longitude];
  const tooltipText = getCrimeTooltipText(zone, translations);
  const radiusM = zone.geometry.radiusM;
  const outerRadiusM = Math.round(radiusM * 1.6);
  const coreRadiusM = Math.max(18, Math.round(radiusM * 0.2));

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
          fillOpacity: 0.07 * heatIntensity,
        }}
      />
      <Circle
        key={`${zone.id}-mid`}
        center={center}
        radius={radiusM}
        pathOptions={{
          stroke: false,
          fillColor: heatColor,
          fillOpacity: 0.2 * heatIntensity,
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
          fillOpacity: 0.45 * heatIntensity,
        }}
      />
      <CircleMarker
        key={`${zone.id}-hotspot`}
        center={center}
        radius={4}
        pathOptions={{
          color: "#ffffff",
          fillColor: heatColor,
          fillOpacity: 0.95,
          weight: 1.5,
        }}
      />
    </Fragment>
  );
}

function PolygonZone({
  zone,
  heatColor,
  translations,
}: {
  zone: PolygonZoneDTO;
  heatColor: string;
  translations: MapTranslations;
}) {
  const outerRing = zone.geometry.coordinates[0];
  const positions: Position[] = outerRing.map(([longitude, latitude]) => [
    latitude,
    longitude,
  ]);

  return (
    <Polygon
      key={zone.id}
      positions={positions}
      pathOptions={{
        color: "#0f172a",
        fillColor: heatColor,
        fillOpacity: 0.35,
        weight: 1.5,
      }}
    >
      <Tooltip sticky>{getCrimeTooltipText(zone, translations)}</Tooltip>
    </Polygon>
  );
}

export function ZoneLayer({ zones, translations }: ZoneLayerProps) {
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
          color: "#3b82f6",
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
          weight: 0,
        }}
      />
      <CircleMarker
        center={userPosition}
        radius={6}
        pathOptions={{
          color: "#ffffff",
          fillColor: "#2563eb",
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
