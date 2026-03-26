import type { ZoneSnapshot } from "../domain/zone";

export type ZoneDTO = {
  id: string;
  name: string;
  description: string | null;
  geometry: ZoneSnapshot["geometry"];
  crimeLevel: number | null;
  createdBy: string;
  createdAt: string;
};

export function toZoneDTO(snapshot: ZoneSnapshot): ZoneDTO {
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    geometry: snapshot.geometry,
    crimeLevel: snapshot.crimeLevel,
    createdBy: snapshot.createdBy,
    createdAt: snapshot.createdAt,
  };
}
