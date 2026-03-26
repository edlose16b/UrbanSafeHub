import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseZoneRepository } from "./supabase-zone-repository";

function createRepositoryHarness() {
  const ratingsInsert = vi.fn().mockResolvedValue({ error: null });

  const supabase = {
    from(table: string) {
      if (table === "zone_ratings") {
        return {
          insert: ratingsInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  return {
    repository: new SupabaseZoneRepository(supabase),
    ratingsInsert,
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
