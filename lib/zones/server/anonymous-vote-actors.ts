import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

type AnonymousVoteActorRecord = {
  fingerprintHash: string;
  ipHash: string | null;
  userAgentHash: string | null;
  zoneId: string;
};

export async function recordAnonymousVoteActor(
  record: AnonymousVoteActorRecord,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("anonymous_vote_actors").upsert(
    {
      fingerprint_hash: record.fingerprintHash,
      last_ip_hash: record.ipHash,
      last_user_agent_hash: record.userAgentHash,
      last_zone_id: record.zoneId,
    },
    { onConflict: "fingerprint_hash" },
  );

  if (error) {
    throw new Error(`Unable to record anonymous vote actor: ${error.message}`);
  }
}
