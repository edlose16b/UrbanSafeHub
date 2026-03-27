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

  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: { points: 7 },
    error: null,
  });
  const profileEq = vi.fn().mockReturnValue({
    maybeSingle: profileMaybeSingle,
  });
  const profileSelect = vi.fn().mockReturnValue({
    eq: profileEq,
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
        if (table === "profiles") {
          return {
            select: profileSelect,
          };
        }

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
    profileSelect,
    profileEq,
    profileMaybeSingle,
    totalSelect,
    totalEq,
  };
}

describe("SupabaseUserContributionRepository", () => {
  it("returns total points, the derived badge, and recent events", async () => {
    const { repository, recentEq, profileEq, totalEq } = createSupabaseHarness();

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
    expect(profileEq).toHaveBeenCalledWith("id", "user-1");
    expect(totalEq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("falls back to an empty summary when the points table is not deployed yet", async () => {
    let callCount = 0;
    const supabase = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: {
                        code: "PGRST204",
                        message:
                          "Could not find the 'points' column of 'profiles' in the schema cache",
                      },
                    }),
                  };
                },
              };
            },
          };
        }

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

  it("falls back to summing the ledger when profiles.points is not deployed yet", async () => {
    let ledgerCallCount = 0;
    const supabase = {
      from(table: string) {
        if (table === "profiles") {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: null,
                      error: {
                        code: "PGRST204",
                        message:
                          "Could not find the 'points' column of 'profiles' in the schema cache",
                      },
                    }),
                  };
                },
              };
            },
          };
        }

        if (table !== "user_point_events") {
          throw new Error(`Unexpected table: ${table}`);
        }

        ledgerCallCount += 1;

        return {
          select() {
            return {
              eq() {
                if (ledgerCallCount === 1) {
                  return {
                    order() {
                      return {
                        limit: vi.fn().mockResolvedValue({
                          data: [
                            {
                              delta: 15,
                              reason: "zone_created",
                              created_at: "2026-03-26T10:00:00.000Z",
                            },
                          ],
                          error: null,
                        }),
                      };
                    },
                  };
                }

                return Promise.resolve({
                  data: [{ delta: 15 }, { delta: 2 }],
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
      totalPoints: 17,
      currentBadge: "neighbor",
      recentEvents: [
        {
          delta: 15,
          reason: "zone_created",
          createdAt: "2026-03-26T10:00:00.000Z",
        },
      ],
    });
  });
});
