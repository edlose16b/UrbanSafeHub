import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
import { getUserContributionSummary } from "@/lib/reputation/server/get-user-contribution-summary";
import MapScreen from "@/features/zones/presentation/screens/map-screen";
import { hasLocale } from "../../i18n/config";
import { getDictionary } from "../../i18n/get-dictionary";
import {
  buildMapMetadataImagePath,
  buildMapImageAlt,
  buildZoneImageAlt,
  buildZoneMetadataDescription,
  buildZoneMetadataImagePath,
} from "./zone-share";
import {
  buildMapPath,
  buildZonePath,
  loadZoneDetailFromSlug,
  resolveZoneSlugParam,
  type ZonePageProps,
} from "./zone-route";

export async function generateMetadata({
  params,
}: ZonePageProps): Promise<Metadata> {
  const { lang, zoneSlug } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const routeZoneSlug = resolveZoneSlugParam(zoneSlug);

  if (!routeZoneSlug) {
    return {
      alternates: {
        canonical: buildMapPath(lang),
      },
      openGraph: {
        url: buildMapPath(lang),
      },
      twitter: {
        images: [
          {
            url: buildMapMetadataImagePath(lang),
            alt: buildMapImageAlt(dictionary),
          },
        ],
      },
    };
  }

  const detail = await loadZoneDetailFromSlug(routeZoneSlug);
  const title = detail.zone.name;
  const description = buildZoneMetadataDescription(detail, dictionary);
  const canonicalPath = buildZonePath(lang, detail);
  const ogImagePath = buildZoneMetadataImagePath(lang, detail);
  const imageAlt = buildZoneImageAlt(detail, dictionary);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "article",
      images: [
        {
          url: ogImagePath,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [
        {
          url: ogImagePath,
          alt: imageAlt,
        },
      ],
    },
  };
}

export default async function HomePage({ params }: ZonePageProps) {
  const { lang, zoneSlug } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const routeZoneSlug = resolveZoneSlugParam(zoneSlug);
  const dictionaryPromise = getDictionary(lang);
  const viewerPromise = getCurrentAuthUserSnapshot();
  const viewer = await viewerPromise;
  const initialSelectedZoneDetail = routeZoneSlug
    ? await loadZoneDetailFromSlug(routeZoneSlug, viewer.id)
    : null;
  const canonicalPath = initialSelectedZoneDetail
    ? buildZonePath(lang, initialSelectedZoneDetail)
    : null;

  if (routeZoneSlug && canonicalPath && canonicalPath !== `/${lang}/${routeZoneSlug}`) {
    redirect(canonicalPath);
  }

  const [dictionary, contributionSummary] = await Promise.all([
    dictionaryPromise,
    viewer.isAnonymous || viewer.id === null
      ? Promise.resolve(null)
      : getUserContributionSummary(viewer.id),
  ]);
  const initialUser = {
    ...viewer,
    points: contributionSummary?.totalPoints ?? null,
  };

  return (
    <main className="w-screen h-screen overflow-hidden">
      {initialSelectedZoneDetail ? (
        <section className="sr-only">
          <h1>{initialSelectedZoneDetail.zone.name}</h1>
          <p>
            {initialSelectedZoneDetail.zone.description ??
              dictionary.metadata.description}
          </p>
        </section>
      ) : null}
      <MapScreen
        lang={lang}
        initialUser={initialUser}
        initialSelectedZoneDetail={initialSelectedZoneDetail}
        authTranslations={dictionary.auth}
        translations={dictionary.map}
      />
    </main>
  );
}
