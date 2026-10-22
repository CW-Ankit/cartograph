import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/shell';
import { getDatabaseClient } from '@/lib/db';
import { DbAnalysis } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { data: session } = await auth.getSession();

  // If not signed in, redirect to sign-in (defensive check; proxy already guards)
  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  const activeOrgId = (session.session as unknown as { activeOrganizationId?: string })?.activeOrganizationId;

  const sql = await getDatabaseClient();

  // Query analyses for the active workspace.
  // Spec constraint: Authorization is a property of the database.
  // The query does NOT filter by organization in application code.
  // The database policy reads the organization claim off the auth token via Neon Authorize.
  let rows: Record<string, unknown>[] = [];
  try {
    rows = await sql`
      SELECT
        a.id,
        a.organization_id,
        a.project_id,
        a.commit_hash,
        a.status,
        a.error_message,
        a.file_count,
        a.edge_count,
        a.route_count,
        a.coverage_percent,
        a.stats,
        a.created_at,
        a.updated_at,
        json_build_object(
          'name', p.name,
          'repository_url', p.repository_url,
          'default_branch', p.default_branch
        ) as projects
      FROM analyses a
      LEFT JOIN projects p ON a.project_id = p.id
      ORDER BY a.created_at DESC;
    `;
  } catch (error) {
    console.error('[Cartograph] Error fetching analyses from Neon:', error);
  }

  // Cast the returned data with strict typed representation
  const typedAnalyses: DbAnalysis[] = rows.map((row) => {
    const project = row.projects as { name: string; repository_url: string; default_branch: string } | null;

    return {
      id: String(row.id),
      organization_id: String(row.organization_id),
      project_id: String(row.project_id),
      commit_hash: typeof row.commit_hash === 'string' ? row.commit_hash : null,
      status: row.status as DbAnalysis['status'],
      error_message: typeof row.error_message === 'string' ? row.error_message : null,
      file_count: Number(row.file_count),
      edge_count: Number(row.edge_count),
      route_count: Number(row.route_count),
      coverage_percent: row.coverage_percent != null ? Number(row.coverage_percent) : null,
      stats: (row.stats && typeof row.stats === 'object') ? (row.stats as Record<string, unknown>) : {},
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      projects: project,
    };
  });

  const userName = session.user.name || session.user.email?.split('@')[0] || 'Default';

  return (
    <Shell
      organization={{
        id: activeOrgId || session.user.id,
        name: activeOrgId ? `${userName}'s Workspace` : `${userName}'s Team`,
        slug: null,
        role: 'admin',
      }}
      analyses={typedAnalyses}
    />
  );
}
