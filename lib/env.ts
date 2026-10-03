/**
 * Environment configuration validator.
 * 
 * Fails loudly at startup if any required environment variable is missing.
 * A blank value that produces an error three screens later is worse than a crash on boot.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[FATAL] Missing required environment variable: "${key}". Application cannot start.`
    );
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  return value.trim();
}

export const env = {
  // Clerk keys
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requireEnv('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'),
  CLERK_SECRET_KEY: requireEnv('CLERK_SECRET_KEY'),

  // Supabase keys
  NEXT_PUBLIC_SUPABASE_URL: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),

  // Routing and App URL
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: optionalEnv('NEXT_PUBLIC_CLERK_SIGN_IN_URL', '/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: optionalEnv('NEXT_PUBLIC_CLERK_SIGN_UP_URL', '/sign-up'),
  NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: optionalEnv(
    'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
    '/'
  ),
  NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: optionalEnv(
    'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
    '/'
  ),
  NEXT_PUBLIC_APP_URL: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
} as const;

export type Env = typeof env;
