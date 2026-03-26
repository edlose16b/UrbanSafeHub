import { describe, expect, it } from "vitest";
import {
  buildZoneCreationRatingsPayload,
  fillMetricScores,
  summarizeMetricScores,
} from "../zone-creation-form.utils";

describe("metric score helpers", () => {
  it("fills every time segment with the same score", () => {
    expect(fillMetricScores(4)).toEqual({
      morning: 4,
      afternoon: 4,
      night: 4,
      early_morning: 4,
    });
  });

  it("returns a uniform summary when all segments share the same score", () => {
    expect(
      summarizeMetricScores({
        morning: 3,
        afternoon: 3,
        night: 3,
        early_morning: 3,
      }),
    ).toEqual({
      displayScore: 3,
      hasAnyScore: true,
      isUniform: true,
    });
  });

  it("returns a rounded summary and customized state when segments differ", () => {
    expect(
      summarizeMetricScores({
        morning: 5,
        afternoon: 4,
        night: 2,
        early_morning: 1,
      }),
    ).toEqual({
      displayScore: 3,
      hasAnyScore: true,
      isUniform: false,
    });
  });
});

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
        vigilance: {
          morning: 2,
          afternoon: 3,
          night: 4,
          early_morning: 5,
        },
      },
    });

    expect(payload).toHaveLength(14);
    expect(
      payload.filter((rating) => rating.categorySlug === "vigilance"),
    ).toEqual([
      { categorySlug: "vigilance", timeSegment: "morning", score: 2 },
      { categorySlug: "vigilance", timeSegment: "afternoon", score: 3 },
      { categorySlug: "vigilance", timeSegment: "night", score: 4 },
      { categorySlug: "vigilance", timeSegment: "early_morning", score: 5 },
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
        vigilance: {
          morning: null,
          afternoon: null,
          night: null,
          early_morning: null,
        },
      },
    });

    expect(payload).toEqual([
      { categorySlug: "crime", timeSegment: "morning", score: 1 },
      { categorySlug: "cctv", timeSegment: null, score: 4 },
    ]);
  });
});
