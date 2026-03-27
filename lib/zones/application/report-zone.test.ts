import { describe, expect, it, vi } from "vitest";
import {
  ReportZoneUseCase,
  ZoneReportValidationError,
} from "./report-zone";
import type { ZoneCommandRepository } from "../domain/ports";

function createRepository(): ZoneCommandRepository {
  return {
    create: vi.fn(),
    submitRatings: vi.fn(),
    reportZone: vi.fn().mockResolvedValue({ zoneHidden: false }),
  };
}

describe("ReportZoneUseCase", () => {
  it("requires details when the reason is other", async () => {
    const repository = createRepository();
    const useCase = new ReportZoneUseCase(repository);

    await expect(
      useCase.execute({
        zoneId: "zone-1",
        reporterUserId: "user-1",
        reason: "other",
        details: "   ",
      }),
    ).rejects.toBeInstanceOf(ZoneReportValidationError);
  });

  it("accepts a valid reason and trims optional details", async () => {
    const repository = createRepository();
    const useCase = new ReportZoneUseCase(repository);

    await expect(
      useCase.execute({
        zoneId: "zone-1",
        reporterUserId: "user-1",
        reason: "wrong_location",
        details: "  near the next block  ",
      }),
    ).resolves.toEqual({ zoneHidden: false });

    expect(repository.reportZone).toHaveBeenCalledWith({
      zoneId: "zone-1",
      reporterUserId: "user-1",
      reason: "wrong_location",
      details: "near the next block",
    });
  });
});
