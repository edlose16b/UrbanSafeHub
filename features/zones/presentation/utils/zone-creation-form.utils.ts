import { SEGMENT_ORDER, type SegmentKey } from "@/lib/zones/rating-time-segments";

export type ZoneRatingScore = 1 | 2 | 3 | 4 | 5;
export type NullableZoneRatingScore = ZoneRatingScore | null;

export type ZoneCreationMetricScores = Record<SegmentKey, NullableZoneRatingScore>;

export type ZoneCreationInfrastructureScores = {
  lighting: NullableZoneRatingScore;
  cctv: NullableZoneRatingScore;
  vigilance: ZoneCreationMetricScores;
};

export type ZoneCreationRatingPayload = {
  categorySlug: "crime" | "foot_traffic" | "lighting" | "cctv" | "vigilance";
  timeSegment: SegmentKey | null;
  score: ZoneRatingScore;
};

export type MetricScoresSummary = {
  displayScore: NullableZoneRatingScore;
  hasAnyScore: boolean;
  isUniform: boolean;
};

export function createEmptyMetricScores(): ZoneCreationMetricScores {
  return {
    morning: null,
    afternoon: null,
    night: null,
    early_morning: null,
  };
}

export function createEmptyInfrastructureScores(): ZoneCreationInfrastructureScores {
  return {
    lighting: null,
    cctv: null,
    vigilance: createEmptyMetricScores(),
  };
}

export function isZoneRatingScore(value: unknown): value is ZoneRatingScore {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 5
  );
}

export function hasCompleteMetricScores(scores: ZoneCreationMetricScores): boolean {
  return SEGMENT_ORDER.every((segment) => isZoneRatingScore(scores[segment]));
}

export function fillMetricScores(score: ZoneRatingScore): ZoneCreationMetricScores {
  return {
    morning: score,
    afternoon: score,
    night: score,
    early_morning: score,
  };
}

export function summarizeMetricScores(scores: ZoneCreationMetricScores): MetricScoresSummary {
  const values = SEGMENT_ORDER.map((segment) => scores[segment]);
  const validValues = values.filter(isZoneRatingScore);

  if (validValues.length === 0) {
    return {
      displayScore: null,
      hasAnyScore: false,
      isUniform: false,
    };
  }

  const firstValue = values[0];
  const isUniform =
    isZoneRatingScore(firstValue) &&
    SEGMENT_ORDER.every((segment) => scores[segment] === firstValue);

  if (isUniform) {
    return {
      displayScore: firstValue,
      hasAnyScore: true,
      isUniform: true,
    };
  }

  const average = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  const roundedAverage = Math.max(1, Math.min(5, Math.round(average))) as ZoneRatingScore;

  return {
    displayScore: roundedAverage,
    hasAnyScore: true,
    isUniform: false,
  };
}

export function hasCompleteInfrastructureScores(
  scores: ZoneCreationInfrastructureScores,
): boolean {
  return (
    isZoneRatingScore(scores.lighting) &&
    isZoneRatingScore(scores.cctv) &&
    hasCompleteMetricScores(scores.vigilance)
  );
}

export function buildZoneCreationRatingsPayload(input: {
  crimeScores: ZoneCreationMetricScores;
  footTrafficScores: ZoneCreationMetricScores;
  infrastructureScores: ZoneCreationInfrastructureScores;
}): ZoneCreationRatingPayload[] {
  const { crimeScores, footTrafficScores, infrastructureScores } = input;
  return [
    ...SEGMENT_ORDER.flatMap((timeSegment) =>
      isZoneRatingScore(crimeScores[timeSegment])
        ? [
            {
              categorySlug: "crime" as const,
              timeSegment,
              score: crimeScores[timeSegment],
            },
          ]
        : [],
    ),
    ...SEGMENT_ORDER.flatMap((timeSegment) =>
      isZoneRatingScore(footTrafficScores[timeSegment])
        ? [
            {
              categorySlug: "foot_traffic" as const,
              timeSegment,
              score: footTrafficScores[timeSegment],
            },
          ]
        : [],
    ),
    ...(isZoneRatingScore(infrastructureScores.lighting)
      ? [
          {
            categorySlug: "lighting" as const,
            timeSegment: null,
            score: infrastructureScores.lighting,
          },
        ]
      : []),
    ...(isZoneRatingScore(infrastructureScores.cctv)
      ? [
          {
            categorySlug: "cctv" as const,
            timeSegment: null,
            score: infrastructureScores.cctv,
          },
        ]
      : []),
    ...SEGMENT_ORDER.flatMap((timeSegment) =>
      isZoneRatingScore(infrastructureScores.vigilance[timeSegment])
        ? [
            {
              categorySlug: "vigilance" as const,
              timeSegment,
              score: infrastructureScores.vigilance[timeSegment],
            },
          ]
        : [],
    ),
  ];
}
