import { GetVisibleZoneDetailUseCase } from "@/lib/zones/application/get-visible-zone-detail";
import { toZoneDetailDTO } from "@/lib/zones/application/zone-detail-dto";
import { getCurrentAuthUserSnapshot } from "@/lib/auth/server/get-current-auth-user";
import { SupabaseZoneRepository } from "@/lib/zones/infrastructure/supabase-zone-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ zoneId: string }> },
): Promise<Response> {
  const { zoneId } = await context.params;

  if (!zoneId || typeof zoneId !== "string") {
    return Response.json(
      {
        error: "Missing zone id.",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = await getSupabaseServerClient();
    const repository = new SupabaseZoneRepository(supabase);
    const useCase = new GetVisibleZoneDetailUseCase(repository);
    const viewer = await getCurrentAuthUserSnapshot();
    const detail = await useCase.execute(zoneId, viewer.id);

    if (!detail) {
      return Response.json(
        {
          error: "Zone not found.",
        },
        { status: 404 },
      );
    }

    return Response.json({
      detail: toZoneDetailDTO(detail),
    });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to load zone detail.",
        details: toErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
