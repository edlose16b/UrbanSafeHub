import type { ZoneGeometry, ZoneSnapshot } from "./zone";
import type { ZoneDetailSnapshot } from "./zone-detail";

export type CreateZoneRecord = {
  name: string;
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
  getVisibleDetailById(zoneId: string): Promise<ZoneDetailSnapshot | null>;
}

export interface ZoneCommandRepository {
  create(record: CreateZoneRecord): Promise<ZoneSnapshot>;
}
