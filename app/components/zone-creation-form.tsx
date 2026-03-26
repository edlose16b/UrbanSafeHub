"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  EyeIcon,
  LampIcon,
  SecurityCameraIcon,
  ShieldWarningIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { POINT_RADIUS_OPTIONS_M } from "@/app/constants/map";
import type { LeafletMapProps } from "./leaflet-map.types";
import {
  SEGMENT_ORDER,
  type SegmentKey,
} from "@/lib/zones/rating-time-segments";
import type {
  MetricScoresSummary,
  NullableZoneRatingScore,
  ZoneCreationInfrastructureScores,
  ZoneCreationMetricScores,
  ZoneRatingScore,
} from "./zone-creation-form.utils";
import { summarizeMetricScores } from "./zone-creation-form.utils";

type ZoneCreationFormProps = {
  isVisible: boolean;
  hasAcceptedTerms: boolean;
  zoneName: string;
  zoneDescription: string;
  pointRadiusM: number;
  pointCenterReady: boolean;
  crimeScores: ZoneCreationMetricScores;
  footTrafficScores: ZoneCreationMetricScores;
  infrastructureScores: ZoneCreationInfrastructureScores;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: string | null;
  isSubmitDisabled: boolean;
  onAcceptedTermsChange: (checked: boolean) => void;
  onNameChange: (nextName: string) => void;
  onDescriptionChange: (nextDescription: string) => void;
  onRadiusChange: (value: number) => void;
  onMetricScoreChange: (
    category: "crime" | "foot_traffic" | "vigilance",
    segment: SegmentKey,
    score: ZoneRatingScore,
  ) => void;
  onInfrastructureScoreChange: (
    category: "lighting" | "cctv",
    score: ZoneRatingScore,
  ) => void;
  onClearDraft: () => void;
  onCancel: () => void;
  onSubmit: () => Promise<boolean>;
  translations: LeafletMapProps["translations"];
};

const SCORE_OPTIONS: readonly ZoneRatingScore[] = [1, 2, 3, 4, 5] as const;

const SEGMENT_EMOJIS: Record<SegmentKey, string> = {
  morning: "☀️",
  afternoon: "🌤️",
  night: "🌙",
  early_morning: "🌑",
};

function resolveSegmentLabel(
  segment: SegmentKey,
  translations: LeafletMapProps["translations"],
): string {
  switch (segment) {
    case "morning":
      return translations.zoneDetailSegmentMorning;
    case "afternoon":
      return translations.zoneDetailSegmentAfternoon;
    case "night":
      return translations.zoneDetailSegmentNight;
    case "early_morning":
      return translations.zoneDetailSegmentEarlyMorning;
  }
}

function resolveScaleLabel(
  score: ZoneRatingScore,
  translations: LeafletMapProps["translations"],
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

function resolveMetricStarColor(score: NullableZoneRatingScore): string {
  if (score === null) {
    return "text-white/80";
  }

  if (score <= 2) {
    return "text-primary";
  }

  if (score === 3) {
    return "text-secondary";
  }

  return "text-tertiary";
}

function CategoryIcon({
  category,
}: {
  category: "crime" | "foot_traffic" | "lighting" | "vigilance" | "cctv";
}) {
  const className = "text-text-secondary";
  const size = 18;
  const weight = "duotone" as const;

  switch (category) {
    case "crime":
      return <ShieldWarningIcon size={size} weight={weight} aria-hidden className={className} />;
    case "foot_traffic":
      return <UsersThreeIcon size={size} weight={weight} aria-hidden className={className} />;
    case "lighting":
      return <LampIcon size={size} weight={weight} aria-hidden className={className} />;
    case "vigilance":
      return <EyeIcon size={size} weight={weight} aria-hidden className={className} />;
    case "cctv":
      return <SecurityCameraIcon size={size} weight={weight} aria-hidden className={className} />;
  }
}

function ScoreStars({
  value,
  metricLabel,
  segmentLabel,
  onScoreChange,
  className,
}: {
  value: NullableZoneRatingScore;
  metricLabel: string;
  segmentLabel: string;
  onScoreChange: (score: ZoneRatingScore) => void;
  className?: string;
}) {
  const activeColorClassName = resolveMetricStarColor(value);

  return (
    <div className={`flex items-center justify-center gap-1 ${className ?? ""}`}>
      {SCORE_OPTIONS.map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onScoreChange(score)}
          aria-label={`${metricLabel} · ${segmentLabel} · ${score}/5`}
          aria-pressed={value === score}
          className={`rounded-md p-1 text-lg leading-none transition-colors hover:scale-105 ${
            value !== null && score <= value
              ? activeColorClassName
              : "text-white/80"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function MetricSummaryCard({
  title,
  icon,
  summary,
  onScoreChange,
  isExpanded,
  onToggleExpanded,
  translations,
}: {
  title: string;
  icon: ReactNode;
  summary: MetricScoresSummary;
  onScoreChange: (score: ZoneRatingScore) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  translations: LeafletMapProps["translations"];
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
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              {icon}
              <span>{title}</span>
            </h3>
            <p className="mt-1 text-xs text-text-secondary">{helperText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleExpanded}
          className="rounded-full bg-surface-lowest px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:bg-surface-high"
          aria-expanded={isExpanded}
        >
          {isExpanded
            ? translations.zoneCreateMetricHideSchedule
            : translations.zoneCreateMetricCustomizeSchedule}
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
  translations: LeafletMapProps["translations"];
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

function MetricGroup({
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
  translations: LeafletMapProps["translations"];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = summarizeMetricScores(scores);

  useEffect(() => {
    if (!summary.hasAnyScore) {
      setIsExpanded(false);
    }
  }, [summary.hasAnyScore]);

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
        isExpanded={isExpanded}
        onToggleExpanded={() => setIsExpanded((current) => !current)}
        translations={translations}
      />
      {isExpanded ? (
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

function InfrastructureScale({
  value,
  onChange,
  translations,
}: {
  value: NullableZoneRatingScore;
  onChange: (score: ZoneRatingScore) => void;
  translations: LeafletMapProps["translations"];
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {SCORE_OPTIONS.map((score) => {
        const isActive = value === score;
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-pressed={isActive}
            aria-label={resolveScaleLabel(score, translations)}
            className={`rounded-lg px-0 py-2 text-[11px] font-semibold transition-all ${
              isActive
                ? "border border-primary/40 bg-primary text-primary-foreground"
                : "bg-surface-highest text-text-secondary hover:bg-surface-high"
            }`}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}

export function ZoneCreationForm({
  isVisible,
  hasAcceptedTerms,
  zoneName,
  zoneDescription,
  pointRadiusM,
  pointCenterReady,
  crimeScores,
  footTrafficScores,
  infrastructureScores,
  isSubmitting,
  submitError,
  submitSuccess,
  isSubmitDisabled,
  onAcceptedTermsChange,
  onNameChange,
  onDescriptionChange,
  onRadiusChange,
  onMetricScoreChange,
  onInfrastructureScoreChange,
  onClearDraft,
  onCancel,
  onSubmit,
  translations,
}: ZoneCreationFormProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <form
      className="glass-panel ghost-outline absolute top-20 left-4 z-[1000] max-h-[calc(100vh-7rem)] w-[min(30rem,calc(100vw-2rem))] overflow-y-auto rounded-[1.6rem] p-5 text-sm text-foreground md:top-24 md:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit();
      }}
    >
      <header>
        <h2 className="font-display text-xl font-semibold leading-none md:text-[1.4rem]">
          {translations.zoneCreatePanelTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {translations.zoneCreatePanelSubtitle}
        </p>
      </header>

      <div className="mt-4 rounded-[1rem] bg-warning px-3 py-2.5 text-xs leading-relaxed text-warning-foreground ghost-outline">
        <p>{translations.zoneCreateTermsAlert}</p>
        <label className="mt-2 flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={hasAcceptedTerms}
            onChange={(event) => onAcceptedTermsChange(event.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>{translations.zoneCreateTermsCheckbox}</span>
        </label>
      </div>

      <section className="mt-6">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
            {translations.zoneCreateSectionBasic}
          </span>
          <button
            type="button"
            onClick={onClearDraft}
            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20"
          >
            {pointCenterReady
              ? translations.zoneCreateRedrawRadius
              : translations.zoneCreateDrawRadius}
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {translations.zoneCreateNameLabel}
            </span>
            <input
              type="text"
              value={zoneName}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder={translations.zoneCreateNamePlaceholder}
              className="ghost-outline w-full rounded-[1rem] bg-input px-3 py-3 text-sm text-foreground outline-none transition-colors focus:bg-surface-lowest"
              maxLength={120}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {translations.zoneCreateDescriptionLabel}
            </span>
            <textarea
              value={zoneDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder={translations.zoneCreateDescriptionPlaceholder}
              className="ghost-outline min-h-24 w-full rounded-[1rem] bg-input px-3 py-3 text-sm text-foreground outline-none transition-colors focus:bg-surface-lowest"
              maxLength={400}
            />
          </label>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
              {translations.zoneCreateRadiusLabel}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {POINT_RADIUS_OPTIONS_M.map((radiusOption) => (
                <button
                  key={radiusOption}
                  type="button"
                  onClick={() => onRadiusChange(radiusOption)}
                  className={`rounded-[0.9rem] px-3 py-2 text-xs font-medium transition-all ${
                    pointRadiusM === radiusOption
                      ? "bg-surface-bright text-foreground shadow-[0_0_18px_rgba(255,83,82,0.16)] ghost-outline"
                      : "bg-surface-muted text-text-muted hover:bg-surface-high"
                  }`}
                  aria-pressed={pointRadiusM === radiusOption}
                >
                  {radiusOption}m
                </button>
              ))}
            </div>
            <span className="mt-2 block text-xs text-text-secondary">
              {pointCenterReady
                ? translations.zoneCreatePointReady
                : translations.zoneCreatePointHint}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="border-b border-outline-variant/20 pb-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
            {translations.zoneCreateSectionMetrics}
          </span>
        </div>

        <div className="mt-5 space-y-6">
          <MetricGroup
            title={translations.zoneCreateMetricCrime}
            icon={<CategoryIcon category="crime" />}
            scores={crimeScores}
            onScoreChange={(segment, score) =>
              onMetricScoreChange("crime", segment, score)
            }
            translations={translations}
          />

          <MetricGroup
            title={translations.zoneCreateMetricFootTraffic}
            icon={<CategoryIcon category="foot_traffic" />}
            scores={footTrafficScores}
            onScoreChange={(segment, score) =>
              onMetricScoreChange("foot_traffic", segment, score)
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
                  <CategoryIcon category="lighting" />
                  <span>{translations.zoneCreateInfrastructureLighting}</span>
                </span>
              </span>
              <select
                value={infrastructureScores.lighting ?? ""}
                onChange={(event) =>
                  event.target.value
                    ? onInfrastructureScoreChange(
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
                  <CategoryIcon category="cctv" />
                  <span>{translations.zoneCreateInfrastructureCctv}</span>
                </span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
                {translations.zoneCreateMetricScaleLabel}
              </span>
            </div>
            <InfrastructureScale
              value={infrastructureScores.cctv}
              onChange={(score) => onInfrastructureScoreChange("cctv", score)}
              translations={translations}
            />
          </div>

          <div className="rounded-[1rem] border border-outline-variant/20 bg-surface-low px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {translations.zoneCreateInfrastructureVigilance}
              </span>
            </div>
            <MetricGroup
              title={translations.zoneCreateInfrastructureVigilance}
              icon={<CategoryIcon category="vigilance" />}
              scores={infrastructureScores.vigilance}
              onScoreChange={(segment, score) =>
                onMetricScoreChange("vigilance", segment, score)
              }
              translations={translations}
            />
          </div>
        </div>
      </section>

      {submitError ? (
        <p
          role="alert"
          className="mt-4 rounded-[0.9rem] bg-danger px-3 py-2 text-xs text-danger-foreground"
        >
          {submitError}
        </p>
      ) : null}
      {submitSuccess ? (
        <p className="mt-4 rounded-[0.9rem] bg-success px-3 py-2 text-xs text-success-foreground">
          {submitSuccess}
        </p>
      ) : null}

      <div className="mt-5 flex gap-3 pb-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-outline-variant/20 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-text-secondary transition-colors hover:bg-surface-high"
        >
          {translations.zoneCreateCancel}
        </button>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="primary-glow flex-1 rounded-xl px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary-foreground transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting
            ? translations.zoneCreateSubmitting
            : translations.zoneCreateSubmit}
        </button>
      </div>
    </form>
  );
}
