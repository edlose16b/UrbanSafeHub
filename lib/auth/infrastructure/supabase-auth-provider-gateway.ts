import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity } from "../domain/auth-user";
import type { AuthProviderGateway } from "../domain/ports";

function isMissingSessionError(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes("auth session missing") ||
    normalized.includes("session missing")
  );
}

function readMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function mapMetadataToIdentity(
  id: string,
  email: string | null,
  metadata: Record<string, unknown>,
): AuthIdentity {
  const displayName =
    readMetadataString(metadata, ["full_name", "name", "user_name"]) ??
    (email ? email.split("@")[0] : null);
  const avatarUrl = readMetadataString(metadata, [
    "avatar_url",
    "picture",
    "photo_url",
  ]);

  return {
    id,
    email,
    displayName,
    avatarUrl,
  };
}

export class SupabaseAuthProviderGateway implements AuthProviderGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async getCurrentAuthIdentity(): Promise<AuthIdentity | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (error) {
        if (isMissingSessionError(error.message)) {
          return null;
        }

        throw new Error(`Unable to read authenticated user: ${error.message}`);
      }

      if (!data.user) {
        return null;
      }

      return mapMetadataToIdentity(
        data.user.id,
        data.user.email ?? null,
        data.user.user_metadata ?? {},
      );
    } catch (unknownError) {
      if (
        unknownError instanceof Error &&
        isMissingSessionError(unknownError.message)
      ) {
        return null;
      }

      throw unknownError;
    }
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      throw new Error(`Unable to start Google sign-in: ${error.message}`);
    }

    if (!data.url) {
      throw new Error("Unable to start Google sign-in: missing redirect URL");
    }

    window.location.assign(data.url);
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error(`Unable to sign out: ${error.message}`);
    }
  }
}
