import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { env } from './env';


/**
 * Creates a server-side Neon database client that carries the active Neon Auth session token.
 * 
 * Rules & Constraints:
 * 1. One session system: Neon Auth (Managed Better Auth) owns all sessions.
 * 2. Postgres RLS policies inspect session claims (or app.current_org_id)
 *    to enforce multi-tenant organization isolation without application-level WHERE clauses.
 * 3. Database operations must be called from server code only (Server Actions or
 *    server-side data fetchers), never inside Client Components.
 */
export async function getDatabaseClient(): Promise<NeonQueryFunction<false, false>> {
  // Server-side database client for queries and server actions.
  // Direct connection over HTTPS using DATABASE_URL.
  return neon(env.DATABASE_URL);
}

