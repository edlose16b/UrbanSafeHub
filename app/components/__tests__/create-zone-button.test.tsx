import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import dictionary from "@/app/i18n/dictionaries/en.json";
import { CreateZoneButton } from "../create-zone-button";

const executeMock = vi.fn<(redirectTo: string) => Promise<void>>();

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/auth/application/sign-in-with-google", () => ({
  SignInWithGoogleUseCase: class {
    execute = executeMock;
  },
}));

describe("CreateZoneButton", () => {
  const translations = dictionary.auth;

  afterEach(() => {
    cleanup();
    executeMock.mockReset();
  });

  it("toggles create mode when the user is authenticated", () => {
    const onSetCreateMode = vi.fn();

    render(
      <CreateZoneButton
        lang="en"
        isAuthenticated
        isCreateMode={false}
        onSetCreateMode={onSetCreateMode}
        translations={translations}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: translations.createZone }));

    expect(onSetCreateMode).toHaveBeenCalledWith(true);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("starts sign-in and preserves the locale path when anonymous users want to create", async () => {
    executeMock.mockResolvedValueOnce();

    render(
      <CreateZoneButton
        lang="es"
        isAuthenticated={false}
        isCreateMode={false}
        onSetCreateMode={vi.fn()}
        translations={translations}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: translations.createZone }));

    await waitFor(() => {
      expect(executeMock).toHaveBeenCalledWith(
        "http://localhost:3000/auth/callback?next=/es",
      );
    });
  });
});
