import { NextResponse } from "next/server";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
import { SubmitZoneRatingsUseCase } from "@/lib/zones/application/submit-zone-ratings";
import { GetVisibleZoneDetailUseCase } from "@/lib/zones/application/get-visible-zone-detail";
import { toZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { ZoneValidationError } from "@/lib/zones/domain/validation";
import { SupabaseZoneRepository } from "@/lib/zones/infrastructure/supabase-zone-repository";
import {
  buildAnonymousVoteIdentity,
  getClientIp,
} from "@/lib/zones/server/anonymous-vote-identity";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const ANONYMOUS_FINGERPRINT_COOKIE = "urban_safehub_anonymous_fingerprint";

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

  try {
    const [payload, viewer, supabase] = await Promise.all([
      request.json(),
      getCurrentAuthUserSnapshot(),
      getSupabaseServerClient(),
    ]);

    const repository = new SupabaseZoneRepository(supabase);
    const submitUseCase = new SubmitZoneRatingsUseCase(repository);
    const detailUseCase = new GetVisibleZoneDetailUseCase(repository);

    let anonymousFingerprint: string | null = null;
    let anonymousActor: {
      fingerprintHash: string;
      ipHash: string | null;
      userAgentHash: string | null;
    } | null = null;

    if (viewer.isAnonymous) {
      anonymousActor = buildAnonymousVoteIdentity({
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent"),
      });
      anonymousFingerprint = anonymousActor.fingerprintHash;
    }

    await submitUseCase.execute({
      zoneId,
      userId: viewer.id,
      anonymousFingerprint,
      anonymousActor,
      ratings: (payload as { ratings?: unknown }).ratings,
    });

    const detail = await detailUseCase.execute(zoneId, viewer.id);

    if (!detail) {
      return NextResponse.json(
        {
          error: "Zone not found.",
        },
        { status: 404 },
      );
    }

    const submittedRatings = Array.isArray((payload as { ratings?: unknown }).ratings)
      ? (payload as { ratings: unknown[] }).ratings
      : [];

    const response = NextResponse.json(
      {
        detail: toZoneDetailDTO(detail),
        acceptedRatingsCount: submittedRatings.length,
      },
      { status: 200 },
    );

    if (viewer.isAnonymous && anonymousFingerprint) {
      response.cookies.set({
        name: ANONYMOUS_FINGERPRINT_COOKIE,
        value: anonymousFingerprint,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ZoneValidationError) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to submit zone ratings.",
        details: toErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
