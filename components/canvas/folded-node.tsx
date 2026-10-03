'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FoldedNode } from '@/lib/graph/folding';

export interface FoldedNodeData {
  node: FoldedNode;
  isDimmed: boolean;
  isSelected: boolean;
  isConnected: boolean;
  onOpen: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
}

export function FoldedNodeComponent({ data }: { data: FoldedNodeData }) {
  const { node, isDimmed, isSelected, isConnected, onOpen, onSelect } = data;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(node.id);
  };

  // Determine styling
  let borderClass = 'border-border';
  let bgClass = 'bg-surface';
  const textClass = 'text-foreground';

  if (isSelected) {
    borderClass = 'border-accent ring-1 ring-accent';
    bgClass = 'bg-surface-raised';
  } else if (isConnected) {
    borderClass = 'border-border hover:border-accent/70';
    bgClass = 'bg-surface hover:bg-surface-raised';
  } else {
    borderClass = 'border-border hover:border-accent/70';
    bgClass = 'bg-surface hover:bg-surface-raised';
  }

  const opacityClass = isDimmed ? 'opacity-20' : 'opacity-100';

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ width: `${node.width}px`, height: `${node.height}px` }}
      className={`relative flex flex-col justify-between rounded-[4px] border ${borderClass} ${bgClass} ${textClass} ${opacityClass} p-2 font-mono transition-all duration-100 cursor-pointer select-none group`}
      title={`${node.path}\n${node.files.length} files\nFan-in: ${node.fanIn}, Fan-out: ${node.fanOut}\nDouble-click to expand into panel`}
    >
      {/* Target Handle on Left */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !-left-1 !bg-border group-hover:!bg-accent !border-0 transition-colors"
      />

      {/* Top Header line */}
      <div className="flex items-center justify-between gap-1 overflow-hidden">
        <div className="flex items-center gap-1.5 truncate">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(node.id);
            }}
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-border bg-surface-raised text-[9px] text-foreground-muted hover:border-accent hover:text-accent transition-colors"
            title="Expand into panel"
          >
            ▸
          </button>
          <span className="truncate text-xs font-medium tracking-tight">
            {node.label}
          </span>
        </div>

        <span className="shrink-0 rounded-[3px] border border-border bg-surface-raised px-1 py-0.2 text-[9px] text-foreground-muted">
          {node.files.length}
        </span>
      </div>

      {/* Fan-in indicator when node height allows */}
      {node.height > 50 && (
        <div className="flex items-center justify-between text-[9px] text-foreground-muted pt-1 border-t border-border-subtle/50">
          <span className="text-incoming flex items-center gap-0.5">
            ↓ {node.fanIn}
          </span>
          <span className="text-outgoing flex items-center gap-0.5">
            ↑ {node.fanOut}
          </span>
        </div>
      )}

      {/* Source Handle on Right */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !-right-1 !bg-border group-hover:!bg-accent !border-0 transition-colors"
      />
    </div>
  );
}
