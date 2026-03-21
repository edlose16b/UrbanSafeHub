import type { NextRequest } from "next/server";
import { CreateZoneUseCase } from "@/lib/zones/application/create-zone";
import { ListVisibleZonesUseCase } from "@/lib/zones/application/list-visible-zones";
import { clampRadiusKm, parseFiniteNumber } from "@/lib/zones/utils/number";
import { toZoneDTO } from "@/lib/zones/application/zone-dto";
import {
  ZoneGeometryConflictError,
  ZoneValidationError,
} from "@/lib/zones/domain/validation";
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

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl;
  const lat = parseFiniteNumber(searchParams.get("lat"));
  const lng = parseFiniteNumber(searchParams.get("lng"));
  const rawRadiusKm = parseFiniteNumber(searchParams.get("radiusKm"));

  if (lat === null || lng === null || rawRadiusKm === null) {
    return Response.json(
      {
        error: "Missing or invalid query params. Required: lat, lng, radiusKm.",
      },
      { status: 400 },
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json(
      {
        error: "Invalid coordinates range.",
      },
      { status: 400 },
    );
  }

  const radiusKm = clampRadiusKm(rawRadiusKm);

  try {
    const supabase = await getSupabaseServerClient();
    const repository = new SupabaseZoneRepository(supabase);
    const useCase = new ListVisibleZonesUseCase(repository);
    const zones = await useCase.execute({
      lat,
      lng,
      radiusKm,
    });

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
    geometry?: unknown;
  };

  try {
    const createdZone = await useCase.execute({
      name: candidate.name,
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
    if (error instanceof ZoneGeometryConflictError) {
      return Response.json(
        {
          errorCode: "ZONE_GEOMETRY_CONFLICT",
          error: error.message,
        },
        { status: 409 },
      );
    }

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
