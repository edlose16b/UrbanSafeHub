import type { ZoneGeometry, ZoneSnapshot, ZoneType } from "./zone";

export type CreateZoneRecord = {
  name: string;
  zoneType: ZoneType;
  geometry: ZoneGeometry;
  createdBy: string;
};

export interface ZoneQueryRepository {
  listVisible(): Promise<ZoneSnapshot[]>;
}

export interface ZoneCommandRepository {
  create(record: CreateZoneRecord): Promise<ZoneSnapshot>;
}
