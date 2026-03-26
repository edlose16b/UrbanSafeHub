import { describe, expect, it } from "vitest";
import {
  ZoneValidationError,
  parseSubmitZoneRatings,
} from "./validation";

describe("parseSubmitZoneRatings", () => {
  it("accepts zone-style category and segment ratings", () => {
    expect(
      parseSubmitZoneRatings([
        { categorySlug: "crime", timeSegment: "morning", score: 4 },
        { categorySlug: "foot_traffic", timeSegment: "night", score: 3 },
        { categorySlug: "lighting", timeSegment: null, score: 5 },
      ]),
    ).toEqual([
      { categorySlug: "crime", timeSegment: "morning", score: 4 },
      { categorySlug: "foot_traffic", timeSegment: "night", score: 3 },
      { categorySlug: "lighting", timeSegment: null, score: 5 },
    ]);
  });

  it("rejects empty payloads", () => {
    expect(() => parseSubmitZoneRatings([])).toThrow("at least one rating");
  });

  it("rejects duplicate categories", () => {
    expect(() =>
      parseSubmitZoneRatings([
        { categorySlug: "crime", timeSegment: "morning", score: 4 },
        { categorySlug: "crime", timeSegment: "morning", score: 5 },
      ]),
    ).toThrow("Duplicate");
  });

  it("rejects scores outside range", () => {
    expect(() =>
      parseSubmitZoneRatings([{ categorySlug: "lighting", timeSegment: null, score: 9 }]),
    ).toThrow("between 1 and 5");
  });

  it("rejects missing required time segments for segmented categories", () => {
    expect(() =>
      parseSubmitZoneRatings([{ categorySlug: "crime", timeSegment: null, score: 3 }]),
    ).toThrow("requires a valid time segment");
  });
});
