'use server';

import { auth } from '@/lib/auth/server';
import { env } from '@/lib/env';

export interface InviteResult {
  success: boolean;
  message?: string;
}

/**
 * Invites a user by email to the active organization.
 */
export async function inviteMember(
  emailAddress: string,
  role: string = 'member'
): Promise<InviteResult> {
  const cleanEmail = emailAddress.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Invalid email address.' };
  }

  let session: Awaited<ReturnType<typeof auth.getSession>>['data'] = null;
  try {
    const res = await auth.getSession();
    session = res.data;
  } catch {
    return { success: false, message: 'You must be signed in with an active organization.' };
  }

  if (!session?.user) {
    return { success: false, message: 'You must be signed in with an active organization.' };
  }

  try {
    const { data: tokenData } = await auth.token();
    const activeOrgId = (session.session as unknown as { activeOrganizationId?: string })?.activeOrganizationId;

    if (!activeOrgId) {
      return { success: false, message: 'No active organization selected.' };
    }

    const response = await fetch(`${env.NEON_AUTH_BASE_URL}/organization/invite-member`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenData?.token}`,
      },
      body: JSON.stringify({
        email: cleanEmail,
        role: role.replace('org:', ''),
        organizationId: activeOrgId,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        message: (errJson as { message?: string }).message || 'Failed to send invitation',
      };
    }

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send invitation';
    return { success: false, message: msg };
  }
}
