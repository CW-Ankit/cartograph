import { createAuthClient } from '@neondatabase/auth/next';

/**
 * Unified browser client for Neon Managed Better Auth.
 * Proxies calls through Next.js /api/auth handlers with automatic session management.
 */
export const authClient = createAuthClient();
