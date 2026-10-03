import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/shell';
import { AutoActivateOrg } from '@/components/auto-activate-org';
import { getDatabaseClient } from '@/lib/supabase';
import { DbAnalysis } from '@/types/database';

export default async function HomePage() {
  const { userId, orgId, orgSlug, orgRole } = await auth();

  // If not signed in, redirect to sign-in (defensive check; proxy already guards)
  if (!userId) {
    redirect('/sign-in');
  }

  const clerk = await clerkClient();

  // If user is signed in and already has an active organization, render shell directly
  if (orgId) {
    const organization = await clerk.organizations.getOrganization({
      organizationId: orgId,
    });

    const supabase = await getDatabaseClient();

    // Query analyses for the active workspace.
    // Spec constraint: Authorization is a property of the database.
    // The query does NOT filter by organization in application code.
    // The database policy reads the organization claim off the auth token.
    const { data: analyses, error } = await supabase
      .from('analyses')
      .select(`
        id,
        organization_id,
        project_id,
        commit_hash,
        status,
        error_message,
        file_count,
        edge_count,
        route_count,
        coverage_percent,
        stats,
        created_at,
        updated_at,
        projects (
          name,
          repository_url,
          default_branch
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Cartograph] Error fetching analyses:', error);
    }

    // Cast the returned data with strict typed representation
    const typedAnalyses: DbAnalysis[] = (analyses ?? []).map((row) => {
      // Supabase join types may return object or array depending on relationship inference
      const rawProject = row.projects;
      const project = Array.isArray(rawProject)
        ? rawProject[0]
        : (rawProject as { name: string; repository_url: string; default_branch: string } | null);

      return {
        id: row.id,
        organization_id: row.organization_id,
        project_id: row.project_id,
        commit_hash: row.commit_hash,
        status: row.status,
        error_message: row.error_message,
        file_count: row.file_count,
        edge_count: row.edge_count,
        route_count: row.route_count,
        coverage_percent: row.coverage_percent,
        stats: (row.stats as Record<string, unknown>) ?? {},
        created_at: row.created_at,
        updated_at: row.updated_at,
        projects: project,
      };
    });

    return (
      <Shell
        organization={{
          id: organization.id,
          name: organization.name,
          slug: orgSlug || organization.slug,
          role: orgRole ?? null,
        }}
        analyses={typedAnalyses}
      />
    );
  }

  // Handle first-time sign in: user has no active organization selected
  // Check if they already belong to any organization
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 10,
  });

  if (memberships.data.length > 0) {
    // Activate their first organization automatically
    const targetOrgId = memberships.data[0].organization.id;
    return <AutoActivateOrg targetOrgId={targetOrgId} />;
  }

  // Brand new account with no organization: auto-provision one without asking them to create it
  const user = await clerk.users.getUser(userId);
  const primaryEmail =
    user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
    user.emailAddresses?.[0]?.emailAddress;

  const defaultName = user.firstName
    ? `${user.firstName}'s Team`
    : user.username
    ? `${user.username}'s Team`
    : primaryEmail
    ? `${primaryEmail.split('@')[0]}'s Team`
    : 'Default Team';

  const newOrg = await clerk.organizations.createOrganization({
    name: defaultName,
    createdBy: userId,
  });

  // Activate the newly created organization in the session
  return <AutoActivateOrg targetOrgId={newOrg.id} />;
}
