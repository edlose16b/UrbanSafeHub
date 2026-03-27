import { NextResponse } from "next/server";
import { SyncProfileFromSessionUseCase } from "@/lib/auth/application/sync-profile-from-session";
import { SupabaseAuthProviderGateway } from "@/lib/auth/infrastructure/supabase-auth-provider-gateway";
import { SupabaseProfileRepository } from "@/lib/auth/infrastructure/supabase-profile-repository";
import { getAuthRedirectBaseUrl } from "@/lib/auth/presentation/get-auth-redirect-base-url";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function toSafePath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/en";
  }

  if (nextPath.startsWith("//")) {
    return "/en";
  }

  return nextPath;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = toSafePath(requestUrl.searchParams.get("next"));
  const redirectBaseUrl = getAuthRedirectBaseUrl();

  if (!code) {
    return NextResponse.redirect(new URL(nextPath, redirectBaseUrl));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (!error) {
    const authProvider = new SupabaseAuthProviderGateway(supabase);
    const profileRepository = new SupabaseProfileRepository(supabase);
    const syncProfileFromSession = new SyncProfileFromSessionUseCase(
      authProvider,
      profileRepository,
    );

    await syncProfileFromSession.execute();
  }

  return NextResponse.redirect(new URL(nextPath, redirectBaseUrl));
}
