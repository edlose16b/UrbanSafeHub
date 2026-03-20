import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthIdentity } from "../domain/auth-user";
import type { ProfileRepository } from "../domain/ports";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upsertFromAuthIdentity(authIdentity: AuthIdentity): Promise<void> {
    const { error } = await this.supabase.from("profiles").upsert(
      {
        id: authIdentity.id,
        display_name: authIdentity.displayName,
        avatar_url: authIdentity.avatarUrl,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`Unable to sync auth profile: ${error.message}`);
    }
  }
}
