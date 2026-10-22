'use client';

import React, { useMemo } from 'react';
import { OrganizationSwitcher } from '@neondatabase/auth-ui';
import { UserProfileMenu } from './user-profile-menu';
import { InviteModal } from './invite-modal';
import { Dashboard } from './dashboard';
import { LeftRail } from './canvas/left-rail';
import { GraphCanvas } from './canvas/graph-canvas';
import { RightPane, type CanvasSelectionTarget, type CanvasHoverTarget } from './canvas/right-pane';
import { deriveFileCategories } from '@/lib/graph/categories';
import type { DbAnalysis } from '@/types/database';
import type { ParseResult } from '@/lib/parser/types';

export interface ShellOrganization {
  id: string;
  name: string;
  slug: string | null;
  role: string | null;
}

export interface ShellProps {
  organization?: ShellOrganization;
  analyses?: DbAnalysis[];
  parseResult?: ParseResult;
  view?: 'dashboard' | 'map';
  isScaffoldPreview?: boolean;
  repositoryName?: string;
}

export function Shell({
  organization,
  analyses = [],
  parseResult,
  view = 'dashboard',
  isScaffoldPreview = false,
  repositoryName,
}: ShellProps) {
  // State for canvas selection and bidirectional hover
  const [selectedTarget, setSelectedTarget] = React.useState<CanvasSelectionTarget>(null);
  const [hoveredTarget, setHoveredTarget] = React.useState<CanvasHoverTarget>(null);

  // Derive file categories for the left rail when map is active
  const categories = useMemo(() => {
    return parseResult ? deriveFileCategories(parseResult.files) : [];
  }, [parseResult]);

  const activeOrgName = organization?.name ?? (isScaffoldPreview ? 'Scaffold Preview' : 'Cartograph');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased font-sans select-none">
      {/* Top Application Bar (Delta-inspired header) */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        {/* Left: Brand + Organization button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold tracking-tight">
            <span className="text-accent text-sm leading-none">◈</span>
            <span className="text-foreground tracking-tight">cartograph</span>
            <span className="rounded-[3px] border border-border bg-surface-raised px-1 py-0.2 text-[9px] font-mono text-foreground-muted">
              v0.1.0
            </span>
          </div>

          <span className="text-border text-xs">/</span>

          {isScaffoldPreview ? (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="font-medium text-foreground">trpc/packages</span>
              <span className="rounded-[3px] border border-accent/40 bg-accent/10 px-1.5 py-0.2 text-[9px] text-accent">
                scaffold preview
              </span>
            </div>
          ) : (
            /* The Single Organization Button: Better Auth OrganizationSwitcher */
            <div id="server-rendered-org" className="flex items-center font-mono text-xs">
              <OrganizationSwitcher hidePersonal={true} />
            </div>
          )}
        </div>

        {/* Right: Actions & User Profile Menu (with embedded theme toggle) */}
        <div className="flex items-center gap-2">
          {!isScaffoldPreview && organization && (
            <InviteModal orgName={organization.name} />
          )}

          {/* Profile Menu with integrated theme settings */}
          {!isScaffoldPreview && (
            <div className="ml-1 flex items-center">
              <UserProfileMenu />
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Frame: Three Columns (settled shell per Phase 4 spec) */}
      {view === 'map' && parseResult ? (
        <main className="flex flex-1 overflow-hidden">
          {/* Column 1: Left Rail (Categories) */}
          <LeftRail categories={categories} totalFiles={parseResult.files.length} />

          {/* Column 2: Map Canvas (Middle) */}
          <div className="relative flex-1 overflow-hidden bg-background">
            <GraphCanvas
              parseResult={parseResult}
              selectedTarget={selectedTarget}
              onSelectTarget={setSelectedTarget}
              hoveredTarget={hoveredTarget}
              onHoverTarget={setHoveredTarget}
            />
          </div>

          {/* Column 3: Detail Pane (Right) */}
          <RightPane
            parseResult={parseResult}
            repositoryName={repositoryName ?? (isScaffoldPreview ? 'trpc/packages' : undefined)}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            hoveredTarget={hoveredTarget}
            onHoverTarget={setHoveredTarget}
          />
        </main>
      ) : (
        <main className="flex flex-1 overflow-hidden">
          <Dashboard organizationName={activeOrgName} analyses={analyses} />
        </main>
      )}
    </div>
  );
}
