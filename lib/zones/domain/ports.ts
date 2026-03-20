import type { ZoneGeometry, ZoneSnapshot, ZoneType } from "./zone";

export type CreateZoneRecord = {
  name: string;
  zoneType: ZoneType;
  geometry: ZoneGeometry;
  createdBy: string;
};

export type ListVisibleNearCenterQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export interface ZoneQueryRepository {
  listVisibleNearCenter(query: ListVisibleNearCenterQuery): Promise<ZoneSnapshot[]>;
}

export interface ZoneCommandRepository {
  create(record: CreateZoneRecord): Promise<ZoneSnapshot>;
}
