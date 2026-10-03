'use client';

import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { ThemeToggle } from './theme-toggle';
import { InviteModal } from './invite-modal';
import { Dashboard } from './dashboard';
import { DbAnalysis } from '@/types/database';

export interface ShellOrganization {
  id: string;
  name: string;
  slug: string | null;
  role: string | null;
}

interface ShellProps {
  organization: ShellOrganization;
  analyses: DbAnalysis[];
}

export function Shell({ organization, analyses }: ShellProps) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased font-sans select-none">
      {/* Top Application Bar (Delta-inspired header) */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        {/* Left: Brand + ONLY Organization button (Clerk component) */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-tight">
            <span className="text-accent text-sm leading-none">◈</span>
            <span className="text-foreground tracking-tight">cartograph</span>
            <span className="rounded-[3px] border border-border bg-surface-raised px-1 py-0.2 text-[9px] font-mono text-foreground-muted">
              v0.1.0
            </span>
          </div>

          <span className="text-border text-xs">/</span>

          {/* The Single Organization Button: Clerk's native OrganizationSwitcher */}
          <div id="server-rendered-org" className="flex items-center">
            <OrganizationSwitcher
              hidePersonal={true}
              afterSelectOrganizationUrl="/"
              afterCreateOrganizationUrl="/"
              afterLeaveOrganizationUrl="/"
              appearance={{
                elements: {
                  rootBox: 'font-mono text-xs flex items-center',
                  organizationSwitcherTrigger:
                    'h-7 rounded-[4px] border border-border bg-surface hover:bg-surface-raised px-2.5 py-0 font-mono text-xs text-foreground hover:border-accent transition-all duration-100 flex items-center gap-2 focus:ring-0 focus:outline-none shadow-none',
                  organizationPreview: 'gap-1.5 flex items-center text-foreground',
                  organizationPreviewTextContainer: 'text-foreground font-mono text-xs font-medium',
                  organizationPreviewMainIdentifier: 'text-foreground font-mono text-xs font-medium',
                  organizationPreviewAvatarBox: 'w-4 h-4 rounded-[3px] border border-border overflow-hidden',
                  organizationSwitcherTriggerIcon: 'text-foreground-muted h-3.5 w-3.5 opacity-80',
                },
              }}
            />
          </div>
        </div>

        {/* Right: Actions, Theme Toggle, User Profile */}
        <div className="flex items-center gap-2">
          {/* Invite Member modal */}
          <InviteModal orgName={organization.name} />

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Clerk User Button */}
          <div className="ml-1 flex items-center">
            <UserButton
              appearance={{
                elements: {
                  userButtonTrigger:
                    'h-7 w-7 rounded-[4px] border border-border bg-surface hover:border-accent transition-colors p-0.5',
                  avatarBox: 'h-full w-full rounded-[2px]',
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Workspace Frame: Dashboard */}
      <main className="flex flex-1 overflow-hidden">
        <Dashboard organizationName={organization.name} analyses={analyses} />
      </main>
    </div>
  );
}
