"use client";

import { useMemo, useState } from "react";
import { SignInWithGoogleUseCase } from "@/lib/auth/application/sign-in-with-google";
import type { AuthMenuTranslations } from "@/features/auth/presentation/components/auth-avatar-menu";
import { SupabaseAuthProviderGateway } from "@/lib/auth/infrastructure/supabase-auth-provider-gateway";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type CreateZoneButtonProps = {
  lang: string;
  isAuthenticated: boolean;
  isCreateMode: boolean;
  onSetCreateMode: (nextValue: boolean) => void;
  translations: Pick<
    AuthMenuTranslations,
    "createZone" | "exitCreateZone" | "signInWithGoogle"
  >;
  className?: string;
};

export function CreateZoneButton({
  lang,
  isAuthenticated,
  isCreateMode,
  onSetCreateMode,
  translations,
  className,
}: CreateZoneButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const authProvider = useMemo(
    () => new SupabaseAuthProviderGateway(supabase),
    [supabase],
  );
  const signInWithGoogleUseCase = useMemo(
    () => new SignInWithGoogleUseCase(authProvider),
    [authProvider],
  );

  async function handleClick() {
    if (isAuthenticated) {
      onSetCreateMode(!isCreateMode);
      return;
    }

    setIsPending(true);

    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/${lang}`;
      await signInWithGoogleUseCase.execute(redirectTo);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleClick();
      }}
      disabled={isPending}
      title={!isAuthenticated ? translations.signInWithGoogle : undefined}
      className={className}
    >
      {isCreateMode ? translations.exitCreateZone : translations.createZone}
    </button>
  );
}
