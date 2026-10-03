'use client';

import React from 'react';
import type { FileCategory } from '@/lib/graph/categories';

interface LeftRailProps {
  categories: FileCategory[];
  totalFiles: number;
}

export function LeftRail({ categories, totalFiles }: LeftRailProps) {
  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-surface select-none font-mono">
      {/* Rail Eyebrow Header */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
          Categories
        </span>
        <span className="rounded-[3px] border border-border bg-surface-raised px-1 py-0.2 text-[9px] text-foreground-muted">
          {totalFiles} files
        </span>
      </div>

      {/* Category List */}
      <div className="flex flex-1 flex-col divide-y divide-border-subtle overflow-y-auto p-1.5">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between px-2 py-2 text-xs transition-colors hover:bg-surface-raised/40 cursor-default"
          >
            <div className="flex items-center gap-2 truncate">
              {/* Color Swatch */}
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-[2px] ${category.swatchClass}`}
                style={{ backgroundColor: category.color }}
              />
              <span className="truncate text-[11px] text-foreground font-medium">
                {category.name}
              </span>
            </div>

            {/* Count Badge */}
            <span className="shrink-0 rounded-[3px] border border-border bg-surface-raised px-1.5 py-0.2 text-[10px] text-foreground-muted">
              {category.count}
            </span>
          </div>
        ))}
      </div>

      {/* Rail Footer */}
      <div className="border-t border-border px-3 py-2 text-[10px] text-foreground-muted">
        <span>Cartograph Analysis</span>
      </div>
    </aside>
  );
}
