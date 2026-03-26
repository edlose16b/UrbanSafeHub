import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import dictionary from "@/app/i18n/dictionaries/en.json";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { MapTranslations } from "../map-screen";
import { ZoneDetailCard } from "../zone-detail-card";

const translations = dictionary.map as MapTranslations;

function createDetail(): ZoneDetailDTO {
  return {
    zone: {
      id: "zone-1",
      name: "Universitaria Hub",
      description: "Near the main avenue and bus stop.",
      geometry: {
        type: "Point",
        coordinates: [-77.0428, -12.0464],
        radiusM: 150,
      },
      crimeLevel: 4.2,
      createdBy: "user-1",
      createdAt: "2026-03-20T10:00:00.000Z",
    },
    aggregates: [
      { categorySlug: "crime", timeSegment: null, avgScore: 4.2, ratingsCount: 6 },
      { categorySlug: "crime", timeSegment: "morning", avgScore: 5, ratingsCount: 2 },
      { categorySlug: "crime", timeSegment: "afternoon", avgScore: 4, ratingsCount: 2 },
      { categorySlug: "crime", timeSegment: "night", avgScore: 3, ratingsCount: 1 },
      { categorySlug: "crime", timeSegment: "early_morning", avgScore: 2, ratingsCount: 1 },
      { categorySlug: "lighting", timeSegment: null, avgScore: 4, ratingsCount: 4 },
      { categorySlug: "foot_traffic", timeSegment: "morning", avgScore: 4.5, ratingsCount: 2 },
      { categorySlug: "foot_traffic", timeSegment: "afternoon", avgScore: 4, ratingsCount: 2 },
      { categorySlug: "foot_traffic", timeSegment: "night", avgScore: 3, ratingsCount: 1 },
      { categorySlug: "foot_traffic", timeSegment: "early_morning", avgScore: 1.5, ratingsCount: 1 },
      { categorySlug: "vigilance", timeSegment: "morning", avgScore: 5, ratingsCount: 2 },
      { categorySlug: "vigilance", timeSegment: "afternoon", avgScore: 5, ratingsCount: 2 },
      { categorySlug: "vigilance", timeSegment: "night", avgScore: 4.8, ratingsCount: 1 },
      { categorySlug: "vigilance", timeSegment: "early_morning", avgScore: 4.5, ratingsCount: 1 },
      { categorySlug: "cctv", timeSegment: null, avgScore: 4.6, ratingsCount: 4 },
    ],
    comments: [
      {
        id: "comment-1",
        userId: "user-1",
        body: "Good lighting near the station entrance.",
        createdAt: "2026-03-21T10:00:00.000Z",
      },
    ],
  };
}

describe("ZoneDetailCard", () => {
  it("renders the hero, summaries, compact metrics, and secondary sections", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        onClose={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getByText("Near the main avenue and bus stop.")).toBeTruthy();
    expect(screen.getByAltText("Street view of Universitaria Hub")).toBeTruthy();
    expect(screen.getByText("Safe hub")).toBeTruthy();
    expect(screen.getByText("Infrastructure")).toBeTruthy();
    expect(screen.getByText("Zone data")).toBeTruthy();
    expect(screen.getAllByText("☀️").length).toBeGreaterThan(0);
    expect(screen.getAllByText("🌙").length).toBeGreaterThan(0);
    expect(screen.getAllByText("★").length).toBeGreaterThan(3);
    expect(screen.getByLabelText("4.2/5")).toBeTruthy();
    expect(screen.getByText("Good lighting near the station entrance.")).toBeTruthy();
  });

  it("shows no-data fallback for missing segment aggregates", () => {
    const detail = createDetail();
    detail.aggregates = detail.aggregates.filter(
      (aggregate) => aggregate.timeSegment !== "night" && aggregate.timeSegment !== "early_morning",
    );

    render(
      <ZoneDetailCard
        lang="en"
        detail={detail}
        isLoading={false}
        error={null}
        onClose={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("derives the general score from segment averages when general aggregate is missing", () => {
    const detail = createDetail();
    detail.aggregates = detail.aggregates.filter(
      (aggregate) => !(aggregate.categorySlug === "crime" && aggregate.timeSegment === null),
    );

    render(
      <ZoneDetailCard
        lang="en"
        detail={detail}
        isLoading={false}
        error={null}
        onClose={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getByLabelText("3.5/5")).toBeTruthy();
  });

  it("keeps comments and metadata visible as lower-priority sections", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        onClose={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getAllByText("Recent comments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("user-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Point").length).toBeGreaterThan(0);
  });
});
