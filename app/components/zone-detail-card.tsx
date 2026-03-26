"use client";

import { type ReactNode } from "react";
import {
  LampIcon,
  PoliceCarIcon,
  SecurityCameraIcon,
  ShieldWarningIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { SEGMENT_ORDER, type SegmentKey } from "@/lib/zones/rating-time-segments";
import type { MapTranslations } from "./map-screen";
import { getZoneSeverity, getZoneTrendSummary } from "./leaflet-map.utils";

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

function CategoryIcon({ categorySlug }: { categorySlug: string }) {
  const className = "text-text-secondary";
  const size = 18;
  const weight = "duotone" as const;

  if (categorySlug === "crime") {
    return <ShieldWarningIcon size={size} weight={weight} aria-hidden className={className} />;
  }

  if (categorySlug === "lighting") {
    return <LampIcon size={size} weight={weight} aria-hidden className={className} />;
  }

  if (categorySlug === "foot_traffic") {
    return <UsersThreeIcon size={size} weight={weight} aria-hidden className={className} />;
  }

  if (categorySlug === "vigilance") {
    return (
      <PoliceCarIcon size={size} weight={weight} aria-hidden className={className} />
    );
  }

  if (categorySlug === "cctv") {
    return (
      <SecurityCameraIcon
        size={size}
        weight={weight}
        aria-hidden
        className={className}
      />
    );
  }

  return null;
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
    <div className="rounded-[1rem] bg-surface-muted px-3.5 py-3">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <CategoryIcon categorySlug={categorySlug} />
        <span>{resolveCategoryLabel(categorySlug, translations)}</span>
      </p>
      <ul className="mt-2.5 space-y-1.5">
        {segmentRows.map(({ segmentKey, label }) => {
          const mapKey = `${categorySlug}:${segmentKey}`;
          const value = valueByCell.get(mapKey) ?? translations.zoneDetailNoData;

          return (
            <li
              key={mapKey}
              className="flex items-baseline justify-between gap-4 rounded-[0.85rem] bg-surface-high/70 px-2.5 py-2"
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

function getStatusLabel(
  detail: ZoneDetailDTO,
  translations: MapTranslations,
): string {
  const severity = getZoneSeverity(detail.zone.crimeLevel);

  if (severity === "safe") {
    return translations.zoneDetailStatusSafe;
  }

  if (severity === "moderate") {
    return translations.zoneDetailStatusModerate;
  }

  if (severity === "danger") {
    return translations.zoneDetailStatusDanger;
  }

  return translations.zoneDetailStatusUnknown;
}

function getStatusClasses(detail: ZoneDetailDTO): string {
  const severity = getZoneSeverity(detail.zone.crimeLevel);

  if (severity === "safe") {
    return "bg-success text-success-foreground";
  }

  if (severity === "moderate") {
    return "bg-warning text-warning-foreground";
  }

  if (severity === "danger") {
    return "bg-danger text-danger-foreground";
  }

  return "bg-surface-high text-text-secondary";
}

function getProfileLabel(detail: ZoneDetailDTO, translations: MapTranslations): string {
  const summary = getZoneTrendSummary(detail);

  if (summary.direction === "day_stronger") {
    return translations.zoneDetailProfileDayStronger;
  }

  if (summary.direction === "night_stronger") {
    return translations.zoneDetailProfileNightStronger;
  }

  if (summary.direction === "steady") {
    return translations.zoneDetailProfileSteady;
  }

  return translations.zoneDetailProfileInsufficientData;
}

function getSignalsCount(detail: ZoneDetailDTO): number {
  return detail.aggregates.reduce((sum, aggregate) => sum + aggregate.ratingsCount, 0);
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
    const statusLabel = getStatusLabel(detail, translations);
    const profileLabel = getProfileLabel(detail, translations);
    const profileSummary = getZoneTrendSummary(detail);
    const signalsCount = getSignalsCount(detail);
    const latestComment = detail.comments[0]?.body ?? translations.zoneDetailNoComments;

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
        <section className="overflow-hidden rounded-[1.25rem] bg-surface-muted">
          <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,83,82,0.28),transparent_34%),radial-gradient(circle_at_top_right,rgba(74,225,131,0.18),transparent_26%),linear-gradient(180deg,rgba(57,57,57,0.92),rgba(28,27,27,0.96))] px-4 py-4">
            <div className="absolute inset-x-0 bottom-0 h-px bg-outline-variant/30" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${getStatusClasses(detail)}`}>
                  {statusLabel}
                </p>
                <p className="mt-3 max-w-56 text-sm leading-snug text-text-muted">
                  {latestComment}
                </p>
              </div>
              <div className="rounded-full bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted ghost-outline">
                {translations.zoneDetailProfileTitle}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 py-4 text-center">
            <div className="rounded-[0.9rem] bg-surface-high px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {translations.zoneDetailCrimeLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{crimeLabel}</p>
            </div>
            <div className="rounded-[0.9rem] bg-surface-high px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {translations.zoneDetailRatingsCountLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{signalsCount}</p>
            </div>
            <div className="rounded-[0.9rem] bg-surface-high px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {translations.zoneDetailCommentsCountLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{detail.comments.length}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
            {translations.zoneDetailRatingsTitle}
          </h3>
          <div className="mt-3 space-y-3">
            {crimeBlock}
            {otherCategoryBlocks}
          </div>
        </section>

        <section className="rounded-[1rem] bg-surface-muted px-3.5 py-3 text-xs text-text-secondary">
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
          <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-text-muted">
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
                  className="rounded-[1rem] bg-surface-muted px-3 py-2.5"
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

        <section className="rounded-[1rem] bg-surface-muted px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
              {translations.zoneDetailProfileTitle}
            </p>
            <p className="text-[11px] text-text-secondary">{profileLabel}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-highest">
            <div
              className="h-full rounded-full bg-tertiary transition-[width]"
              style={{ width: `${profileSummary.progressPercent}%` }}
            />
          </div>
        </section>
      </div>
    );
  }

  const headerTitle = detail?.zone.name ?? translations.zoneDetailTitle;

  return (
    <aside className="glass-panel ghost-outline absolute right-4 bottom-24 left-4 z-[1000] max-h-[52vh] overflow-y-auto rounded-[1.5rem] p-5 md:top-24 md:right-4 md:bottom-4 md:left-auto md:w-[380px] md:max-h-[calc(100vh-7rem)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-snug text-foreground">
            {headerTitle}
          </h2>
          {detail ? (
            <p className="sr-only">{translations.zoneDetailTitle}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full bg-surface-high px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-surface-bright"
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
