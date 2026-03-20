import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

const { url: supabaseUrl, publishableKey: supabasePublishableKey } =
  getSupabaseConfig();

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublishableKey);
  }

  return browserClient;
}
