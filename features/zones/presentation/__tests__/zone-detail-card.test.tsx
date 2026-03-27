import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import dictionary from "@/app/i18n/dictionaries/en.json";
import type { ZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import type { MapTranslations } from "../types/map-translations";
import { ZoneDetailCard } from "../components/zone-detail-card";

const translations = dictionary.map as MapTranslations;

afterEach(() => {
  cleanup();
});

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
    viewerRatings: [],
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
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getByText("Near the main avenue and bus stop.")).toBeTruthy();
    expect(screen.getByText("Safe hub")).toBeTruthy();
    expect(screen.getByText("Infrastructure")).toBeTruthy();
    expect(screen.getByText("Report this zone")).toBeTruthy();
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
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
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
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getByLabelText("3.5/5")).toBeTruthy();
  });

  it("keeps comments and moderation actions visible as lower-priority sections", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getAllByText("Recent comments").length).toBeGreaterThan(0);
    expect(screen.getByText("Good lighting near the station entrance.")).toBeTruthy();
    expect(screen.getByText("Report this zone")).toBeTruthy();
  });

  it("prefills the authenticated vote state for the active segment", () => {
    const detail = createDetail();
    detail.viewerRatings = [
      { categorySlug: "crime", timeSegment: "morning", score: 3 },
      { categorySlug: "lighting", timeSegment: null, score: 4 },
    ];

    render(
      <ZoneDetailCard
        lang="en"
        detail={detail}
        isLoading={false}
        error={null}
        isAuthenticated
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Rate zone" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Customize schedule" })[0]);

    expect(screen.getByText("You already voted for this time segment. Sending again will update your current rating.")).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Crime safety · Morning · 3/5",
      }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("expands the metric schedule editor using the creation-style UI", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Rate zone" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Customize schedule" })[0]);

    expect(
      screen.getByRole("button", {
        name: "Crime safety · Morning · 1/5",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Crime safety").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lighting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Morning").length).toBeGreaterThan(0);
  });

  it("keeps the voting form hidden until the user opens it", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Rate zone" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Time segment")).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit rating" })).toBeNull();
  });

  it("shows a sign-in requirement for anonymous users in the report panel", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        isAuthenticated={false}
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    expect(screen.getByText("Sign in to report this zone.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Report zone" })).toBeNull();
  });

  it("opens the report composer for authenticated users", () => {
    render(
      <ZoneDetailCard
        lang="en"
        detail={createDetail()}
        isLoading={false}
        error={null}
        isAuthenticated
        onClose={() => {}}
        onRefreshDetail={async () => null}
        onZoneHidden={() => {}}
        translations={translations}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Report zone" }));

    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send report" })).toBeTruthy();
  });
});
