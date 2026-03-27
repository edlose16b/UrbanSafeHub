import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseUserContributionRepository } from "./supabase-user-contribution-repository";

function createSupabaseHarness() {
  const recentLimit = vi.fn().mockResolvedValue({
    data: [
      {
        delta: 15,
        reason: "zone_created",
        created_at: "2026-03-26T10:00:00.000Z",
      },
      {
        delta: -10,
        reason: "zone_hidden_by_reports",
        created_at: "2026-03-25T10:00:00.000Z",
      },
    ],
    error: null,
  });
  const recentOrder = vi.fn().mockReturnValue({
    limit: recentLimit,
  });
  const recentEq = vi.fn().mockReturnValue({
    order: recentOrder,
  });
  const recentSelect = vi.fn().mockReturnValue({
    eq: recentEq,
  });

  const totalEq = vi.fn().mockResolvedValue({
    data: [{ delta: 15 }, { delta: -10 }, { delta: 2 }],
    error: null,
  });
  const totalSelect = vi.fn().mockReturnValue({
    eq: totalEq,
  });

  let callCount = 0;
  const supabase = {
    from(table: string) {
      if (table !== "user_point_events") {
        throw new Error(`Unexpected table: ${table}`);
      }

      callCount += 1;

      return {
        select: callCount === 1 ? recentSelect : totalSelect,
      };
    },
  } as unknown as SupabaseClient;

  return {
    repository: new SupabaseUserContributionRepository(supabase),
    recentSelect,
    recentEq,
    recentOrder,
    recentLimit,
    totalSelect,
    totalEq,
  };
}

describe("SupabaseUserContributionRepository", () => {
  it("returns total points, the derived badge, and recent events", async () => {
    const { repository, recentEq, totalEq } = createSupabaseHarness();

    await expect(repository.getSummaryForUser("user-1")).resolves.toEqual({
      totalPoints: 7,
      currentBadge: "neighbor",
      recentEvents: [
        {
          delta: 15,
          reason: "zone_created",
          createdAt: "2026-03-26T10:00:00.000Z",
        },
        {
          delta: -10,
          reason: "zone_hidden_by_reports",
          createdAt: "2026-03-25T10:00:00.000Z",
        },
      ],
    });

    expect(recentEq).toHaveBeenCalledWith("user_id", "user-1");
    expect(totalEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("falls back to an empty summary when the points table is not deployed yet", async () => {
    let callCount = 0;
    const supabase = {
      from(table: string) {
        if (table !== "user_point_events") {
          throw new Error(`Unexpected table: ${table}`);
        }

        callCount += 1;

        return {
          select() {
            return {
              eq() {
                if (callCount === 1) {
                  return {
                    order() {
                      return {
                        limit: vi.fn().mockResolvedValue({
                          data: null,
                          error: {
                            code: "PGRST205",
                            message:
                              "Could not find the table 'public.user_point_events' in the schema cache",
                          },
                        }),
                      };
                    },
                  };
                }

                return Promise.resolve({
                  data: null,
                  error: null,
                });
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    const repository = new SupabaseUserContributionRepository(supabase);

    await expect(repository.getSummaryForUser("user-1")).resolves.toEqual({
      totalPoints: 0,
      currentBadge: "neighbor",
      recentEvents: [],
    });
  });
});
