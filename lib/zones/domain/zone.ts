export const ZONE_TYPES = ["intersection", "bus_stop"] as const;

export type ZoneType = (typeof ZONE_TYPES)[number];

export type GeoJsonPosition = [number, number];

export type GeoJsonPoint = {
  type: "Point";
  coordinates: GeoJsonPosition;
};

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoJsonPosition[][];
};

export type ZoneGeometry = GeoJsonPoint | GeoJsonPolygon;

export type ZoneSnapshot = {
  id: string;
  name: string;
  zoneType: ZoneType;
  geometry: ZoneGeometry;
  createdBy: string;
  createdAt: string;
};

export class Zone {
  constructor(private readonly snapshot: ZoneSnapshot) {}

  static fromSnapshot(snapshot: ZoneSnapshot): Zone {
    return new Zone(snapshot);
  }

  toSnapshot(): ZoneSnapshot {
    return this.snapshot;
  }
}
