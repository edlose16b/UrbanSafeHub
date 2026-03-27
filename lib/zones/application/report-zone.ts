import type {
  CreateZoneReportResult,
  ZoneCommandRepository,
  ZoneReportReason,
} from "../domain/ports";

const ZONE_REPORT_REASONS = [
  "duplicate_or_spam",
  "false_or_inaccurate_info",
  "offensive_or_harmful_content",
  "wrong_location",
  "other",
] as const satisfies readonly ZoneReportReason[];

export class ZoneReportValidationError extends Error {}

export class DuplicateZoneReportError extends Error {}

export type ReportZoneInput = {
  zoneId: string;
  reporterUserId: string;
  reason: unknown;
  details?: unknown;
};

function isZoneReportReason(value: unknown): value is ZoneReportReason {
  return (
    typeof value === "string" &&
    ZONE_REPORT_REASONS.includes(value as ZoneReportReason)
  );
}

function normalizeDetails(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class ReportZoneUseCase {
  constructor(private readonly commandRepository: ZoneCommandRepository) {}

  async execute(input: ReportZoneInput): Promise<CreateZoneReportResult> {
    if (!input.zoneId || typeof input.zoneId !== "string") {
      throw new ZoneReportValidationError("Missing zone id.");
    }

    if (!input.reporterUserId || typeof input.reporterUserId !== "string") {
      throw new ZoneReportValidationError("Authentication is required to report zones.");
    }

    if (!isZoneReportReason(input.reason)) {
      throw new ZoneReportValidationError("Invalid report reason.");
    }

    const details = normalizeDetails(input.details);

    if (input.reason === "other" && !details) {
      throw new ZoneReportValidationError(
        "Additional details are required when reporting with another reason.",
      );
    }

    if (details && details.length > 500) {
      throw new ZoneReportValidationError(
        "Report details cannot exceed 500 characters.",
      );
    }

    return this.commandRepository.reportZone({
      zoneId: input.zoneId,
      reporterUserId: input.reporterUserId,
      reason: input.reason,
      details,
    });
  }
}
