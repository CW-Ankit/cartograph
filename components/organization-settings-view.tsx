'use client';

import React from 'react';
import {
  OrganizationNameCard,
  OrganizationSlugCard,
  OrganizationMembersCard,
  OrganizationInvitationsCard,
  DeleteOrganizationCard,
} from '@neondatabase/auth-ui';
import { Building2, Users, AlertTriangle } from 'lucide-react';
import { SettingsShell } from './settings-shell';

export function OrganizationSettingsView() {
  return (
    <SettingsShell
      title="Organization Settings"
      description="Manage organization details, team member roles, and invitation requests."
      section="organization"
    >
      {/* Organization Details */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          <Building2 className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span>Organization Profile</span>
        </div>
        <div className="space-y-4">
          <OrganizationNameCard />
          <OrganizationSlugCard />
        </div>
      </section>

      {/* Team Members & Invitations */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          <Users className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span>Members & Team Access</span>
        </div>
        <div className="space-y-4">
          <OrganizationMembersCard />
          <OrganizationInvitationsCard />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-red-500/80">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" strokeWidth={1.75} />
          <span>Danger Zone</span>
        </div>
        <div className="space-y-4">
          <DeleteOrganizationCard />
        </div>
      </section>
    </SettingsShell>
  );
}
