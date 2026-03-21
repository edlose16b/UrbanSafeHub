"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GetCurrentUserUseCase } from "@/lib/auth/application/get-current-user";
import { SignInWithGoogleUseCase } from "@/lib/auth/application/sign-in-with-google";
import { SignOutUseCase } from "@/lib/auth/application/sign-out";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import { SupabaseAuthProviderGateway } from "@/lib/auth/infrastructure/supabase-auth-provider-gateway";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type AuthMenuTranslations = {
  anonymousLabel: string;
  openMenu: string;
  signInWithGoogle: string;
  createZone: string;
  exitCreateZone: string;
  signOut: string;
};

type AuthAvatarMenuProps = {
  lang: string;
  initialUser: AuthUserSnapshot;
  isCreateMode: boolean;
  onSetCreateMode: (nextValue: boolean) => void;
  translations: AuthMenuTranslations;
};

export default function AuthAvatarMenu({
  lang,
  initialUser,
  isCreateMode,
  onSetCreateMode,
  translations,
}: AuthAvatarMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [currentUser, setCurrentUser] = useState(initialUser);

  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const authProvider = useMemo(
    () => new SupabaseAuthProviderGateway(supabase),
    [supabase],
  );
  const getCurrentUserUseCase = useMemo(
    () => new GetCurrentUserUseCase(authProvider),
    [authProvider],
  );
  const signInWithGoogleUseCase = useMemo(
    () => new SignInWithGoogleUseCase(authProvider),
    [authProvider],
  );
  const signOutUseCase = useMemo(
    () => new SignOutUseCase(authProvider),
    [authProvider],
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }

      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const user = await getCurrentUserUseCase.execute();
      setCurrentUser(user);
      router.refresh();
    });

    return () => subscription.unsubscribe();
  }, [getCurrentUserUseCase, router, supabase.auth]);

  async function handleGoogleSignIn() {
    setIsPending(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/${lang}`;
      await signInWithGoogleUseCase.execute(redirectTo);
    } finally {
      setIsPending(false);
    }
  }

  async function handleSignOut() {
    setIsPending(true);

    try {
      await signOutUseCase.execute();
      setCurrentUser({
        id: null,
        email: null,
        displayName: null,
        avatarUrl: null,
        isAnonymous: true,
      });
      onSetCreateMode(false);
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  const initials = (currentUser.displayName ?? translations.anonymousLabel)
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="relative z-[1000]" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={translations.openMenu}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-sm font-semibold text-foreground shadow-md transition-colors hover:bg-surface-solid"
      >
        {currentUser.avatarUrl ? (
          <Image
            src={currentUser.avatarUrl}
            alt={currentUser.displayName ?? "User avatar"}
            width={40}
            height={40}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-[1100] mt-2 w-52 rounded-xl border border-border bg-surface-solid p-2 text-sm text-foreground shadow-lg">
          {currentUser.isAnonymous ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending}
              className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translations.signInWithGoogle}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  onSetCreateMode(!isCreateMode);
                  setIsOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-muted"
              >
                {isCreateMode
                  ? translations.exitCreateZone
                  : translations.createZone}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-red-700 transition-colors hover:bg-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                {translations.signOut}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
