import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseZoneRepository } from "./supabase-zone-repository";

function createRepositoryHarness() {
  const actorUpsert = vi.fn().mockResolvedValue({ error: null });
  const ratingsInsert = vi.fn().mockResolvedValue({ error: null });

  const supabase = {
    from(table: string) {
      if (table === "anonymous_vote_actors") {
        return {
          upsert: actorUpsert,
        };
      }

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
    actorUpsert,
    ratingsInsert,
  };
}

describe("SupabaseZoneRepository.submitRatings", () => {
  it("records an anonymous actor before inserting anonymous ratings", async () => {
    const { repository, actorUpsert, ratingsInsert } = createRepositoryHarness();

    await repository.submitRatings({
      zoneId: "zone-1",
      userId: null,
      anonymousFingerprint: "fingerprint-1",
      anonymousActor: {
        fingerprintHash: "fingerprint-1",
        ipHash: "ip-hash-1",
        userAgentHash: "ua-hash-1",
      },
      ratings: [
        { categorySlug: "lighting", timeSegment: null, score: 4 },
      ],
    });

    expect(actorUpsert).toHaveBeenCalledWith(
      {
        fingerprint_hash: "fingerprint-1",
        last_ip_hash: "ip-hash-1",
        last_user_agent_hash: "ua-hash-1",
        last_zone_id: "zone-1",
      },
      { onConflict: "fingerprint_hash" },
    );
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
    const { repository, actorUpsert, ratingsInsert } = createRepositoryHarness();

    await repository.submitRatings({
      zoneId: "zone-1",
      userId: "user-1",
      anonymousFingerprint: null,
      anonymousActor: null,
      ratings: [
        { categorySlug: "crime", timeSegment: "morning", score: 3 },
      ],
    });

    expect(actorUpsert).not.toHaveBeenCalled();
    expect(ratingsInsert).toHaveBeenCalledTimes(1);
  });
});
