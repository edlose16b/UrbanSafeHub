import type { AuthMenuTranslations } from "@/features/auth/presentation/components/auth-avatar-menu";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import type { MapTranslations } from "./map-translations";

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

export type LatLngPosition = [number, number];
