import "server-only";

import { ListVisibleZonesUseCase } from "../application/list-visible-zones";
import { toZoneDTO, type ZoneDTO } from "../application/zone-dto";
import { SupabaseZoneRepository } from "../infrastructure/supabase-zone-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getVisibleZoneDTOs(): Promise<ZoneDTO[]> {
  const supabase = await getSupabaseServerClient();
  const repository = new SupabaseZoneRepository(supabase);
  const useCase = new ListVisibleZonesUseCase(repository);
  const zones = await useCase.execute();

  return zones.map((zone) => toZoneDTO(zone));
}
