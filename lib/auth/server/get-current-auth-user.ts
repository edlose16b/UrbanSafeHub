import "server-only";

import { GetCurrentUserUseCase } from "../application/get-current-user";
import type { AuthUserSnapshot } from "../domain/auth-user";
import { SupabaseAuthProviderGateway } from "../infrastructure/supabase-auth-provider-gateway";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentAuthUserSnapshot(): Promise<AuthUserSnapshot> {
  const supabase = await getSupabaseServerClient();
  const authProvider = new SupabaseAuthProviderGateway(supabase);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(authProvider);

  return getCurrentUserUseCase.execute();
}
