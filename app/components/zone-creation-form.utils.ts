import { SEGMENT_ORDER, type SegmentKey } from "@/lib/zones/rating-time-segments";

export type ZoneRatingScore = 1 | 2 | 3 | 4 | 5;
export type NullableZoneRatingScore = ZoneRatingScore | null;

export type ZoneCreationMetricScores = Record<SegmentKey, NullableZoneRatingScore>;

export type ZoneCreationInfrastructureScores = {
  lighting: NullableZoneRatingScore;
  cctv: NullableZoneRatingScore;
  vigilance: NullableZoneRatingScore;
};

export type ZoneCreationRatingPayload = {
  categorySlug: "crime" | "foot_traffic" | "lighting" | "cctv" | "vigilance";
  timeSegment: SegmentKey | null;
  score: ZoneRatingScore;
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
    vigilance: null,
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

export function hasCompleteInfrastructureScores(
  scores: ZoneCreationInfrastructureScores,
): boolean {
  return (
    isZoneRatingScore(scores.lighting) &&
    isZoneRatingScore(scores.cctv) &&
    isZoneRatingScore(scores.vigilance)
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
      isZoneRatingScore(infrastructureScores.vigilance)
        ? [
            {
              categorySlug: "vigilance" as const,
              timeSegment,
              score: infrastructureScores.vigilance,
            },
          ]
        : [],
    ),
  ];
}
