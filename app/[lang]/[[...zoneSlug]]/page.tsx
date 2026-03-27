import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
import { getUserContributionSummary } from "@/lib/reputation/server/get-user-contribution-summary";
import MapScreen from "@/features/zones/presentation/screens/map-screen";
import { buildZoneSlug, parseZoneSlug } from "@/lib/zones/application/zone-slug";
import { getVisibleZoneDetail } from "@/lib/zones/server/get-visible-zone-detail";
import { hasLocale } from "../../i18n/config";
import { getDictionary } from "../../i18n/get-dictionary";

type PageParams = {
  lang: string;
  zoneSlug?: string[];
};

type PageProps = {
  params: Promise<PageParams>;
};

function resolveZoneSlugParam(zoneSlug?: string[]): string | null {
  if (!zoneSlug || zoneSlug.length === 0) {
    return null;
  }

  if (zoneSlug.length !== 1) {
    notFound();
  }

  return zoneSlug[0] ?? null;
}

async function loadZoneDetailFromSlug(
  routeZoneSlug: string | null,
  viewerUserId?: string | null,
) {
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang, zoneSlug } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const dictionary = await getDictionary(lang);
  const routeZoneSlug = resolveZoneSlugParam(zoneSlug);

  if (!routeZoneSlug) {
    return {
      title: dictionary.metadata.title,
      description: dictionary.metadata.description,
    };
  }

  const detail = await loadZoneDetailFromSlug(routeZoneSlug);
  const canonicalSlug = buildZoneSlug(detail.zone);
  const title = `${detail.zone.name} | ${dictionary.metadata.title}`;
  const description = detail.zone.description ?? dictionary.metadata.description;
  const canonicalPath = `/${lang}/${canonicalSlug}`;

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
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { lang, zoneSlug } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  const routeZoneSlug = resolveZoneSlugParam(zoneSlug);
  const dictionaryPromise = getDictionary(lang);
  const viewerPromise = getCurrentAuthUserSnapshot();
  const viewer = await viewerPromise;
  const initialSelectedZoneDetail = await loadZoneDetailFromSlug(routeZoneSlug, viewer.id);
  const canonicalSlug = initialSelectedZoneDetail
    ? buildZoneSlug(initialSelectedZoneDetail.zone)
    : null;

  if (routeZoneSlug && canonicalSlug && routeZoneSlug !== canonicalSlug) {
    redirect(`/${lang}/${canonicalSlug}`);
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
