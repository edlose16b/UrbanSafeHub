"use server";

import { revalidatePath } from "next/cache";
import { SignOutUseCase } from "@/lib/auth/application/sign-out";
import { SupabaseAuthProviderGateway } from "@/lib/auth/infrastructure/supabase-auth-provider-gateway";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const authProvider = new SupabaseAuthProviderGateway(supabase);
  const signOutUseCase = new SignOutUseCase(authProvider);

  await signOutUseCase.execute();
  revalidatePath("/", "layout");
}
