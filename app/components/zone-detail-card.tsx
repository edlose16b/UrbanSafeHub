"use client";

import { type ReactNode } from "react";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { SEGMENT_ORDER, type SegmentKey } from "@/lib/zones/rating-time-segments";
import type { MapTranslations } from "./map-screen";

const RATING_CATEGORY_ORDER = [
  "crime",
  "lighting",
  "foot_traffic",
  "vigilance",
  "cctv",
] as const;

function formatDateLabel(isoString: string, locale: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatAggregateValue(avgScore: number | null, ratingsCount: number): string {
  if (avgScore === null || ratingsCount <= 0) {
    return "—";
  }

  return `${avgScore.toFixed(2)} (${ratingsCount})`;
}

function resolveCategoryLabel(categorySlug: string, translations: MapTranslations): string {
  if (categorySlug === "crime") {
    return translations.zoneDetailCategoryCrime;
  }

  if (categorySlug === "lighting") {
    return translations.zoneDetailCategoryLighting;
  }

  if (categorySlug === "foot_traffic") {
    return translations.zoneDetailCategoryFootTraffic;
  }

  if (categorySlug === "vigilance") {
    return translations.zoneDetailCategoryVigilance;
  }

  if (categorySlug === "cctv") {
    return translations.zoneDetailCategoryCctv;
  }

  return categorySlug;
}

function CategoryScoreBlock({
  categorySlug,
  valueByCell,
  segmentLabelByKey,
  translations,
}: {
  categorySlug: string;
  valueByCell: Map<string, string>;
  segmentLabelByKey: Record<SegmentKey, string>;
  translations: MapTranslations;
}) {
  const segmentRows: { segmentKey: SegmentKey | "general"; label: string }[] = [
    ...SEGMENT_ORDER.map((segmentKey) => ({
      segmentKey,
      label: segmentLabelByKey[segmentKey],
    })),
    {
      segmentKey: "general",
      label: translations.zoneDetailSegmentGeneral,
    },
  ];

  return (
    <div className="rounded-xl bg-surface-muted/60 px-3.5 py-3">
      <p className="text-sm font-medium text-foreground">
        {resolveCategoryLabel(categorySlug, translations)}
      </p>
      <ul className="mt-2.5 space-y-0 divide-y divide-border/60">
        {segmentRows.map(({ segmentKey, label }) => {
          const mapKey = `${categorySlug}:${segmentKey}`;
          const value = valueByCell.get(mapKey) ?? translations.zoneDetailNoData;

          return (
            <li
              key={mapKey}
              className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
              <span className="text-xs text-text-secondary">{label}</span>
              <span className="shrink-0 tabular-nums text-sm font-medium text-foreground">
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function buildAggregateValueMap(detail: ZoneDetailDTO): Map<string, string> {
  const valueByCell = new Map<string, string>();
  for (const aggregate of detail.aggregates) {
    const segmentKey = aggregate.timeSegment ?? "general";
    const mapKey = `${aggregate.categorySlug}:${segmentKey}`;
    valueByCell.set(
      mapKey,
      formatAggregateValue(aggregate.avgScore, aggregate.ratingsCount),
    );
  }
  return valueByCell;
}

function resolveCategoryOrder(detail: ZoneDetailDTO): string[] {
  const discoveredCategories = new Set(detail.aggregates.map((aggregate) => aggregate.categorySlug));

  return [
    ...RATING_CATEGORY_ORDER,
    ...Array.from(discoveredCategories).filter(
      (categorySlug) => !RATING_CATEGORY_ORDER.includes(categorySlug as never),
    ),
  ];
}

export type ZoneDetailCardProps = {
  lang: string;
  detail: ZoneDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  translations: MapTranslations;
};

export function ZoneDetailCard({
  lang,
  detail,
  isLoading,
  error,
  onClose,
  translations,
}: ZoneDetailCardProps) {
  if (!isLoading && !error && !detail) {
    return null;
  }

  const locale = lang === "es" ? "es-PE" : "en-US";
  const segmentLabelByKey: Record<SegmentKey, string> = {
    morning: translations.zoneDetailSegmentMorning,
    afternoon: translations.zoneDetailSegmentAfternoon,
    night: translations.zoneDetailSegmentNight,
    early_morning: translations.zoneDetailSegmentEarlyMorning,
  };

  let content: ReactNode = null;

  if (isLoading) {
    content = <p className="text-sm text-text-secondary">{translations.zoneDetailLoading}</p>;
  } else if (error) {
    content = <p className="text-sm text-danger-foreground">{error}</p>;
  } else if (detail) {
    const geometry = detail.zone.geometry;
    const geometryTypeLabel =
      geometry.type === "Point"
        ? translations.zoneDetailTypePoint
        : translations.zoneDetailTypePolygon;
    const vertexCount =
      geometry.type === "Polygon" ? Math.max(0, geometry.coordinates[0].length - 1) : 0;
    const createdAtLabel = formatDateLabel(detail.zone.createdAt, locale);
    const crimeLabel =
      detail.zone.crimeLevel === null
        ? translations.zoneDetailNoCrimeData
        : `${detail.zone.crimeLevel.toFixed(2)}/5`;

    const valueByCell = buildAggregateValueMap(detail);

    const categoryOrder = resolveCategoryOrder(detail);

    const crimeBlock = (
      <CategoryScoreBlock
        categorySlug="crime"
        valueByCell={valueByCell}
        segmentLabelByKey={segmentLabelByKey}
        translations={translations}
      />
    );

    const otherCategoryBlocks = categoryOrder.filter((slug) => slug !== "crime").map(
      (categorySlug) => (
        <CategoryScoreBlock
          key={categorySlug}
          categorySlug={categorySlug}
          valueByCell={valueByCell}
          segmentLabelByKey={segmentLabelByKey}
          translations={translations}
        />
      ),
    );

    content = (
      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {translations.zoneDetailRatingsTitle}
          </h3>
          <div className="mt-3 space-y-3">
            {crimeBlock}
            {otherCategoryBlocks}
          </div>
        </section>

        <section className="rounded-xl bg-surface-muted/40 px-3.5 py-3 text-xs text-text-secondary">
          <p>
            <span className="text-text-muted">{translations.zoneDetailTypeLabel}</span>{" "}
            <span className="text-foreground">{geometryTypeLabel}</span>
            {geometry.type === "Point" ? (
              <>
                {" "}
                · {translations.zoneDetailRadiusLabel}{" "}
                <span className="text-foreground">{geometry.radiusM}m</span>
              </>
            ) : (
              <>
                {" "}
                · {translations.zoneDetailVerticesLabel}{" "}
                <span className="text-foreground">{vertexCount}</span>
              </>
            )}
          </p>
          <p className="mt-1.5">
            <span className="text-text-muted">{translations.zoneDetailCrimeLabel}</span>{" "}
            <span className="text-foreground">{crimeLabel}</span>
          </p>
          <p className="mt-1.5">
            <span className="text-text-muted">{translations.zoneDetailCreatedByLabel}</span>{" "}
            <span className="text-foreground">{detail.zone.createdBy}</span>
          </p>
          <p className="mt-1.5">
            <span className="text-text-muted">{translations.zoneDetailCreatedAtLabel}</span>{" "}
            <span className="text-foreground">{createdAtLabel}</span>
          </p>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {translations.zoneDetailCommentsTitle}
          </h3>
          {detail.comments.length === 0 ? (
            <p className="mt-2.5 text-sm text-text-secondary">
              {translations.zoneDetailNoComments}
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {detail.comments.map((comment) => (
                <li
                  key={comment.id}
                  className="rounded-xl bg-surface-muted/50 px-3 py-2.5"
                >
                  <p className="text-sm leading-snug text-foreground">{comment.body}</p>
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    {formatDateLabel(comment.createdAt, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  const headerTitle = detail?.zone.name ?? translations.zoneDetailTitle;

  return (
    <aside className="absolute right-4 bottom-4 left-4 z-[1000] max-h-[56vh] overflow-y-auto rounded-2xl border border-border/80 bg-surface-solid/95 p-5 shadow-xl backdrop-blur-sm md:top-4 md:right-4 md:bottom-4 md:left-auto md:w-[380px] md:max-h-[calc(100vh-2rem)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-snug text-foreground">{headerTitle}</h2>
          {detail ? (
            <p className="sr-only">{translations.zoneDetailTitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg border border-border/80 bg-surface-muted/50 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
          aria-label={translations.zoneDetailClose}
          title={translations.zoneDetailClose}
        >
          {translations.zoneDetailClose}
        </button>
      </div>
      {content}
    </aside>
  );
}
