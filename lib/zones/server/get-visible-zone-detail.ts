import "server-only";

import { cache } from "react";
import { GetVisibleZoneDetailUseCase } from "../application/get-visible-zone-detail";
import { toZoneDetailDTO, type ZoneDetailDTO } from "../application/zone-detail-dto";
import { SupabaseZoneRepository } from "../infrastructure/supabase-zone-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const getVisibleZoneDetail = cache(
  async (
    zoneId: string,
    viewerUserId?: string | null,
  ): Promise<ZoneDetailDTO | null> => {
    const supabase = await getSupabaseServerClient();
    const repository = new SupabaseZoneRepository(supabase);
    const useCase = new GetVisibleZoneDetailUseCase(repository);
    const detail = await useCase.execute(zoneId, viewerUserId);

    return detail ? toZoneDetailDTO(detail) : null;
  },
);
