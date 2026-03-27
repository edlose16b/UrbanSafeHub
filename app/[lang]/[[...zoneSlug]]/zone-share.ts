import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { Locale } from "../../i18n/config";
import type { Dictionary } from "../../i18n/get-dictionary";
import { getZoneSeverity, getZoneTrendSummary } from "@/features/zones/presentation/utils/leaflet-map.utils";
import { buildMapPath } from "./zone-route";

export function getOpenGraphLocale(locale: Locale): string {
  return locale === "es" ? "es_PE" : "en_US";
}

function getZoneStatusLabel(detail: ZoneDetailDTO, dictionary: Dictionary): string {
  const severity = getZoneSeverity(detail.zone.crimeLevel);

  if (severity === "safe") {
    return dictionary.map.zoneDetailStatusSafe;
  }

  if (severity === "moderate") {
    return dictionary.map.zoneDetailStatusModerate;
  }

  if (severity === "danger") {
    return dictionary.map.zoneDetailStatusDanger;
  }

  return dictionary.map.zoneDetailStatusUnknown;
}

function getZoneStatusSummary(detail: ZoneDetailDTO, dictionary: Dictionary): string {
  const severity = getZoneSeverity(detail.zone.crimeLevel);

  if (severity === "safe") {
    return dictionary.map.zoneDetailStatusSummarySafe;
  }

  if (severity === "moderate") {
    return dictionary.map.zoneDetailStatusSummaryModerate;
  }

  if (severity === "danger") {
    return dictionary.map.zoneDetailStatusSummaryDanger;
  }

  return dictionary.map.zoneDetailStatusSummaryUnknown;
}

export function getZoneProfileLabel(
  detail: ZoneDetailDTO,
  dictionary: Dictionary,
): string {
  const trendSummary = getZoneTrendSummary(detail);

  if (trendSummary.direction === "day_stronger") {
    return dictionary.map.zoneDetailProfileDayStronger;
  }

  if (trendSummary.direction === "night_stronger") {
    return dictionary.map.zoneDetailProfileNightStronger;
  }

  if (trendSummary.direction === "steady") {
    return dictionary.map.zoneDetailProfileSteady;
  }

  return dictionary.map.zoneDetailProfileInsufficientData;
}

export function getZoneScoreLabel(detail: ZoneDetailDTO, dictionary: Dictionary): string {
  if (detail.zone.crimeLevel === null) {
    return dictionary.metadata.share.zonePendingSignals;
  }

  return `${detail.zone.crimeLevel.toFixed(1)}/5`;
}

export function buildMapMetadataImagePath(lang: Locale): string {
  return `${buildMapPath(lang)}/opengraph-image`;
}

export function buildZoneMetadataImagePath(lang: Locale, detail: ZoneDetailDTO): string {
  return `/${lang}/share/zone/${detail.zone.id}/opengraph-image`;
}

export function buildMapImageAlt(dictionary: Dictionary): string {
  return dictionary.metadata.share.mapImageAlt;
}

export function buildZoneImageAlt(detail: ZoneDetailDTO, dictionary: Dictionary): string {
  return dictionary.metadata.share.zoneImageAlt.replace("{zoneName}", detail.zone.name);
}

export function buildZoneMetadataDescription(
  detail: ZoneDetailDTO,
  dictionary: Dictionary,
): string {
  const zoneDescription = detail.zone.description?.trim();

  if (zoneDescription) {
    return zoneDescription;
  }

  return `${getZoneStatusLabel(detail, dictionary)}. ${getZoneStatusSummary(detail, dictionary)}`;
}
