'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OrganizationSwitcher } from '@neondatabase/auth-ui';
import { UserProfileMenu } from './user-profile-menu';

interface SettingsShellProps {
  title: string;
  description: string;
  section: 'account' | 'organization';
  children: React.ReactNode;
}

export function SettingsShell({
  title,
  description,
  section,
  children,
}: SettingsShellProps) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground antialiased font-sans flex flex-col">
      {/* Top Application Bar (Delta-inspired header) */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-3 sticky top-0 z-40">
        {/* Left: Brand + Breadcrumb + Back link */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <span className="text-accent text-sm leading-none">◈</span>
            <span className="text-foreground tracking-tight">cartograph</span>
          </Link>

          <span className="text-border text-xs">/</span>

          <div className="flex items-center gap-1 font-mono text-xs text-foreground-muted">
            <span className="text-foreground font-medium">{section}</span>
            <span className="text-border">/</span>
            <span>settings</span>
          </div>

          <span className="text-border text-xs hidden sm:inline">/</span>

          <Link
            href="/"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-foreground-muted hover:text-foreground hover:border-accent/40 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Right: Organization Switcher + Profile Menu */}
        <div className="flex items-center gap-2">
          <div id="server-rendered-org" className="flex items-center font-mono text-xs">
            <OrganizationSwitcher hidePersonal={true} />
          </div>

          <div className="ml-1 flex items-center">
            <UserProfileMenu />
          </div>
        </div>
      </header>

      {/* Main Settings Frame */}
      <main className="flex-1 overflow-y-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-foreground font-sans">
                  {title}
                </h1>
                <p className="mt-1 font-mono text-xs text-foreground-muted">
                  {description}
                </p>
              </div>
              <Link
                href="/"
                className="sm:hidden inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-surface-raised px-2 py-1 font-mono text-xs text-foreground-muted hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" strokeWidth={1.75} />
                <span>Back</span>
              </Link>
            </div>
          </div>

          {/* Cards Content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
