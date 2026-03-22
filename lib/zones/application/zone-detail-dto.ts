import type {
  TimeSegment,
  ZoneCommentSnapshot,
  ZoneDetailSnapshot,
  ZoneRatingAggregateSnapshot,
} from "../domain/zone-detail";
import type { ZoneDTO } from "./zone-dto";
import { toZoneDTO } from "./zone-dto";

export type ZoneDetailAggregateDTO = {
  categorySlug: string;
  timeSegment: TimeSegment | null;
  ratingsCount: number;
  avgScore: number | null;
};

export type ZoneDetailCommentDTO = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
};

export type ZoneDetailDTO = {
  zone: ZoneDTO;
  aggregates: ZoneDetailAggregateDTO[];
  comments: ZoneDetailCommentDTO[];
};

function toAggregateDTO(
  aggregate: ZoneRatingAggregateSnapshot,
): ZoneDetailAggregateDTO {
  return {
    categorySlug: aggregate.categorySlug,
    timeSegment: aggregate.timeSegment,
    ratingsCount: aggregate.ratingsCount,
    avgScore: aggregate.avgScore,
  };
}

function toCommentDTO(comment: ZoneCommentSnapshot): ZoneDetailCommentDTO {
  return {
    id: comment.id,
    userId: comment.userId,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

export function toZoneDetailDTO(detail: ZoneDetailSnapshot): ZoneDetailDTO {
  return {
    zone: toZoneDTO(detail.zone),
    aggregates: detail.aggregates.map(toAggregateDTO),
    comments: detail.comments.map(toCommentDTO),
  };
}
