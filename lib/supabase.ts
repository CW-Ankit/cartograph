import { auth } from '@clerk/nextjs/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Creates a server-side Supabase client that carries the active Clerk session token.
 * 
 * Rules & Constraints:
 * 1. One session system: Clerk owns all sessions. No Supabase cookies or middleware.
 * 2. The client passes Clerk's session token via `accessToken` on every request.
 *    Postgres RLS policies read `auth.jwt()` claims (including org_id, org_role, sub)
 *    directly from this token without querying Clerk at runtime.
 * 3. Database operations must be called from server code only (Server Actions or
 *    server-side data fetchers), never inside Client Components.
 */
export async function getDatabaseClient(): Promise<SupabaseClient> {
  const { getToken } = await auth();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      accessToken: async () => {
        const token = await getToken();
        return token ?? null;
      },
    }
  );
}
