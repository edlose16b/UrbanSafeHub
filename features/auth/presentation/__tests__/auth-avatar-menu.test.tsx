import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import dictionary from "@/app/i18n/dictionaries/en.json";
import type { AuthUserSnapshot } from "@/lib/auth/domain/auth-user";
import AuthAvatarMenu from "../components/auth-avatar-menu";

const { refreshMock, signOutActionMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  signOutActionMock: vi.fn<() => Promise<void>>(),
}));

vi.mock("next/image", () => ({
  default: () => <span data-testid="mock-avatar-image" />,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  })),
}));

vi.mock("@/lib/auth/application/get-current-user", () => ({
  GetCurrentUserUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock("@/lib/auth/application/sign-in-with-google", () => ({
  SignInWithGoogleUseCase: class {
    execute = vi.fn();
  },
}));

vi.mock("@/features/auth/actions/auth-avatar-menu.actions", () => ({
  signOutAction: signOutActionMock,
}));

describe("AuthAvatarMenu", () => {
  const translations = dictionary.auth;
  const initialUser: AuthUserSnapshot = {
    id: "user-1",
    email: "user@example.com",
    displayName: "User",
    avatarUrl: null,
    isAnonymous: false,
  };

  afterEach(() => {
    cleanup();
    refreshMock.mockReset();
    signOutActionMock.mockReset();
  });

  it("signs out and refreshes the route when the user clicks sign out", async () => {
    const onSignedOut = vi.fn();
    signOutActionMock.mockResolvedValueOnce();

    render(
      <AuthAvatarMenu
        lang="en"
        initialUser={initialUser}
        onSignedOut={onSignedOut}
        translations={translations}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: translations.openMenu }));
    fireEvent.click(screen.getByRole("button", { name: translations.signOut }));

    await waitFor(() => {
      expect(signOutActionMock).toHaveBeenCalledTimes(1);
    });

    expect(onSignedOut).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: translations.signOut })).toBeNull();
  });
});
