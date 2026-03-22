export const LIMA_CENTER: [number, number] = [-12.0464, -77.0428];
export const INITIAL_ZOOM = 13;

/** Max great-circle distance between any two polygon vertices when creating a zone (meters). */
export const MAX_POLYGON_DIAMETER_M = 350;

/** Preset radii for point zones in the map UI (meters). */
export const POINT_RADIUS_OPTIONS_M = [50,100, 150, 200, 250, 300] as const;

/** Default point zone radius when opening the create panel (meters). */
export const DEFAULT_POINT_RADIUS_M = 150;

export const MAP_TILE_STYLES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
} as const;

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_STYLE_ICON = {
  light: "/icons/moon.svg",
  dark: "/icons/sun.svg",
} as const;

export const LOCATE_USER_ICON = "/icons/locate.svg";
