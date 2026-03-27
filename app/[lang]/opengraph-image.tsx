import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { OgImageTemplate } from "./og-image-template";
import { hasLocale } from "../i18n/config";
import { getDictionary } from "../i18n/get-dictionary";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{
    lang: string;
  }>;
};

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);

  return new ImageResponse(
    (
      <OgImageTemplate
        dictionary={dictionary}
        title={dictionary.metadata.title}
        description={clampText(dictionary.metadata.share.mapPreviewDescription, 180)}
        profileLabel={null}
        scoreLabel={null}
        isZonePreview={false}
      />
    ),
    size,
  );
}
