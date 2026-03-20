import type { ZoneSnapshot } from "../domain/zone";

export type ZoneDTO = {
  id: string;
  name: string;
  zoneType: ZoneSnapshot["zoneType"];
  geometry: ZoneSnapshot["geometry"];
  createdBy: string;
  createdAt: string;
};

export function toZoneDTO(snapshot: ZoneSnapshot): ZoneDTO {
  return {
    id: snapshot.id,
    name: snapshot.name,
    zoneType: snapshot.zoneType,
    geometry: snapshot.geometry,
    createdBy: snapshot.createdBy,
    createdAt: snapshot.createdAt,
  };
}
