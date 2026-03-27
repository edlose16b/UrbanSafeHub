import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { OgImageTemplate } from "@/app/[lang]/og-image-template";
import { hasLocale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import {
  buildZoneMetadataDescription,
  getZoneProfileLabel,
  getZoneScoreLabel,
} from "@/app/[lang]/[[...zoneSlug]]/zone-share";
import { loadZoneDetailById } from "@/app/[lang]/[[...zoneSlug]]/zone-route";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{
    lang: string;
    zoneId: string;
  }>;
};

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { lang, zoneId } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const detail = await loadZoneDetailById(zoneId);

  return new ImageResponse(
    (
      <OgImageTemplate
        dictionary={dictionary}
        title={clampText(detail.zone.name, 64)}
        description={clampText(buildZoneMetadataDescription(detail, dictionary), 180)}
        profileLabel={getZoneProfileLabel(detail, dictionary)}
        scoreLabel={getZoneScoreLabel(detail, dictionary)}
        isZonePreview
      />
    ),
    size,
  );
}
