"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GetCurrentUserUseCase } from "@/lib/auth/application/get-current-user";
import { SignInWithGoogleUseCase } from "@/lib/auth/application/sign-in-with-google";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import { SupabaseAuthProviderGateway } from "@/lib/auth/infrastructure/supabase-auth-provider-gateway";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOutAction } from "@/features/auth/actions/auth-avatar-menu.actions";

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
  onSignedOut?: () => void;
  translations: AuthMenuTranslations;
};

export default function AuthAvatarMenu({
  lang,
  initialUser,
  onSignedOut,
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

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

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
      await signOutAction();
      setCurrentUser({
        id: null,
        email: null,
        displayName: null,
        avatarUrl: null,
        isAnonymous: true,
      });
      onSignedOut?.();
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
    <div className="relative z-[1300]" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label={translations.openMenu}
        className="glass-panel ghost-outline flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-foreground transition-colors hover:bg-surface-bright/70"
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
        <div className="glass-panel ghost-outline absolute right-0 z-[1400] mt-2 w-56 rounded-[1.1rem] p-2 text-sm text-foreground">
          {currentUser.isAnonymous ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending}
              className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-high disabled:cursor-not-allowed disabled:opacity-50"
            >
              {translations.signInWithGoogle}
            </button>
          ) : (
            <>
              <div className="rounded-xl px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-foreground">
                  {currentUser.displayName ?? currentUser.email ?? translations.anonymousLabel}
                </p>
                {currentUser.email ? (
                  <p className="truncate text-xs text-text-secondary">{currentUser.email}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isPending}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-danger-foreground transition-colors hover:bg-danger disabled:cursor-not-allowed disabled:opacity-50"
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
