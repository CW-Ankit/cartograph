'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { env } from '@/lib/env';

export interface InviteResult {
  success: boolean;
  message?: string;
}

/**
 * Invites a user by email to the active organization.
 * 
 * Rules:
 * - Redirect URL points to /sign-in so accepting the invite lands on this app's login page.
 * - Requires active organization and caller to be org:admin.
 */
export async function inviteMember(
  emailAddress: string,
  role: string = 'org:member'
): Promise<InviteResult> {
  const { userId, orgId, orgRole, has } = await auth();

  if (!userId || !orgId) {
    return { success: false, message: 'You must be signed in with an active organization.' };
  }

  // Check authorization - org:admin is required to invite members
  const isAdmin = has({ role: 'org:admin' }) || orgRole === 'org:admin';
  if (!isAdmin) {
    return { success: false, message: 'Only organization administrators can invite members.' };
  }

  const cleanEmail = emailAddress.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Invalid email address.' };
  }

  try {
    const clerk = await clerkClient();
    const appUrl = env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/sign-in`;

    await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: cleanEmail,
      role,
      redirectUrl,
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send invitation';
    return { success: false, message: msg };
  }
}
