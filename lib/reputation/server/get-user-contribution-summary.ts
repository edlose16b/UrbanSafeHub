import "server-only";

import { GetUserContributionSummaryUseCase } from "../application/get-user-contribution-summary";
import type { UserContributionSummarySnapshot } from "../domain/points";
import { SupabaseUserContributionRepository } from "../infrastructure/supabase-user-contribution-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getUserContributionSummary(
  userId: string,
): Promise<UserContributionSummarySnapshot> {
  const supabase = await getSupabaseServerClient();
  const repository = new SupabaseUserContributionRepository(supabase);
  const useCase = new GetUserContributionSummaryUseCase(repository);

  return useCase.execute(userId);
}
