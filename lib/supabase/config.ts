type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }

  return value;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"),
  };
}
