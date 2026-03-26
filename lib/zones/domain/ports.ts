import type { ZoneGeometry, ZoneSnapshot } from "./zone";
import type { ZoneDetailSnapshot } from "./zone-detail";
import type { CreateZoneRatingRecord } from "./validation";

export type CreateZoneRecord = {
  name: string;
  description: string | null;
  geometry: ZoneGeometry;
  ratings: CreateZoneRatingRecord[];
  createdBy: string;
};

export type ListVisibleNearCenterQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export type SubmitZoneRatingsRecord = {
  zoneId: string;
  userId: string | null;
  anonymousFingerprint: string | null;
  ratings: CreateZoneRatingRecord[];
};

export interface ZoneQueryRepository {
  listVisibleNearCenter(query: ListVisibleNearCenterQuery): Promise<ZoneSnapshot[]>;
  getVisibleDetailById(
    zoneId: string,
    viewerUserId?: string | null,
  ): Promise<ZoneDetailSnapshot | null>;
}

export interface ZoneCommandRepository {
  create(record: CreateZoneRecord): Promise<ZoneSnapshot>;
  submitRatings(record: SubmitZoneRatingsRecord): Promise<void>;
}
