import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { MapTranslations } from "./map-screen";
import type { AuthMenuTranslations } from "./auth-avatar-menu";

export type LeafletMapProps = {
  lang: string;
  initialUser: AuthUserSnapshot;
  authTranslations: AuthMenuTranslations;
  translations: MapTranslations;
};

export type LocationStatus = "idle" | "success" | "denied" | "unavailable";

export type ViewportQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export type DrawMode = "Point" | "Polygon";

export type LatLngPosition = [number, number];
