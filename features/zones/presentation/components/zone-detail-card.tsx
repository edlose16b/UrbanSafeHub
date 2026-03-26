"use client";

import Image from "next/image";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  LampIcon,
  PoliceCarIcon,
  StarIcon,
  SecurityCameraIcon,
  ShieldWarningIcon,
  UsersThreeIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { SEGMENT_ORDER, type SegmentKey } from "@/lib/zones/rating-time-segments";
import type { MapTranslations } from "../types/map-translations";
import {
  getZoneSeverity,
  getZoneStreetViewUrl,
  getZoneTrendSummary,
} from "../utils/leaflet-map.utils";
import {
  SEGMENT_EMOJIS,
  ScoreStars,
  resolveMetricStarColor,
  resolveSegmentLabel,
} from "./zone-rating-ui";
import {
  buildZoneCreationRatingsPayload,
  createEmptyInfrastructureScores,
  createEmptyMetricScores,
  summarizeMetricScores,
  type MetricScoresSummary,
  type NullableZoneRatingScore,
  type ZoneCreationInfrastructureScores,
  type ZoneCreationMetricScores,
  type ZoneRatingScore,
} from "../utils/zone-creation-form.utils";

const RATING_CATEGORY_ORDER = [
  "crime",
  "lighting",
  "foot_traffic",
  "vigilance",
  "cctv",
] as const;
const GOOGLE_STREET_VIEW_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_STREET_VIEW_API_KEY ?? "";

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

function resolveStreetViewAlt(zoneName: string, translations: MapTranslations): string {
  return translations.zoneDetailStreetViewAlt.replace("{zoneName}", zoneName);
}

function CategoryIcon({
  categorySlug,
  className = "text-text-secondary",
}: {
  categorySlug: string;
  className?: string;
}) {
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
    return <PoliceCarIcon size={size} weight={weight} aria-hidden className={className} />;
  }

  if (categorySlug === "cctv") {
    return <SecurityCameraIcon size={size} weight={weight} aria-hidden className={className} />;
  }

  return null;
}

function formatCompactScore(avgScore: number | null, ratingsCount: number): string {
  if (avgScore === null || ratingsCount <= 0) {
    return "—";
  }

  return avgScore.toFixed(1);
}

function buildAggregateMap(detail: ZoneDetailDTO) {
  const aggregateByCell = new Map<
    string,
    { avgScore: number | null; ratingsCount: number }
  >();

  for (const aggregate of detail.aggregates) {
    const segmentKey = aggregate.timeSegment ?? "general";
    aggregateByCell.set(`${aggregate.categorySlug}:${segmentKey}`, {
      avgScore: aggregate.avgScore,
      ratingsCount: aggregate.ratingsCount,
    });
  }

  return aggregateByCell;
}

function getDerivedGeneralAggregate(
  categorySlug: string,
  aggregateByCell: Map<string, { avgScore: number | null; ratingsCount: number }>,
) {
  const segmentAggregates = SEGMENT_ORDER.map((segmentKey) =>
    aggregateByCell.get(`${categorySlug}:${segmentKey}`),
  ).filter(
    (aggregate): aggregate is { avgScore: number | null; ratingsCount: number } =>
      aggregate !== undefined && aggregate.avgScore !== null && aggregate.ratingsCount > 0,
  );

  if (segmentAggregates.length === 0) {
    return null;
  }

  const averageScore =
    segmentAggregates.reduce((sum, aggregate) => sum + (aggregate.avgScore ?? 0), 0) /
    segmentAggregates.length;
  const ratingsCount = segmentAggregates.reduce(
    (sum, aggregate) => sum + aggregate.ratingsCount,
    0,
  );

  return {
    avgScore: averageScore,
    ratingsCount,
  };
}

function resolveGeneralAggregate(
  categorySlug: string,
  aggregateByCell: Map<string, { avgScore: number | null; ratingsCount: number }>,
) {
  return (
    aggregateByCell.get(`${categorySlug}:general`) ??
    getDerivedGeneralAggregate(categorySlug, aggregateByCell)
  );
}

function categoryUsesSegments(categorySlug: string): boolean {
  return categorySlug === "crime" || categorySlug === "foot_traffic" || categorySlug === "vigilance";
}

function SegmentStat({
  categorySlug,
  segmentKey,
  aggregateByCell,
}: {
  categorySlug: string;
  segmentKey: SegmentKey;
  aggregateByCell: Map<string, { avgScore: number | null; ratingsCount: number }>;
}) {
  const aggregate = aggregateByCell.get(`${categorySlug}:${segmentKey}`) ?? null;
  const scoreValue =
    aggregate && aggregate.avgScore !== null && aggregate.ratingsCount > 0
      ? aggregate.avgScore
      : null;
  const scoreLabel = aggregate ? formatCompactScore(aggregate.avgScore, aggregate.ratingsCount) : "—";

  return (
    <div className="flex items-center gap-1.5 rounded-[1rem] bg-black/10 px-3 py-2.5">
      <span aria-hidden className="text-lg leading-none">
        {SEGMENT_EMOJIS[segmentKey]}
      </span>
      <span className="text-sm font-semibold text-foreground">{scoreLabel}</span>
      <span
        aria-hidden
        className={`text-sm leading-none ${resolveMetricStarColor(scoreValue)}`}
      >
        ★
      </span>
    </div>
  );
}

function SummaryStars({
  value,
  accessibleLabel,
}: {
  value: number | null;
  accessibleLabel: string;
}) {
  const activeColorClass = resolveMetricStarColor(value);

  return (
    <div className="flex items-center gap-0.5" aria-label={accessibleLabel}>
      {Array.from({ length: 5 }, (_, index) => {
        const score = index + 1;
        const isActive = value !== null && score <= value;

        return (
          <StarIcon
            key={score}
            size={13}
            weight={isActive ? "fill" : "regular"}
            aria-hidden
            className={isActive ? activeColorClass : "text-text-muted/45"}
          />
        );
      })}
    </div>
  );
}

function CategoryMetricCard({
  categorySlug,
  aggregateByCell,
  translations,
}: {
  categorySlug: string;
  aggregateByCell: Map<string, { avgScore: number | null; ratingsCount: number }>;
  translations: MapTranslations;
}) {
  const title = resolveCategoryLabel(categorySlug, translations);
  const generalAggregate = resolveGeneralAggregate(categorySlug, aggregateByCell);
  const summaryLabel = generalAggregate
    ? `${generalAggregate.avgScore?.toFixed(1) ?? "—"}/5`
    : translations.zoneDetailNoData;

  return (
    <section className="rounded-[1.1rem] bg-surface-low px-3 py-2.5 text-foreground ghost-outline">
      <div className="flex items-start justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground">
          <CategoryIcon categorySlug={categorySlug} />
          <span>{title}</span>
        </p>
        <SummaryStars
          value={generalAggregate?.avgScore ?? null}
          accessibleLabel={summaryLabel}
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {SEGMENT_ORDER.map((segmentKey) => (
          <SegmentStat
            key={`${categorySlug}:${segmentKey}`}
            categorySlug={categorySlug}
            segmentKey={segmentKey}
            aggregateByCell={aggregateByCell}
          />
        ))}
      </div>
    </section>
  );
}

function InfrastructureChip({
  categorySlug,
  aggregateByCell,
  translations,
}: {
  categorySlug: string;
  aggregateByCell: Map<string, { avgScore: number | null; ratingsCount: number }>;
  translations: MapTranslations;
}) {
  const title = resolveCategoryLabel(categorySlug, translations);
  const generalAggregate = resolveGeneralAggregate(categorySlug, aggregateByCell);
  const summaryLabel = generalAggregate
    ? `${generalAggregate.avgScore?.toFixed(1) ?? "—"}/5`
    : translations.zoneDetailNoData;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[1rem] bg-surface-low px-3.5 py-3 ghost-outline">
      <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        <CategoryIcon
          categorySlug={categorySlug}
          className={categorySlug === "lighting" ? "text-secondary" : "text-tertiary"}
        />
        <span>{title}</span>
      </p>
      <SummaryStars
        value={generalAggregate?.avgScore ?? null}
        accessibleLabel={summaryLabel}
      />
    </div>
  );
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

  return "bg-white/10 text-white";
}

function getStatusSummary(
  detail: ZoneDetailDTO,
  translations: MapTranslations,
): string {
  const severity = getZoneSeverity(detail.zone.crimeLevel);

  if (severity === "safe") {
    return translations.zoneDetailStatusSummarySafe;
  }

  if (severity === "moderate") {
    return translations.zoneDetailStatusSummaryModerate;
  }

  if (severity === "danger") {
    return translations.zoneDetailStatusSummaryDanger;
  }

  return translations.zoneDetailStatusSummaryUnknown;
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

const SCORE_OPTIONS: readonly ZoneRatingScore[] = [1, 2, 3, 4, 5] as const;
const CCTV_OPTIONS: readonly {
  labelKey:
  | "zoneCreateInfrastructureCctvNone"
  | "zoneCreateInfrastructureCctvFew"
  | "zoneCreateInfrastructureCctvGood";
  score: ZoneRatingScore;
  activeClassName: string;
}[] = [
  {
    labelKey: "zoneCreateInfrastructureCctvNone",
    score: 1,
    activeClassName: "border border-primary/40 bg-primary text-primary-foreground",
  },
  {
    labelKey: "zoneCreateInfrastructureCctvFew",
    score: 3,
    activeClassName:
      "border border-secondary/40 bg-secondary text-secondary-foreground",
  },
  {
    labelKey: "zoneCreateInfrastructureCctvGood",
    score: 5,
    activeClassName: "border border-tertiary/40 bg-tertiary text-tertiary-foreground",
  },
] as const;

type VoteFormState = {
  crimeScores: ZoneCreationMetricScores;
  footTrafficScores: ZoneCreationMetricScores;
  infrastructureScores: ZoneCreationInfrastructureScores;
};

function getViewerRatingValue(
  detail: ZoneDetailDTO,
  categorySlug: string,
  timeSegment: SegmentKey | null,
): NullableZoneRatingScore {
  const rating = detail.viewerRatings.find(
    (entry) =>
      entry.categorySlug === categorySlug &&
      (entry.timeSegment ?? null) === timeSegment,
  );

  return (rating?.score as NullableZoneRatingScore | undefined) ?? null;
}

function createVoteFormState(detail: ZoneDetailDTO): VoteFormState {
  return {
    crimeScores: {
      morning: getViewerRatingValue(detail, "crime", "morning"),
      afternoon: getViewerRatingValue(detail, "crime", "afternoon"),
      night: getViewerRatingValue(detail, "crime", "night"),
      early_morning: getViewerRatingValue(detail, "crime", "early_morning"),
    },
    footTrafficScores: {
      morning: getViewerRatingValue(detail, "foot_traffic", "morning"),
      afternoon: getViewerRatingValue(detail, "foot_traffic", "afternoon"),
      night: getViewerRatingValue(detail, "foot_traffic", "night"),
      early_morning: getViewerRatingValue(detail, "foot_traffic", "early_morning"),
    },
    infrastructureScores: {
      lighting: getViewerRatingValue(detail, "lighting", null),
      cctv: getViewerRatingValue(detail, "cctv", null),
      vigilance: {
        morning: getViewerRatingValue(detail, "vigilance", "morning"),
        afternoon: getViewerRatingValue(detail, "vigilance", "afternoon"),
        night: getViewerRatingValue(detail, "vigilance", "night"),
        early_morning: getViewerRatingValue(detail, "vigilance", "early_morning"),
      },
    },
  };
}

function hasExistingViewerVote(detail: ZoneDetailDTO): boolean {
  return detail.viewerRatings.length > 0;
}

function resolveScaleLabel(
  score: ZoneRatingScore,
  translations: MapTranslations,
): string {
  switch (score) {
    case 1:
      return translations.zoneCreateScoreOption1;
    case 2:
      return translations.zoneCreateScoreOption2;
    case 3:
      return translations.zoneCreateScoreOption3;
    case 4:
      return translations.zoneCreateScoreOption4;
    case 5:
      return translations.zoneCreateScoreOption5;
  }
}

function MetricSummaryCard({
  title,
  icon,
  summary,
  onScoreChange,
  isExpanded,
  onToggleExpanded,
  actionLabel,
  translations,
}: {
  title: string;
  icon: ReactNode;
  summary: MetricScoresSummary;
  onScoreChange: (score: ZoneRatingScore) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  actionLabel?: string;
  translations: MapTranslations;
}) {
  const helperText = summary.isUniform
    ? translations.zoneCreateMetricApplyAllDay
    : summary.hasAnyScore
      ? translations.zoneCreateMetricCustomizedSchedule
      : translations.zoneCreateMetricApplyAllDay;

  return (
    <div className="rounded-[1rem] border border-outline-variant/20 bg-surface-high p-4 transition-colors hover:bg-surface-highest">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div>
            <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              {icon}
              <span>{title}</span>
            </h4>
            <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="rounded-full bg-surface-lowest px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:bg-surface-high"
          aria-expanded={isExpanded}
        >
          {actionLabel ??
            (isExpanded
              ? translations.zoneCreateMetricHideSchedule
              : translations.zoneCreateMetricCustomizeSchedule)}
        </button>
      </div>
      <ScoreStars
        value={summary.displayScore}
        metricLabel={title}
        segmentLabel={helperText}
        onScoreChange={onScoreChange}
        className="mt-4"
      />
    </div>
  );
}

function MetricSegmentCard({
  metricLabel,
  segment,
  score,
  onScoreChange,
  translations,
}: {
  metricLabel: string;
  segment: SegmentKey;
  score: NullableZoneRatingScore;
  onScoreChange: (score: ZoneRatingScore) => void;
  translations: MapTranslations;
}) {
  const segmentLabel = resolveSegmentLabel(segment, translations);

  return (
    <div className="rounded-[1rem] border border-outline-variant/20 bg-surface-high p-3 text-center transition-colors hover:bg-surface-highest">
      <div className="block w-full">
        <div className="text-xl">{SEGMENT_EMOJIS[segment]}</div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
          {segmentLabel}
        </p>
      </div>
      <ScoreStars
        value={score}
        metricLabel={metricLabel}
        segmentLabel={segmentLabel}
        onScoreChange={onScoreChange}
      />
    </div>
  );
}

function VoteMetricGroup({
  title,
  icon,
  scores,
  onScoreChange,
  translations,
}: {
  title: string;
  icon: ReactNode;
  scores: ZoneCreationMetricScores;
  onScoreChange: (segment: SegmentKey, score: ZoneRatingScore) => void;
  translations: MapTranslations;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = summarizeMetricScores(scores);
  const shouldShowExpanded = isExpanded;

  function handleApplyToAll(score: ZoneRatingScore): void {
    for (const segment of SEGMENT_ORDER) {
      onScoreChange(segment, score);
    }
  }

  return (
    <section className="space-y-4">
      <MetricSummaryCard
        title={title}
        icon={icon}
        summary={summary}
        onScoreChange={handleApplyToAll}
        isExpanded={shouldShowExpanded}
        onToggleExpanded={() => setIsExpanded((current) => !current)}
        translations={translations}
      />
      {shouldShowExpanded ? (
        <div className="grid grid-cols-2 gap-3">
          {SEGMENT_ORDER.map((segment) => (
            <MetricSegmentCard
              key={segment}
              metricLabel={title}
              segment={segment}
              score={scores[segment]}
              onScoreChange={(score) => onScoreChange(segment, score)}
              translations={translations}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ZoneVotePanel({
  detail,
  isAuthenticated,
  onRefreshDetail,
  translations,
}: {
  detail: ZoneDetailDTO;
  isAuthenticated: boolean;
  onRefreshDetail: () => Promise<ZoneDetailDTO | null>;
  translations: MapTranslations;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [formState, setFormState] = useState<VoteFormState>(() =>
    createVoteFormState(detail),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFormState(createVoteFormState(detail));
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [detail]);

  const hasExistingVote = useMemo(() => hasExistingViewerVote(detail), [detail]);

  function handleMetricScoreChange(
    category: "crime" | "foot_traffic" | "vigilance",
    segment: SegmentKey,
    score: ZoneRatingScore,
  ) {
    setFormState((current) => {
      if (category === "crime") {
        return {
          ...current,
          crimeScores: {
            ...current.crimeScores,
            [segment]: score,
          },
        };
      }

      if (category === "foot_traffic") {
        return {
          ...current,
          footTrafficScores: {
            ...current.footTrafficScores,
            [segment]: score,
          },
        };
      }

      return {
        ...current,
        infrastructureScores: {
          ...current.infrastructureScores,
          vigilance: {
            ...current.infrastructureScores.vigilance,
            [segment]: score,
          },
        },
      };
    });
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  function handleInfrastructureScoreChange(
    category: "lighting" | "cctv",
    score: ZoneRatingScore,
  ) {
    setFormState((current) => ({
      ...current,
      infrastructureScores: {
        ...current.infrastructureScores,
        [category]: score,
      },
    }));
    setSubmitError(null);
    setSubmitSuccess(null);
  }

  async function handleSubmit() {
    const ratings = buildZoneCreationRatingsPayload({
      crimeScores: formState.crimeScores,
      footTrafficScores: formState.footTrafficScores,
      infrastructureScores: formState.infrastructureScores,
    });

    if (ratings.length === 0) {
      setSubmitError(translations.zoneDetailVoteRequired);
      setSubmitSuccess(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const response = await fetch(`/api/zones/${detail.zone.id}/ratings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ratings,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? translations.zoneDetailVoteErrorFallback);
      }

      await onRefreshDetail();
      setSubmitSuccess(translations.zoneDetailVoteSuccess);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : translations.zoneDetailVoteErrorFallback,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[1.25rem] bg-surface-muted px-3.5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {translations.zoneDetailVoteTitle}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            {isAuthenticated
              ? translations.zoneDetailVoteSubtitleAuthenticated
              : translations.zoneDetailVoteSubtitleAnonymous}
          </p>
        </div>
        {!isAuthenticated ? (
          <span className="rounded-full bg-surface-low px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary ghost-outline">
            {translations.zoneDetailVoteAnonymousBadge}
          </span>
        ) : null}
      </div>

      {!isComposerOpen ? (
        <div className="mt-4">
          <MetricSummaryCard
            title={translations.zoneCreateMetricCrime}
            icon={<CategoryIcon categorySlug="crime" />}
            summary={summarizeMetricScores(formState.crimeScores)}
            onScoreChange={() => setIsComposerOpen(true)}
            isExpanded={false}
            onToggleExpanded={() => setIsComposerOpen(true)}
            actionLabel={translations.zoneDetailVoteOpen}
            translations={translations}
          />
          <p className="mt-3 text-sm text-text-secondary">
            {isAuthenticated && hasExistingVote
              ? translations.zoneDetailVoteCurrentLabel
              : isAuthenticated
                ? translations.zoneDetailVoteSubtitleAuthenticated
                : translations.zoneDetailVoteSubtitleAnonymous}
          </p>
        </div>
      ) : null}

      {isComposerOpen ? (
        <>
          {isAuthenticated && hasExistingVote ? (
            <p className="mt-4 text-sm text-text-secondary">
              {translations.zoneDetailVoteCurrentLabel}
            </p>
          ) : null}

          <section className="mt-6">
            <div className="border-b border-outline-variant/20 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                {translations.zoneCreateSectionMetrics}
              </span>
            </div>

            <div className="mt-5 space-y-6">
              <VoteMetricGroup
                title={translations.zoneCreateMetricCrime}
                icon={<CategoryIcon categorySlug="crime" />}
                scores={formState.crimeScores}
                onScoreChange={(segment, score) =>
                  handleMetricScoreChange("crime", segment, score)
                }
                translations={translations}
              />

              <VoteMetricGroup
                title={translations.zoneCreateMetricFootTraffic}
                icon={<CategoryIcon categorySlug="foot_traffic" />}
                scores={formState.footTrafficScores}
                onScoreChange={(segment, score) =>
                  handleMetricScoreChange("foot_traffic", segment, score)
                }
                translations={translations}
              />

              <VoteMetricGroup
                title={translations.zoneCreateInfrastructureVigilance}
                icon={<CategoryIcon categorySlug="vigilance" />}
                scores={formState.infrastructureScores.vigilance}
                onScoreChange={(segment, score) =>
                  handleMetricScoreChange("vigilance", segment, score)
                }
                translations={translations}
              />
            </div>
          </section>

          <section className="mt-6">
            <div className="border-b border-outline-variant/20 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
                {translations.zoneCreateSectionInfrastructure}
              </span>
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[1rem] border border-outline-variant/20 bg-surface-low px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CategoryIcon categorySlug="lighting" />
                      <span>{translations.zoneCreateInfrastructureLighting}</span>
                    </span>
                  </span>
                  <select
                    value={formState.infrastructureScores.lighting ?? ""}
                    onChange={(event) =>
                      event.target.value
                        ? handleInfrastructureScoreChange(
                          "lighting",
                          Number(event.target.value) as ZoneRatingScore,
                        )
                        : undefined
                    }
                    className="rounded-lg bg-surface-highest px-3 py-2 text-xs text-foreground outline-none"
                  >
                    <option value="">{translations.zoneCreateLightingPlaceholder}</option>
                    {SCORE_OPTIONS.map((score) => (
                      <option key={score} value={score}>
                        {resolveScaleLabel(score, translations)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-[1rem] border border-outline-variant/20 bg-surface-low px-4 py-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <CategoryIcon categorySlug="cctv" />
                      <span>{translations.zoneCreateInfrastructureCctv}</span>
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CCTV_OPTIONS.map((option) => {
                    const isActive = formState.infrastructureScores.cctv === option.score;

                    return (
                      <button
                        key={option.labelKey}
                        type="button"
                        onClick={() =>
                          handleInfrastructureScoreChange("cctv", option.score)
                        }
                        aria-pressed={isActive}
                        className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition-all ${isActive
                          ? option.activeClassName
                          : "bg-surface-highest text-text-secondary hover:bg-surface-high"
                          }`}
                      >
                        {translations[option.labelKey]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-text-secondary">
                  {translations.zoneCreateInfrastructureCctvHint}
                </p>
              </div>
            </div>
          </section>

          {submitError ? (
            <p className="mt-3 text-sm text-danger-foreground">{submitError}</p>
          ) : null}
          {submitSuccess ? (
            <p className="mt-3 text-sm text-tertiary">{submitSuccess}</p>
          ) : null}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-4 w-full rounded-[1rem] px-4 py-3 text-sm font-semibold text-primary-foreground primary-glow disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? translations.zoneDetailVoteSubmitting
              : isAuthenticated && hasExistingVote
                ? translations.zoneDetailVoteUpdate
                : translations.zoneDetailVoteSubmit}
          </button>
        </>
      ) : null}
    </section>
  );
}

export type ZoneDetailCardProps = {
  lang: string;
  detail: ZoneDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onRefreshDetail: () => Promise<ZoneDetailDTO | null>;
  translations: MapTranslations;
};

export function ZoneDetailCard({
  lang,
  detail,
  isLoading,
  error,
  isAuthenticated,
  onClose,
  onRefreshDetail,
  translations,
}: ZoneDetailCardProps) {
  if (!isLoading && !error && !detail) {
    return null;
  }

  const locale = lang === "es" ? "es-PE" : "en-US";
  let content: ReactNode = null;

  if (isLoading) {
    content = <p className="px-1 text-sm text-text-secondary">{translations.zoneDetailLoading}</p>;
  } else if (error) {
    content = <p className="px-1 text-sm text-danger-foreground">{error}</p>;
  } else if (detail) {
    const geometry = detail.zone.geometry;
    const streetViewUrl = GOOGLE_STREET_VIEW_API_KEY
      ? getZoneStreetViewUrl(geometry, GOOGLE_STREET_VIEW_API_KEY)
      : null;
    const geometryTypeLabel =
      geometry.type === "Point"
        ? translations.zoneDetailTypePoint
        : translations.zoneDetailTypePolygon;
    const vertexCount =
      geometry.type === "Polygon" ? Math.max(0, geometry.coordinates[0].length - 1) : 0;
    const createdAtLabel = formatDateLabel(detail.zone.createdAt, locale);
    const statusLabel = getStatusLabel(detail, translations);
    const statusSummary = getStatusSummary(detail, translations);
    const profileLabel = getProfileLabel(detail, translations);
    const profileSummary = getZoneTrendSummary(detail);
    const latestComment = detail.comments[0]?.body ?? translations.zoneDetailNoComments;

    const aggregateByCell = buildAggregateMap(detail);
    const categoryOrder = resolveCategoryOrder(detail);
    const metricBlocks = categoryOrder
      .filter(
        (slug) =>
          slug === "crime" ||
          slug === "foot_traffic" ||
          slug === "vigilance",
      )
      .map((categorySlug) => (
        <CategoryMetricCard
          key={categorySlug}
          categorySlug={categorySlug}
          aggregateByCell={aggregateByCell}
          translations={translations}
        />
      ));

    content = (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[1.6rem] bg-surface-solid shadow-[0_24px_60px_rgba(0,0,0,0.28)]">
          <div className="relative aspect-[16/10] overflow-hidden bg-surface-high">
            {streetViewUrl ? (
              <Image
                src={streetViewUrl}
                alt={resolveStreetViewAlt(detail.zone.name, translations)}
                fill
                unoptimized
                sizes="(max-width: 768px) 100vw, 420px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-surface-high" aria-hidden />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,12,12,0.08)_0%,rgba(12,12,12,0.18)_35%,rgba(12,12,12,0.82)_100%)]" />
            <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
              <p
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] shadow-[0_10px_26px_rgba(0,0,0,0.18)] ${getStatusClasses(detail)}`}
              >
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-current opacity-65" />
                <span>{statusLabel}</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
                aria-label={translations.zoneDetailClose}
                title={translations.zoneDetailClose}
              >
                <XIcon size={18} weight="bold" aria-hidden />
              </button>
            </div>
          </div>

          <div className="relative -mt-14 px-4 pb-4">
            <div className="rounded-[1.6rem] bg-[radial-gradient(circle_at_top_right,rgba(74,225,131,0.12),transparent_28%),radial-gradient(circle_at_top_left,rgba(255,83,82,0.18),transparent_30%),linear-gradient(180deg,rgba(30,29,29,0.98),rgba(20,20,20,0.98))] px-4 py-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
              <div className="min-w-0">
                <h2 className="font-display text-[1.9rem] font-semibold leading-tight text-white">
                  {detail.zone.name}
                </h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#d8cac6]">
                  <ShieldWarningIcon size={16} weight="duotone" aria-hidden className="text-tertiary" />
                  <span>{profileLabel}</span>
                </p>
                <p className="mt-3 max-w-[32ch] text-base leading-relaxed text-[#e7d4cf]">
                  {detail.zone.description || latestComment}
                </p>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#d8cac6]">
                🤖 {statusSummary}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {translations.zoneDetailRatingsTitle}
            </h3>
            <p className="text-[11px] text-text-secondary">
              {translations.zoneDetailTrendCaption}
            </p>
          </div>
          <div className="grid gap-3">
            {metricBlocks}
          </div>
        </section>

        <section className="rounded-[1.25rem] bg-surface-muted px-3.5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              {translations.zoneDetailInfrastructureTitle}
            </p>
            <p className="text-[11px] text-text-secondary">{profileLabel}</p>
          </div>
          <div className="mt-3 grid gap-2">
            <InfrastructureChip
              categorySlug="lighting"
              aggregateByCell={aggregateByCell}
              translations={translations}
            />
            <InfrastructureChip
              categorySlug="cctv"
              aggregateByCell={aggregateByCell}
              translations={translations}
            />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-highest">
            <div
              className="h-full rounded-full bg-tertiary transition-[width]"
              style={{ width: `${profileSummary.progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {translations.zoneDetailTrendCaption}
          </p>
        </section>

        <ZoneVotePanel
          detail={detail}
          isAuthenticated={isAuthenticated}
          onRefreshDetail={onRefreshDetail}
          translations={translations}
        />

        <section className="rounded-[1.25rem] bg-surface-muted px-3.5 py-3.5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
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
                  className="rounded-[1rem] bg-surface-low px-3 py-2.5 ghost-outline"
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

        <section className="rounded-[1.25rem] bg-surface-muted px-3.5 py-3.5 text-xs text-text-secondary">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {translations.zoneDetailMetadataTitle}
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[1rem] bg-surface-low px-3 py-3 ghost-outline">
              <p>
                <span className="text-text-muted">{translations.zoneDetailTypeLabel}</span>{" "}
                <span className="text-foreground">{geometryTypeLabel}</span>
              </p>
              <p className="mt-1.5">
                <span className="text-text-muted">
                  {geometry.type === "Point"
                    ? translations.zoneDetailRadiusLabel
                    : translations.zoneDetailVerticesLabel}
                </span>{" "}
                <span className="text-foreground">
                  {geometry.type === "Point" ? `${geometry.radiusM}m` : vertexCount}
                </span>
              </p>
            </div>
            <div className="rounded-[1rem] bg-surface-low px-3 py-3 ghost-outline">
              <p>
                <span className="text-text-muted">{translations.zoneDetailCreatedByLabel}</span>{" "}
                <span className="text-foreground">{detail.zone.createdBy}</span>
              </p>
              <p className="mt-1.5">
                <span className="text-text-muted">{translations.zoneDetailCreatedAtLabel}</span>{" "}
                <span className="text-foreground">{createdAtLabel}</span>
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <aside className="glass-panel ghost-outline absolute right-4 bottom-24 left-4 z-[1000] max-h-[58vh] overflow-y-auto rounded-[1.65rem] p-3 md:top-24 md:right-4 md:bottom-4 md:left-auto md:w-[420px] md:max-h-[calc(100vh-7rem)]">
      {content}
    </aside>
  );
}
