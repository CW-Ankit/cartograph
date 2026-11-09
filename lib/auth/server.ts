import { createNeonAuth } from '@neondatabase/auth/next/server';
import { env } from '@/lib/env';

/**
 * Unified server-side entry point for Neon Managed Better Auth.
 * Provides all Better Auth server methods, .handler() for Route Handlers,
 * and .middleware() for Next.js route protection.
 */
export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: env.NEON_AUTH_COOKIE_SECRET,
  },
});
