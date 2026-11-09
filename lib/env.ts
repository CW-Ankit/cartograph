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
  // Neon Postgres database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Neon Managed Better Auth
  NEON_AUTH_BASE_URL: requireEnv('NEON_AUTH_BASE_URL'),
  NEON_AUTH_COOKIE_SECRET: requireEnv('NEON_AUTH_COOKIE_SECRET'),

  // Routing and App URL
  NEXT_PUBLIC_SIGN_IN_URL: optionalEnv('NEXT_PUBLIC_SIGN_IN_URL', '/auth/sign-in'),
  NEXT_PUBLIC_SIGN_UP_URL: optionalEnv('NEXT_PUBLIC_SIGN_UP_URL', '/auth/sign-up'),
  NEXT_PUBLIC_APP_URL: optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
} as const;

export type Env = typeof env;
