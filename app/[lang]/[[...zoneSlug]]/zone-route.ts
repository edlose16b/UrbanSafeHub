import { notFound } from "next/navigation";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { buildZoneSlug, parseZoneSlug } from "@/lib/zones/application/zone-slug";
import { getVisibleZoneDetail } from "@/lib/zones/server/get-visible-zone-detail";

export type ZonePageParams = {
  lang: string;
  zoneSlug?: string[];
};

export type ZonePageProps = {
  params: Promise<ZonePageParams>;
};

export function resolveZoneSlugParam(zoneSlug?: string[]): string | null {
  if (!zoneSlug || zoneSlug.length === 0) {
    return null;
  }

  if (zoneSlug.length !== 1) {
    notFound();
  }

  return zoneSlug[0] ?? null;
}

export async function loadZoneDetailFromSlug(
  routeZoneSlug: string,
  viewerUserId?: string | null,
): Promise<ZoneDetailDTO>;
export async function loadZoneDetailFromSlug(
  routeZoneSlug: null,
  viewerUserId?: string | null,
): Promise<null>;
export async function loadZoneDetailFromSlug(
  routeZoneSlug: string | null,
  viewerUserId?: string | null,
): Promise<ZoneDetailDTO | null> {
  if (!routeZoneSlug) {
    return null;
  }

  const parsedZoneSlug = parseZoneSlug(routeZoneSlug);

  if (!parsedZoneSlug) {
    notFound();
  }

  const detail = await getVisibleZoneDetail(parsedZoneSlug.zoneId, viewerUserId);

  if (!detail) {
    notFound();
  }

  return detail;
}

export async function loadZoneDetailById(
  zoneId: string,
  viewerUserId?: string | null,
): Promise<ZoneDetailDTO> {
  const detail = await getVisibleZoneDetail(zoneId, viewerUserId);

  if (!detail) {
    notFound();
  }

  return detail;
}

export function buildMapPath(lang: string): string {
  return `/${lang}`;
}

export function buildZonePath(lang: string, detail: ZoneDetailDTO): string {
  return `/${lang}/${buildZoneSlug(detail.zone)}`;
}
