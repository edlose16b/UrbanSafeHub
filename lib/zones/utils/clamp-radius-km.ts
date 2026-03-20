export const MIN_RADIUS_KM = 0.1;
export const MAX_RADIUS_KM = 20;

export function clampRadiusKm(radiusKm: number): number {
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, radiusKm));
}
