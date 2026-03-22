import type { ZoneSnapshot } from "./zone";

export type TimeSegment =
  | "morning"
  | "afternoon"
  | "night"
  | "early_morning";

export type ZoneRatingAggregateSnapshot = {
  categorySlug: string;
  timeSegment: TimeSegment | null;
  ratingsCount: number;
  avgScore: number | null;
};

export type ZoneCommentSnapshot = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type ZoneDetailSnapshot = {
  zone: ZoneSnapshot;
  aggregates: ZoneRatingAggregateSnapshot[];
  comments: ZoneCommentSnapshot[];
};
