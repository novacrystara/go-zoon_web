import { createClient, SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

/**
 * Return a reusable server-side Supabase client configured with the service secret key.
 * Strictly used in server contexts (API routes, server actions, scripts) and NEVER exposed to the client.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) {
    return serverClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "[Supabase Config Error]: Missing environment variable NEXT_PUBLIC_SUPABASE_URL"
    );
  }

  if (!supabaseSecretKey) {
    throw new Error(
      "[Supabase Config Error]: Missing environment variable SUPABASE_SECRET_KEY"
    );
  }

  serverClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serverClient;
}

