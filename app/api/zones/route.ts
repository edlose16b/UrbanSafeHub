import type { NextRequest } from "next/server";
import { CreateZoneUseCase } from "@/lib/zones/application/create-zone";
import { ListVisibleZonesUseCase } from "@/lib/zones/application/list-visible-zones";
import { toZoneDTO } from "@/lib/zones/application/zone-dto";
import { ZoneValidationError } from "@/lib/zones/domain/validation";
import { SupabaseZoneRepository } from "@/lib/zones/infrastructure/supabase-zone-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function isMissingSessionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("auth session missing") ||
    normalized.includes("session missing")
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}

export async function GET(): Promise<Response> {
  try {
    const supabase = await getSupabaseServerClient();
    const repository = new SupabaseZoneRepository(supabase);
    const useCase = new ListVisibleZonesUseCase(repository);
    const zones = await useCase.execute();

    return Response.json({
      zones: zones.map((zone) => toZoneDTO(zone)),
    });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to list zones.",
        details: toErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    if (isMissingSessionError(authError.message)) {
      return Response.json(
        {
          error: "Authentication is required to create zones.",
        },
        { status: 401 },
      );
    }

    return Response.json(
      {
        error: "Unable to verify authenticated user.",
        details: authError.message,
      },
      { status: 500 },
    );
  }

  if (!user) {
    return Response.json(
      {
        error: "Authentication is required to create zones.",
      },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error: "Invalid JSON payload.",
      },
      { status: 400 },
    );
  }

  const repository = new SupabaseZoneRepository(supabase);
  const useCase = new CreateZoneUseCase(repository);
  const candidate = (payload ?? {}) as {
    name?: unknown;
    zoneType?: unknown;
    geometry?: unknown;
  };

  try {
    const createdZone = await useCase.execute({
      name: candidate.name,
      zoneType: candidate.zoneType,
      geometry: candidate.geometry,
      createdBy: user.id,
    });

    return Response.json(
      {
        zone: toZoneDTO(createdZone),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZoneValidationError) {
      return Response.json(
        {
          error: error.message,
        },
        { status: 400 },
      );
    }

    return Response.json(
      {
        error: "Unable to create zone.",
        details: toErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
