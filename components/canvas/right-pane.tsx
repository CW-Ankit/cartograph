'use client';

import React from 'react';

/**
 * Spec: "The right pane exists as an empty column in this phase.
 * It is not a modal, a drawer, or an overlay, and it does not get rebuilt or relocated later."
 */
export function RightPane() {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border bg-surface select-none font-mono">
      {/* Pane Eyebrow Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
          Detail
        </span>
      </div>

      {/* Empty Body - settled column for future phases */}
      <div className="flex flex-1 items-center justify-center p-6 text-center text-foreground-muted">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm opacity-40">◈</span>
          <p className="text-[11px] leading-relaxed text-foreground-muted/70 max-w-[200px]">
            Select a node or file in the map to inspect dependencies.
          </p>
        </div>
      </div>
    </aside>
  );
}
