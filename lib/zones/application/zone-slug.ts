type ZoneSlugSource = {
  id: string;
  name: string;
};

const ZONE_SLUG_SEPARATOR = "--";
const FALLBACK_ZONE_NAME_SLUG = "zone";

export function slugifyZoneName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || FALLBACK_ZONE_NAME_SLUG;
}

export function buildZoneSlug(zone: ZoneSlugSource): string {
  return `${slugifyZoneName(zone.name)}${ZONE_SLUG_SEPARATOR}${zone.id}`;
}

export function buildZonePath(lang: string, zone: ZoneSlugSource): string {
  return `/${lang}/${buildZoneSlug(zone)}`;
}

export function parseZoneSlug(
  zoneSlug: string,
): { zoneId: string; nameSlug: string } | null {
  const normalized = zoneSlug.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const separatorIndex = normalized.lastIndexOf(ZONE_SLUG_SEPARATOR);

  if (separatorIndex <= 0) {
    return null;
  }

  const nameSlug = normalized.slice(0, separatorIndex).replace(/^-+|-+$/g, "");
  const zoneId = normalized.slice(separatorIndex + ZONE_SLUG_SEPARATOR.length).trim();

  if (!nameSlug || !zoneId) {
    return null;
  }

  return {
    zoneId,
    nameSlug,
  };
}

export function resolveZonePathSelection(
  pathname: string,
  lang: string,
): { zoneId: string; zoneSlug: string } | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 1 && segments[0] === lang) {
    return null;
  }

  if (segments.length !== 2 || segments[0] !== lang) {
    return null;
  }

  const zoneSlug = segments[1] ?? "";
  const parsedZoneSlug = parseZoneSlug(zoneSlug);

  if (!parsedZoneSlug) {
    return null;
  }

  return {
    zoneId: parsedZoneSlug.zoneId,
    zoneSlug,
  };
}
