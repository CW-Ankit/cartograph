'use client';

import React from 'react';
import {
  UpdateNameCard,
  ChangeEmailCard,
  ChangePasswordCard,
  SessionsCard,
  DeleteAccountCard,
} from '@neondatabase/auth-ui';
import { User, KeyRound, Laptop, AlertTriangle } from 'lucide-react';
import { SettingsShell } from './settings-shell';

interface AccountSettingsViewProps {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
}

export function AccountSettingsView({ user }: AccountSettingsViewProps) {
  return (
    <SettingsShell
      title="Account Settings"
      description={`Manage profile for ${user.name || user.email || 'your account'}, credentials, and active sessions.`}
      section="account"
    >
      {/* Profile Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          <User className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span>Profile Information</span>
        </div>
        <div className="space-y-4">
          <UpdateNameCard />
          <ChangeEmailCard />
        </div>
      </section>

      {/* Security Section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          <KeyRound className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span>Authentication & Security</span>
        </div>
        <div className="space-y-4">
          <ChangePasswordCard />
        </div>
      </section>

      {/* Sessions Section */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          <Laptop className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span>Active Device Sessions</span>
        </div>
        <div className="space-y-4">
          <SessionsCard />
        </div>
      </section>

      {/* Danger Zone */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center gap-2 border-b border-border pb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-red-500/80">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500" strokeWidth={1.75} />
          <span>Danger Zone</span>
        </div>
        <div className="space-y-4">
          <DeleteAccountCard />
        </div>
      </section>
    </SettingsShell>
  );
}
