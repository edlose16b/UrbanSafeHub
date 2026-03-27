import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserContributionRepository } from "../domain/ports";
import {
  getContributionBadge,
  type PointEventReason,
  type UserContributionSummarySnapshot,
  type UserPointEventSnapshot,
} from "../domain/points";

type PointEventRow = {
  delta: number;
  reason: PointEventReason;
  created_at: string;
};

type ProfilePointsRow = {
  points: number | null;
};

type SupabaseErrorLike = {
  code?: string;
  message: string;
};

function toEventSnapshot(row: PointEventRow): UserPointEventSnapshot {
  return {
    delta: row.delta,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function isMissingUserPointEventsTable(error: SupabaseErrorLike): boolean {
  return (
    error.code === "PGRST205" ||
    error.message.includes("Could not find the table 'public.user_point_events'") ||
    error.message.includes("relation \"public.user_point_events\" does not exist")
  );
}

function isMissingProfilePointsColumn(error: SupabaseErrorLike): boolean {
  return (
    error.code === "PGRST204" ||
    error.message.includes("Could not find the 'points' column of 'profiles'") ||
    error.message.includes('column profiles.points does not exist')
  );
}

export class SupabaseUserContributionRepository
  implements UserContributionRepository
{
  constructor(private readonly supabase: SupabaseClient) {}

  async getSummaryForUser(userId: string): Promise<UserContributionSummarySnapshot> {
    const [recentEventsResponse, profilePointsResponse, allEventsResponse] = await Promise.all([
      this.supabase
        .from("user_point_events")
        .select("delta, reason, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),
      this.supabase.from("profiles").select("points").eq("id", userId).maybeSingle(),
      this.supabase
        .from("user_point_events")
        .select("delta")
        .eq("user_id", userId),
    ]);
    const profilePointsColumnMissing =
      !!profilePointsResponse.error &&
      isMissingProfilePointsColumn(profilePointsResponse.error);

    if (
      recentEventsResponse.error &&
      isMissingUserPointEventsTable(recentEventsResponse.error)
    ) {
      return {
        totalPoints: 0,
        currentBadge: getContributionBadge(0),
        recentEvents: [],
      };
    }

    if (recentEventsResponse.error) {
      throw new Error(
        `Unable to load recent contribution events: ${recentEventsResponse.error.message}`,
      );
    }

    if (
      profilePointsResponse.error &&
      !profilePointsColumnMissing
    ) {
      throw new Error(
        `Unable to load contribution balance: ${profilePointsResponse.error.message}`,
      );
    }

    if (allEventsResponse.error && !profilePointsColumnMissing) {
      throw new Error(
        `Unable to load contribution total: ${allEventsResponse.error.message}`,
      );
    }

    const recentEvents = ((recentEventsResponse.data ?? []) as PointEventRow[]).map(
      toEventSnapshot,
    );
    const profilePoints = (profilePointsResponse.data as ProfilePointsRow | null)?.points;
    const totalPoints =
      typeof profilePoints === "number"
        ? profilePoints
        : ((allEventsResponse.data ?? []) as Array<{ delta: number }>).reduce(
            (sum, event) => sum + event.delta,
            0,
          );

    return {
      totalPoints,
      currentBadge: getContributionBadge(totalPoints),
      recentEvents,
    };
  }
}
