import { NextResponse } from "next/server";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
import {
  DuplicateZoneReportError,
  ReportZoneUseCase,
  ZoneReportValidationError,
} from "@/lib/zones/application/report-zone";
import { GetVisibleZoneDetailUseCase } from "@/lib/zones/application/get-visible-zone-detail";
import { SupabaseZoneRepository } from "@/lib/zones/infrastructure/supabase-zone-repository";
import { invalidateVisibleZonesCache } from "@/lib/zones/server/zones-cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ zoneId: string }> },
): Promise<Response> {
  const { zoneId } = await context.params;

  if (!zoneId || typeof zoneId !== "string") {
    return NextResponse.json(
      {
        error: "Missing zone id.",
      },
      { status: 400 },
    );
  }

  const viewer = await getCurrentAuthUserSnapshot();

  if (viewer.isAnonymous || !viewer.id) {
    return NextResponse.json(
      {
        error: "Authentication is required to report zones.",
      },
      { status: 401 },
    );
  }

  try {
    const [payload, supabase] = await Promise.all([
      request.json(),
      getSupabaseServerClient(),
    ]);

    const repository = new SupabaseZoneRepository(supabase);
    const detailUseCase = new GetVisibleZoneDetailUseCase(repository);
    const reportUseCase = new ReportZoneUseCase(repository);
    const detail = await detailUseCase.execute(zoneId, viewer.id);

    if (!detail) {
      return NextResponse.json(
        {
          error: "Zone not found.",
        },
        { status: 404 },
      );
    }

    const result = await reportUseCase.execute({
      zoneId,
      reporterUserId: viewer.id,
      reason: (payload as { reason?: unknown }).reason,
      details: (payload as { details?: unknown }).details,
    });

    await invalidateVisibleZonesCache();

    return NextResponse.json(
      {
        success: true,
        zoneHidden: result.zoneHidden,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ZoneReportValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    if (error instanceof DuplicateZoneReportError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to report zone.",
        details: toErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
