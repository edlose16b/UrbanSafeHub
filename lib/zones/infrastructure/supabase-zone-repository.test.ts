import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseZoneRepository } from "./supabase-zone-repository";

function createRepositoryHarness() {
  const ratingsInsert = vi.fn().mockResolvedValue({ error: null });
  const reportsInsert = vi.fn().mockResolvedValue({ error: null });
  const visibilityMaybeSingle = vi.fn().mockResolvedValue({
    data: { visibility: "hidden" },
    error: null,
  });
  const visibilityEq = vi.fn().mockReturnValue({
    maybeSingle: visibilityMaybeSingle,
  });
  const visibilitySelect = vi.fn().mockReturnValue({
    eq: visibilityEq,
  });

  const supabase = {
    from(table: string) {
      if (table === "zone_ratings") {
        return {
          insert: ratingsInsert,
        };
      }

      if (table === "moderation_reports") {
        return {
          insert: reportsInsert,
        };
      }

      if (table === "zones") {
        return {
          select: visibilitySelect,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return {
    repository: new SupabaseZoneRepository(supabase),
    ratingsInsert,
    reportsInsert,
    visibilitySelect,
    visibilityEq,
    visibilityMaybeSingle,
  };
}

describe("SupabaseZoneRepository.submitRatings", () => {
  it("inserts anonymous ratings without touching actor persistence", async () => {
    const { repository, ratingsInsert } = createRepositoryHarness();

    await repository.submitRatings({
      zoneId: "zone-1",
      userId: null,
      anonymousFingerprint: "fingerprint-1",
      ratings: [
        { categorySlug: "lighting", timeSegment: null, score: 4 },
      ],
    });

    expect(ratingsInsert).toHaveBeenCalledWith([
      {
        zone_id: "zone-1",
        user_id: null,
        anonymous_fingerprint: "fingerprint-1",
        category_slug: "lighting",
        time_segment: null,
        score: 4,
        is_current: true,
      },
    ]);
  });

  it("skips anonymous actor persistence for authenticated ratings", async () => {
    const { repository, ratingsInsert } = createRepositoryHarness();

    await repository.submitRatings({
      zoneId: "zone-1",
      userId: "user-1",
      anonymousFingerprint: null,
      ratings: [
        { categorySlug: "crime", timeSegment: "morning", score: 3 },
      ],
    });

    expect(ratingsInsert).toHaveBeenCalledTimes(1);
  });
});

describe("SupabaseZoneRepository.reportZone", () => {
  it("returns whether the zone was hidden after the report", async () => {
    const { repository, reportsInsert, visibilitySelect, visibilityEq } =
      createRepositoryHarness();

    await expect(
      repository.reportZone({
        zoneId: "zone-1",
        reporterUserId: "user-1",
        reason: "wrong_location",
        details: null,
      }),
    ).resolves.toEqual({ zoneHidden: true });

    expect(reportsInsert).toHaveBeenCalledWith({
      target_type: "zone",
      target_id: "zone-1",
      reporter_user_id: "user-1",
      reason: "wrong_location",
      details: null,
      status: "open",
    });
    expect(visibilitySelect).toHaveBeenCalledWith("visibility");
    expect(visibilityEq).toHaveBeenCalledWith("id", "zone-1");
  });
});
