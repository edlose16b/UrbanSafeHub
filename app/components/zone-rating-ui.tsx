"use client";

import type { SegmentKey } from "@/lib/zones/rating-time-segments";
import type { MapTranslations } from "./map-screen";

export const SCORE_OPTIONS = [1, 2, 3, 4, 5] as const;

export const SEGMENT_EMOJIS: Record<SegmentKey, string> = {
  morning: "☀️",
  afternoon: "🌤️",
  night: "🌙",
  early_morning: "🌑",
};

export function resolveSegmentLabel(
  segment: SegmentKey,
  translations: MapTranslations,
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

export function resolveMetricStarColor(score: number | null): string {
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

type ScoreStarsProps = {
  value: number | null;
  metricLabel: string;
  segmentLabel: string;
  className?: string;
  onScoreChange?: (score: (typeof SCORE_OPTIONS)[number]) => void;
};

export function ScoreStars({
  value,
  metricLabel,
  segmentLabel,
  className,
  onScoreChange,
}: ScoreStarsProps) {
  const activeColorClassName = resolveMetricStarColor(value);
  const rootClassName = `flex items-center justify-center gap-1 ${className ?? ""}`;

  if (!onScoreChange) {
    return (
      <div className={rootClassName}>
        {SCORE_OPTIONS.map((score) => (
          <span
            key={score}
            aria-hidden
            className={`rounded-md p-1 text-lg leading-none ${
              value !== null && score <= value ? activeColorClassName : "text-white/80"
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={rootClassName}>
      {SCORE_OPTIONS.map((score) => (
        <button
          key={score}
          type="button"
          onClick={() => onScoreChange(score)}
          aria-label={`${metricLabel} · ${segmentLabel} · ${score}/5`}
          aria-pressed={value === score}
          className={`rounded-md p-1 text-lg leading-none transition-colors hover:scale-105 ${
            value !== null && score <= value ? activeColorClassName : "text-white/80"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
