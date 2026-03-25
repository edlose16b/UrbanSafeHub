import { describe, expect, it } from "vitest";
import { buildZoneCreationRatingsPayload } from "../zone-creation-form.utils";

describe("buildZoneCreationRatingsPayload", () => {
  it("expands the infrastructure vigilance score to all time segments", () => {
    const payload = buildZoneCreationRatingsPayload({
      crimeScores: {
        morning: 1,
        afternoon: 2,
        night: 3,
        early_morning: 4,
      },
      footTrafficScores: {
        morning: 5,
        afternoon: 4,
        night: 3,
        early_morning: 2,
      },
      infrastructureScores: {
        lighting: 5,
        cctv: 4,
        vigilance: 2,
      },
    });

    expect(payload).toHaveLength(14);
    expect(
      payload.filter((rating) => rating.categorySlug === "vigilance"),
    ).toEqual([
      { categorySlug: "vigilance", timeSegment: "morning", score: 2 },
      { categorySlug: "vigilance", timeSegment: "afternoon", score: 2 },
      { categorySlug: "vigilance", timeSegment: "night", score: 2 },
      { categorySlug: "vigilance", timeSegment: "early_morning", score: 2 },
    ]);
  });

  it("returns only the ratings that were actually selected", () => {
    const payload = buildZoneCreationRatingsPayload({
      crimeScores: {
        morning: 1,
        afternoon: null,
        night: null,
        early_morning: null,
      },
      footTrafficScores: {
        morning: null,
        afternoon: null,
        night: null,
        early_morning: null,
      },
      infrastructureScores: {
        lighting: null,
        cctv: 4,
        vigilance: null,
      },
    });

    expect(payload).toEqual([
      { categorySlug: "crime", timeSegment: "morning", score: 1 },
      { categorySlug: "cctv", timeSegment: null, score: 4 },
    ]);
  });
});
