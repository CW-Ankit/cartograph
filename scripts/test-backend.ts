import { neon } from '@neondatabase/serverless';
import { env } from '@/lib/env';
import { auth } from '@/lib/auth/server';
import { inviteMember } from '@/app/actions/org';
import proxyMiddleware from '@/proxy';
import { NextRequest } from 'next/server';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details?: string, error?: string) {
  results.push({ name, passed, details, error });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: ${name}${details ? ` (${details})` : ''}${error ? ` - ERROR: ${error}` : ''}`);
}

async function runTests() {
  console.log('=== CARTOGRAPH BACKEND EXTENSIVE TEST SUITE ===\n');

  // 1. Environment Validator Tests
  console.log('--- 1. Environment & Configuration ---');
  try {
    const hasDb = Boolean(env.DATABASE_URL && env.DATABASE_URL.startsWith('postgres'));
    const hasAuth = Boolean(env.NEON_AUTH_BASE_URL && env.NEON_AUTH_BASE_URL.startsWith('https://'));
    const hasSecret = Boolean(env.NEON_AUTH_COOKIE_SECRET && env.NEON_AUTH_COOKIE_SECRET.length >= 32);

    record('Environment: DATABASE_URL configured', hasDb, `Prefix: postgres://...`);
    record('Environment: NEON_AUTH_BASE_URL configured', hasAuth, env.NEON_AUTH_BASE_URL);
    record('Environment: NEON_AUTH_COOKIE_SECRET (>=32 chars)', hasSecret, `Length: ${env.NEON_AUTH_COOKIE_SECRET.length}`);
  } catch (err: unknown) {
    record('Environment: Validation', false, undefined, String(err));
  }

  // 2. Database Connectivity & Schema
  console.log('\n--- 2. Neon Postgres Database Connectivity & Tables ---');
  const sql = neon(env.DATABASE_URL);
  try {
    const versionRes = await sql`SELECT version() as ver;`;
    record('Database: Connection live', versionRes.length > 0, String(versionRes[0]?.ver).slice(0, 45));

    // Check existing tables
    const tables = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public';
    `;
    const tableNames = tables.map((t) => String(t.tablename));

    const requiredTables = [
      'organizations',
      'projects',
      'analyses',
      'files',
      'edges',
      'routes',
      'explanations',
      'file_roles',
      'insights',
    ];

    const missingTables = requiredTables.filter((t) => !tableNames.includes(t));
    record('Database: All 9 Schema Tables Present', missingTables.length === 0, `Found: ${tableNames.filter(t => requiredTables.includes(t)).join(', ')}`);

    // Verify RLS is enabled on all required tables
    const rlsCheck = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = ANY(${requiredTables});
    `;
    const unsecureTables = rlsCheck.filter((r) => !Boolean(r.rowsecurity));
    record(
      'Database: Row Level Security (RLS) Active on All Tables',
      unsecureTables.length === 0,
      unsecureTables.length > 0 ? `Unsecured: ${unsecureTables.map((t) => String(t.tablename)).join(', ')}` : 'Enforced on 9/9 tables'
    );


    // Verify RLS isolation: Unauthenticated query returns 0 rows (fails closed)
    const emptyAnalyses = await sql`SELECT * FROM public.analyses;`;
    record('Database: RLS Default Closed Policy', emptyAnalyses.length === 0, `Unauthenticated query returned ${emptyAnalyses.length} rows`);

    // Verify relations and join query as executed on HomePage
    const joinQuery = await sql`
      SELECT
        a.id,
        a.organization_id,
        a.project_id,
        json_build_object('name', p.name, 'repository_url', p.repository_url) as projects
      FROM analyses a
      LEFT JOIN projects p ON a.project_id = p.id
      LIMIT 1;
    `;
    record('Database: Relational Join Query Valid', Array.isArray(joinQuery), 'Analyses -> Projects join syntax verified');

  } catch (err: unknown) {
    record('Database: Operation', false, undefined, String(err));
  }

  // 3. Neon Auth Service & Endpoints
  console.log('\n--- 3. Neon Managed Auth Service & JWKS ---');
  try {
    const jwksUrl = `${env.NEON_AUTH_BASE_URL}/.well-known/jwks.json`;
    const jwksRes = await fetch(jwksUrl);
    const jwksData = await jwksRes.json().catch(() => ({}));
    const hasKeys = Array.isArray(jwksData.keys);
    record('Neon Auth: Remote JWKS endpoint accessible', jwksRes.ok && hasKeys, `HTTP ${jwksRes.status}, keys: ${hasKeys ? jwksData.keys.length : 0}`);
  } catch (err: unknown) {
    record('Neon Auth: JWKS fetch', false, undefined, String(err));
  }

  // 4. Next.js Auth API Route Handler
  console.log('\n--- 4. Auth Route Handler (/api/auth/[...path]) ---');
  try {
    const handler = auth.handler();
    const req = new Request('http://localhost:3000/api/auth/get-session', {
      method: 'GET',
    });
    const res = await handler.GET(req, { params: Promise.resolve({ path: ['get-session'] }) });
    record('Route Handler: GET /api/auth/get-session', res.status === 200, `HTTP ${res.status}`);
  } catch (err: unknown) {
    record('Route Handler: Auth Handler execution', false, undefined, String(err));
  }

  // 5. Proxy Middleware (Route Protection)
  console.log('\n--- 5. Route Protection Middleware (proxy.ts) ---');
  try {
    // Unauthenticated request to protected root '/'
    const protectedReq = new NextRequest('http://localhost:3000/');
    const redirectRes = await proxyMiddleware(protectedReq);
    const location = redirectRes?.headers.get('location') || redirectRes?.headers.get('x-middleware-rewrite');
    const isRedirect = redirectRes && (redirectRes.status === 307 || redirectRes.status === 302 || location?.includes('sign-in'));
    record('Middleware: Protects root "/" by redirecting unauthenticated visitor', Boolean(isRedirect), `Redirect target: ${location || redirectRes?.status}`);

    // Request to public route '/auth/sign-in' and '/auth/sign-up'
    const publicReq = new NextRequest('http://localhost:3000/auth/sign-in');
    const publicRes = await proxyMiddleware(publicReq);
    const publicRedirect = publicRes?.headers.get('location');
    const allowed = !publicRedirect;
    record('Middleware: Allows access to public routes ("/auth/sign-in")', allowed, `Status: ${publicRes?.status ?? 200}`);

    const signUpReq = new NextRequest('http://localhost:3000/auth/sign-up');
    const signUpRes = await proxyMiddleware(signUpReq);
    record('Middleware: Allows access to public routes ("/auth/sign-up")', !signUpRes?.headers.get('location'), `Status: ${signUpRes?.status ?? 200}`);


    // Request to static assets (should not be redirected)
    const staticReq = new NextRequest('http://localhost:3000/_next/static/test.js');
    const staticRes = await proxyMiddleware(staticReq);
    const staticRedirect = staticRes?.headers.get('location');
    record('Middleware: Passes through static assets', !staticRedirect, 'Allowed through');
  } catch (err: unknown) {
    record('Middleware: Route Protection check', false, undefined, String(err));
  }

  // 6. Server Actions (app/actions/org.ts)
  console.log('\n--- 6. Server Actions (app/actions/org.ts) ---');
  try {
    // Case A: Missing session
    const unauthInvite = await inviteMember('test@example.com');
    record('Server Action: inviteMember rejects unauthenticated call', !unauthInvite.success, unauthInvite.message);

    // Case B: Invalid email format
    const invalidEmailInvite = await inviteMember('invalid-email-string');
    record('Server Action: inviteMember validates email format', !invalidEmailInvite.success, invalidEmailInvite.message);
  } catch (err: unknown) {
    record('Server Action: inviteMember', false, undefined, String(err));
  }

  // 7. Standalone Parser & Calculations
  console.log('\n--- 7. Standalone Parser Execution ---');
  try {
    const { parseRepository } = await import('@/lib/parser/index');
    // Parse the lib/parser directory itself as a test codebase
    const parseResult = await parseRepository(path.resolve(process.cwd(), 'lib/parser'));
    const hasFiles = parseResult.files.length > 0;
    const hasEdges = Array.isArray(parseResult.edges);
    const hasCoverage = typeof parseResult.coverage?.totalImports === 'number';
    const hasStats = typeof parseResult.stats?.filesParsed === 'number';

    record(
      'Parser: Parses standalone TypeScript files without framework/DB runtime',
      hasFiles && hasEdges && hasCoverage && hasStats,
      `Parsed: ${parseResult.stats.filesParsed} files, ${parseResult.edges.length} edges, ${parseResult.coverage.totalImports} total imports`
    );

    // Verify arithmetic constraints
    const fileIds = new Set(parseResult.files.map((f) => f.id));
    const allEdgesValid = parseResult.edges.every((e) => fileIds.has(e.source) && fileIds.has(e.target));
    record('Parser: All graph edges connect verified file nodes', allEdgesValid, `${parseResult.edges.length} verified edges`);
  } catch (err: unknown) {
    record('Parser: Execution', false, undefined, String(err));
  }

  // Summary
  console.log('\n=== TEST RESULTS SUMMARY ===');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Tests: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test runner error:', e);
  process.exit(1);
});
