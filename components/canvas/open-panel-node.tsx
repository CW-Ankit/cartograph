'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { FoldedNode } from '@/lib/graph/folding';
import { MAX_PANEL_FILES, PANEL_WIDTH } from '@/lib/graph/layout';

export interface OpenPanelNodeData {
  node: FoldedNode;
  isDimmed: boolean;
  selectedFileId: string | null;
  activeFileIds: Set<string>;
  onClose: (nodeId: string) => void;
  onSelectFile: (fileId: string) => void;
}

export function OpenPanelNodeComponent({ data }: { data: OpenPanelNodeData }) {
  const {
    node,
    isDimmed,
    selectedFileId,
    activeFileIds,
    onClose,
    onSelectFile,
  } = data;

  const visibleFiles = node.files.slice(0, MAX_PANEL_FILES);
  const overflowCount = node.files.length - visibleFiles.length;
  const opacityClass = isDimmed ? 'opacity-20' : 'opacity-100';

  return (
    <div
      style={{ width: `${Math.max(PANEL_WIDTH, node.width + 40)}px` }}
      className={`relative flex flex-col rounded-[4px] border border-border bg-surface text-foreground ${opacityClass} shadow-none overflow-hidden select-none font-mono transition-opacity duration-100`}
    >
      {/* Default fallback handles */}
      <Handle
        type="target"
        id={`${node.id}-target`}
        position={Position.Left}
        className="!w-1.5 !h-1.5 !-left-1 !top-4 !bg-border !border-0"
      />
      <Handle
        type="source"
        id={`${node.id}-source`}
        position={Position.Right}
        className="!w-1.5 !h-1.5 !-right-1 !top-4 !bg-border !border-0"
      />

      {/* Header: Click closes back to a single node */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClose(node.id);
        }}
        className="flex items-center justify-between border-b border-border bg-surface-raised px-2.5 py-1.5 cursor-pointer hover:bg-surface-raised/80 transition-colors"
        title="Click header to close folder"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border border-border bg-surface text-[9px] text-foreground-muted">
            ▾
          </span>
          <span className="truncate text-xs font-semibold tracking-tight text-foreground">
            {node.label}
          </span>
          <span className="shrink-0 rounded-[3px] border border-border bg-surface px-1 py-0.2 text-[9px] text-foreground-muted">
            {node.files.length}
          </span>
        </div>

        {/* Fan-in and Fan-out badges */}
        <div className="flex items-center gap-2 shrink-0 text-[10px] pl-2">
          <span className="text-incoming font-medium" title="Fan-in (incoming)">
            ↓ {node.fanIn}
          </span>
          <span className="text-outgoing font-medium" title="Fan-out (outgoing)">
            ↑ {node.fanOut}
          </span>
        </div>
      </div>

      {/* File Rows */}
      <div className="flex flex-col divide-y divide-border-subtle bg-surface">
        {visibleFiles.map((file) => {
          const isSelected = selectedFileId === file.id;
          const isActive = activeFileIds.has(file.id);

          let rowBg = 'hover:bg-surface-raised/60';
          let textColor = 'text-foreground';

          if (isSelected) {
            rowBg = 'bg-accent/15';
            textColor = 'text-accent font-medium';
          } else if (selectedFileId && !isActive) {
            textColor = 'text-foreground-muted opacity-40';
          }

          return (
            <div
              key={file.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFile(file.id);
              }}
              className={`relative flex items-center justify-between px-2.5 py-1 text-xs transition-colors cursor-pointer group/row ${rowBg} ${textColor}`}
              title={`${file.path}\nFan-in: ${file.fanIn} | Fan-out: ${file.fanOut}`}
            >
              {/* Target handle on Left of each row */}
              <Handle
                type="target"
                id={file.id}
                position={Position.Left}
                className="!w-1.5 !h-1.5 !-left-1 !bg-border group-hover/row:!bg-accent !border-0 transition-colors"
              />

              <span className="truncate text-[11px] font-mono leading-tight">
                {file.name}
              </span>

              <span className="shrink-0 text-[9px] text-foreground-muted ml-2">
                {file.lines}L
              </span>

              {/* Source handle on Right of each row */}
              <Handle
                type="source"
                id={file.id}
                position={Position.Right}
                className="!w-1.5 !h-1.5 !-right-1 !bg-border group-hover/row:!bg-accent !border-0 transition-colors"
              />
            </div>
          );
        })}
      </div>

      {/* Overflow indicator when rows exceed limit */}
      {overflowCount > 0 && (
        <div className="border-t border-border-subtle bg-surface-raised/30 px-2.5 py-1 text-[10px] text-foreground-muted">
          + {overflowCount} more files
        </div>
      )}
    </div>
  );
}
