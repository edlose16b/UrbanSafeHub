export const CONTRIBUTION_BADGES = [
  { slug: "neighbor", minimumPoints: 0 },
  { slug: "guardian", minimumPoints: 25 },
  { slug: "sentinel", minimumPoints: 75 },
  { slug: "city_shaper", minimumPoints: 150 },
] as const;

export type ContributionBadge = (typeof CONTRIBUTION_BADGES)[number]["slug"];

export type PointEventReason =
  | "zone_created"
  | "zone_rating_added"
  | "zone_hidden_by_reports";

export type UserPointEventSnapshot = {
  delta: number;
  reason: PointEventReason;
  createdAt: string;
};

export type UserContributionSummarySnapshot = {
  totalPoints: number;
  currentBadge: ContributionBadge;
  recentEvents: UserPointEventSnapshot[];
};

export function getContributionBadge(totalPoints: number): ContributionBadge {
  let selectedBadge: ContributionBadge = CONTRIBUTION_BADGES[0].slug;

  for (const badge of CONTRIBUTION_BADGES) {
    if (totalPoints >= badge.minimumPoints) {
      selectedBadge = badge.slug;
    }
  }

  return selectedBadge;
}
