import type { TimeSegment } from "./domain/zone-detail";

/** Time-of-day keys used in zone rating aggregates (`time_segment`). */
export type SegmentKey = TimeSegment;

/** Display order for segment rows in the zone detail UI. */
export const SEGMENT_ORDER: readonly SegmentKey[] = [
  "morning",
  "afternoon",
  "night",
  "early_morning",
] as const satisfies readonly SegmentKey[];
