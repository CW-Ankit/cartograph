'use client';

import React, { useState, useMemo } from 'react';
import type { ParseResult, ParsedFile } from '@/lib/parser/types';
import { deriveFileCategories } from '@/lib/graph/categories';
import { detectFramework } from '@/lib/graph/framework';

export type CanvasSelectionTarget =
  | { type: 'node'; id: string }
  | { type: 'file'; id: string }
  | null;

export type CanvasHoverTarget =
  | { type: 'node'; id: string }
  | { type: 'file'; id: string }
  | null;

export interface RightPaneProps {
  parseResult?: ParseResult;
  repositoryName?: string;
  selectedTarget?: CanvasSelectionTarget;
  onSelectTarget?: (target: CanvasSelectionTarget) => void;
  hoveredTarget?: CanvasHoverTarget;
  onHoverTarget?: (target: CanvasHoverTarget) => void;
  activeTab?: 'structure' | 'explanation';
  onTabChange?: (tab: 'structure' | 'explanation') => void;
}

/**
 * Formats a relative POSIX file path with muted folder directories and highlighted file name,
 * matching the delta.dev monospace convention from DESIGN.md.
 */
export function FormattedPath({ path, className = '' }: { path: string; className?: string }) {
  const parts = path.split('/');
  if (parts.length === 1) {
    return <span className={`font-mono text-foreground ${className}`}>{parts[0]}</span>;
  }
  const dirParts = parts.slice(0, -1);
  const fileName = parts[parts.length - 1];

  return (
    <span className={`font-mono truncate ${className}`}>
      {dirParts.map((dir, i) => (
        <React.Fragment key={i}>
          <span className="text-foreground-muted/70">{dir}</span>
          <span className="text-border px-0.5">/</span>
        </React.Fragment>
      ))}
      <span className="text-foreground font-medium">{fileName}</span>
    </span>
  );
}

export function RightPane({
  parseResult,
  repositoryName,
  selectedTarget = null,
  onSelectTarget,
  hoveredTarget = null,
  onHoverTarget,
  activeTab: activeTabProp,
  onTabChange,
}: RightPaneProps) {
  // Tab state survives changing selection per spec constraint
  const [internalTab, setInternalTab] = useState<'structure' | 'explanation'>('structure');
  const activeTab = activeTabProp ?? internalTab;

  const handleTabClick = (tab: 'structure' | 'explanation') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Toggle file selection: clicking an active file deselects it back to repository overview
  const handleToggleSelectFile = (fileId: string) => {
    if (selectedTarget?.type === 'file' && selectedTarget.id === fileId) {
      onSelectTarget?.(null);
    } else {
      onSelectTarget?.({ type: 'file', id: fileId });
    }
  };

  // Safe fallbacks if no parseResult loaded yet
  const files = useMemo(() => parseResult?.files ?? [], [parseResult]);
  const edges = useMemo(() => parseResult?.edges ?? [], [parseResult]);

  // Lookup map for fast file resolution
  const fileMap = useMemo(() => {
    const map = new Map<string, ParsedFile>();
    for (const f of files) {
      map.set(f.id, f);
    }
    return map;
  }, [files]);

  // Derived repo metadata
  const detectedFramework = useMemo(() => {
    return parseResult ? detectFramework(parseResult) : 'None detected';
  }, [parseResult]);

  const repoDisplayName = useMemo(() => {
    if (repositoryName) return repositoryName;
    if (parseResult?.rootPath) {
      const parts = parseResult.rootPath.split('/').filter(Boolean);
      return parts.slice(-2).join('/') || parts[parts.length - 1] || 'Repository';
    }
    return 'Repository';
  }, [repositoryName, parseResult]);

  // Count files no convention could identify (role === 'module')
  const unidentifiedConventionCount = useMemo(() => {
    return files.filter((f) => f.role === 'module').length;
  }, [files]);

  // 1. Ranked list 1: What the repository leans on most (fanIn > 0, highest fanIn first)
  const mostDependedOn = useMemo(() => {
    return [...files]
      .filter((f) => f.fanIn > 0)
      .sort((a, b) => b.fanIn - a.fanIn || a.path.localeCompare(b.path))
      .slice(0, 15);
  }, [files]);

  // 2. Ranked list 2: The files nothing imports at all (fanIn === 0, where reading starts)
  const readingStarts = useMemo(() => {
    return [...files]
      .filter((f) => f.fanIn === 0)
      .sort((a, b) => b.fanOut - a.fanOut || a.path.localeCompare(b.path))
      .slice(0, 15);
  }, [files]);

  // Selected file details
  const selectedFile = useMemo(() => {
    if (selectedTarget?.type === 'file') {
      return fileMap.get(selectedTarget.id) ?? null;
    }
    return null;
  }, [selectedTarget, fileMap]);

  // Outgoing dependencies for selected file (files this file imports)
  const outgoingDependencies = useMemo(() => {
    if (!selectedFile) return [];
    return edges
      .filter((e) => e.source === selectedFile.id)
      .map((e) => e.target)
      .sort((a, b) => a.localeCompare(b));
  }, [selectedFile, edges]);

  // Incoming dependents for selected file (files that import this file)
  const incomingDependents = useMemo(() => {
    if (!selectedFile) return [];
    return edges
      .filter((e) => e.target === selectedFile.id)
      .map((e) => e.source)
      .sort((a, b) => a.localeCompare(b));
  }, [selectedFile, edges]);

  // Selected folder details
  const selectedFolderFiles = useMemo(() => {
    if (selectedTarget?.type === 'node') {
      const folderId = selectedTarget.id;
      return files.filter((f) => {
        const folder = f.folder || '.';
        return folder === folderId || folder.startsWith(`${folderId}/`);
      });
    }
    return [];
  }, [selectedTarget, files]);

  const folderCategories = useMemo(() => {
    return deriveFileCategories(selectedFolderFiles);
  }, [selectedFolderFiles]);

  const folderExtensionBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of selectedFolderFiles) {
      const ext = f.extension || '(none)';
      counts[ext] = (counts[ext] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [selectedFolderFiles]);

  return (
    <aside className="flex h-full w-88 shrink-0 flex-col border-l border-border bg-surface select-none font-mono text-foreground">
      {/* Top Header & Tab Controls */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-surface px-3">
        <div className="flex items-center gap-1 font-mono text-xs">
          <button
            type="button"
            onClick={() => handleTabClick('structure')}
            className={`px-2 py-0.5 rounded-[3px] text-xs font-mono transition-colors ${
              activeTab === 'structure'
                ? 'bg-surface-raised text-foreground font-medium border border-border'
                : 'text-foreground-muted hover:text-foreground border border-transparent'
            }`}
          >
            Structure
          </button>
          <button
            type="button"
            onClick={() => handleTabClick('explanation')}
            className={`px-2 py-0.5 rounded-[3px] text-xs font-mono transition-colors ${
              activeTab === 'explanation'
                ? 'bg-surface-raised text-foreground font-medium border border-border'
                : 'text-foreground-muted hover:text-foreground border border-transparent'
            }`}
          >
            Explanation
          </button>
        </div>

        {/* Deselect button returns to repository summary */}
        {selectedTarget && (
          <button
            type="button"
            onClick={() => onSelectTarget?.(null)}
            className="flex h-5 w-5 items-center justify-center rounded-[3px] text-foreground-muted hover:text-foreground hover:bg-surface-raised text-[11px] font-mono transition-colors"
            title="Deselect to return to repository summary"
          >
            ✕
          </button>
        )}
      </div>

      {/* Pane Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 text-xs leading-relaxed divide-y divide-border-subtle">
        {activeTab === 'explanation' ? (
          /* =========================================================================
             TAB 2: EXPLANATION (Empty state for now per spec)
             ========================================================================= */
          <div className="py-2 space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                Explanation Target
              </span>
              <div className="font-mono text-xs text-foreground font-medium break-all">
                {selectedFile ? (
                  <FormattedPath path={selectedFile.path} />
                ) : selectedTarget?.type === 'node' ? (
                  <span>Folder: {selectedTarget.id}</span>
                ) : (
                  <span>{repoDisplayName}</span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-[4px] border border-border bg-surface-raised/40 p-6 text-center">
              <span className="text-accent text-sm mb-2 opacity-60">◈</span>
              <p className="text-xs font-medium text-foreground mb-1">
                No explanation generated yet
              </p>
              <p className="text-[11px] text-foreground-muted max-w-[220px]">
                {selectedFile
                  ? 'File explanations will synthesize dependencies, dependents, and real code context once model calls are connected.'
                  : selectedTarget?.type === 'node'
                  ? 'Folder summaries will be synthesized from internal modules once model calls are connected.'
                  : 'Repository overview explanations will appear here once model analysis is connected.'}
              </p>
            </div>
          </div>
        ) : selectedFile ? (
          /* =========================================================================
             STATE A: SELECTED FILE DETAIL
             ========================================================================= */
          <div className="space-y-4 py-1">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  File Detail
                </span>
                <span className="rounded-[3px] border border-border bg-surface-raised px-1.5 py-0.2 text-[9px] text-foreground-muted font-mono uppercase">
                  {selectedFile.role}
                </span>
              </div>
              <div className="break-all font-mono text-xs font-semibold text-foreground">
                <FormattedPath path={selectedFile.path} />
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-1.5 rounded-[4px] border border-border bg-surface-raised/50 p-2 text-center font-mono">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Length
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {selectedFile.lines}L
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Imports
                </span>
                <span className="text-xs font-semibold text-outgoing">
                  ↑ {outgoingDependencies.length}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Imported By
                </span>
                <span className="text-xs font-semibold text-incoming">
                  ↓ {incomingDependents.length}
                </span>
              </div>
            </div>

            {/* Outgoing Dependencies (Files it depends on) */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Depends On
                </span>
                <span className="text-[10px] font-mono font-medium text-outgoing">
                  {outgoingDependencies.length}
                </span>
              </div>

              {outgoingDependencies.length === 0 ? (
                <div className="text-[11px] text-foreground-muted italic py-1 px-2 rounded-[3px] bg-surface-raised/30">
                  Does not import any internal repository files.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border-subtle rounded-[4px] border border-border bg-surface max-h-56 overflow-y-auto">
                  {outgoingDependencies.map((targetPath) => {
                    const isHovered =
                      hoveredTarget?.type === 'file' && hoveredTarget.id === targetPath;
                    return (
                      <button
                        type="button"
                        key={targetPath}
                        onClick={() => handleToggleSelectFile(targetPath)}
                        onMouseEnter={() => onHoverTarget?.({ type: 'file', id: targetPath })}
                        onMouseLeave={() => onHoverTarget?.(null)}
                        className={`w-full text-left flex items-center justify-between px-2 py-1.5 text-xs transition-colors cursor-pointer group ${
                          isHovered
                            ? 'bg-accent/15 text-accent font-medium'
                            : 'hover:bg-surface-raised text-foreground'
                        }`}
                        title={`Select ${targetPath}`}
                      >
                        <FormattedPath path={targetPath} className="truncate text-[11px]" />
                        <span className="shrink-0 text-[10px] text-foreground-muted ml-2 group-hover:text-accent">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Incoming Dependents (Files that depend on it) */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Depended On By
                </span>
                <span className="text-[10px] font-mono font-medium text-incoming">
                  {incomingDependents.length}
                </span>
              </div>

              {incomingDependents.length === 0 ? (
                <div className="text-[11px] text-foreground-muted italic py-1 px-2 rounded-[3px] bg-surface-raised/30">
                  Nothing imports this file directly (reading start / leaf).
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border-subtle rounded-[4px] border border-border bg-surface max-h-56 overflow-y-auto">
                  {incomingDependents.map((sourcePath) => {
                    const isHovered =
                      hoveredTarget?.type === 'file' && hoveredTarget.id === sourcePath;
                    return (
                      <button
                        type="button"
                        key={sourcePath}
                        onClick={() => handleToggleSelectFile(sourcePath)}
                        onMouseEnter={() => onHoverTarget?.({ type: 'file', id: sourcePath })}
                        onMouseLeave={() => onHoverTarget?.(null)}
                        className={`w-full text-left flex items-center justify-between px-2 py-1.5 text-xs transition-colors cursor-pointer group ${
                          isHovered
                            ? 'bg-accent/15 text-accent font-medium'
                            : 'hover:bg-surface-raised text-foreground'
                        }`}
                        title={`Select ${sourcePath}`}
                      >
                        <FormattedPath path={sourcePath} className="truncate text-[11px]" />
                        <span className="shrink-0 text-[10px] text-foreground-muted ml-2 group-hover:text-accent">
                          ←
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : selectedTarget?.type === 'node' ? (
          /* =========================================================================
             STATE B: SELECTED FOLDER DETAIL
             ========================================================================= */
          <div className="space-y-4 py-1">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Folder Detail
                </span>
                <span className="rounded-[3px] border border-border bg-surface-raised px-1.5 py-0.2 text-[9px] text-foreground-muted font-mono">
                  {selectedFolderFiles.length} files
                </span>
              </div>
              <div className="break-all font-mono text-xs font-semibold text-foreground">
                {selectedTarget.id === '.' ? 'root' : selectedTarget.id}
              </div>
            </div>

            {/* Folder Metrics Bar */}
            <div className="grid grid-cols-2 gap-1.5 rounded-[4px] border border-border bg-surface-raised/50 p-2 text-center font-mono">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Total Files
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {selectedFolderFiles.length}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Total Lines
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {selectedFolderFiles.reduce((acc, f) => acc + f.lines, 0)}L
                </span>
              </div>
            </div>

            {/* Category Breakdown inside folder */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                File Kinds Inside Folder
              </span>
              <div className="flex flex-col divide-y divide-border-subtle rounded-[4px] border border-border bg-surface">
                {folderCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between px-2.5 py-1.5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${cat.swatchClass}`} />
                      <span className="text-foreground">{cat.name}</span>
                    </div>
                    <span className="text-foreground-muted font-medium">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extension Breakdown inside folder */}
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                Extensions
              </span>
              <div className="flex flex-wrap gap-1">
                {folderExtensionBreakdown.map(([ext, count]) => (
                  <span
                    key={ext}
                    className="rounded-[3px] border border-border bg-surface-raised px-1.5 py-0.5 text-[10px] font-mono text-foreground"
                  >
                    <span className="text-foreground-muted">{ext}</span>{' '}
                    <span className="font-semibold">{count}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Files List in Folder */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Files Inside ({selectedFolderFiles.length})
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border-subtle rounded-[4px] border border-border bg-surface max-h-60 overflow-y-auto">
                {selectedFolderFiles.map((file) => {
                  const isHovered =
                    hoveredTarget?.type === 'file' && hoveredTarget.id === file.id;
                  return (
                    <button
                      type="button"
                      key={file.id}
                      onClick={() => handleToggleSelectFile(file.id)}
                      onMouseEnter={() => onHoverTarget?.({ type: 'file', id: file.id })}
                      onMouseLeave={() => onHoverTarget?.(null)}
                      className={`w-full text-left flex items-center justify-between px-2 py-1.5 text-xs transition-colors cursor-pointer group ${
                        isHovered
                          ? 'bg-accent/15 text-accent font-medium'
                          : 'hover:bg-surface-raised text-foreground'
                      }`}
                      title={`Select ${file.path}`}
                    >
                      <FormattedPath path={file.path} className="truncate text-[11px]" />
                      <span className="shrink-0 text-[10px] text-foreground-muted ml-2">
                        {file.lines}L
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STATE C: REPOSITORY SUMMARY (Pane's resting state when nothing is selected)
             ========================================================================= */
          <div className="space-y-4 py-1">
            {/* Repo Title & Detected Framework */}
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Repository Overview
                </span>
                <span className="rounded-[3px] border border-border bg-surface-raised px-1.5 py-0.2 text-[9px] text-foreground-muted font-mono">
                  {detectedFramework}
                </span>
              </div>
              <div className="font-mono text-sm font-semibold text-foreground tracking-tight">
                {repoDisplayName}
              </div>
            </div>

            {/* Counts Grid: Files, Imports, Routes, No Convention */}
            <div className="grid grid-cols-2 gap-1.5 rounded-[4px] border border-border bg-surface-raised/40 p-2 text-center font-mono">
              <div className="flex flex-col border-b border-r border-border/50 pb-1.5">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Files
                </span>
                <span className="text-sm font-semibold text-foreground">{files.length}</span>
              </div>
              <div className="flex flex-col border-b border-border/50 pb-1.5">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Imports
                </span>
                <span className="text-sm font-semibold text-foreground">{edges.length}</span>
              </div>
              <div className="flex flex-col border-r border-border/50 pt-1.5">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  Routes
                </span>
                <span className="text-sm font-semibold text-foreground">0</span>
              </div>
              <div className="flex flex-col pt-1.5">
                <span className="text-[9px] uppercase tracking-wider text-foreground-muted">
                  No Convention
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {unidentifiedConventionCount}
                </span>
              </div>
            </div>

            {/* Ranked List 1: Most Depended-On Files */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Most Depended On
                </span>
                <span className="text-[9px] font-mono text-foreground-muted">
                  by incoming imports
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border-subtle rounded-[4px] border border-border bg-surface">
                {mostDependedOn.map((file) => {
                  const isHovered =
                    hoveredTarget?.type === 'file' && hoveredTarget.id === file.id;
                  return (
                    <button
                      type="button"
                      key={file.id}
                      onClick={() => handleToggleSelectFile(file.id)}
                      onMouseEnter={() => onHoverTarget?.({ type: 'file', id: file.id })}
                      onMouseLeave={() => onHoverTarget?.(null)}
                      className={`w-full text-left flex items-center justify-between px-2 py-1.5 text-xs transition-colors cursor-pointer group ${
                        isHovered
                          ? 'bg-accent/15 text-accent font-medium'
                          : 'hover:bg-surface-raised text-foreground'
                      }`}
                      title={`${file.path} — imported by ${file.fanIn} files`}
                    >
                      <FormattedPath path={file.path} className="truncate text-[11px]" />
                      <span className="shrink-0 text-[10px] text-incoming font-medium ml-2">
                        ↓ {file.fanIn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ranked List 2: Reading Starts Here */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-foreground-muted">
                  Reading Starts Here
                </span>
                <span className="text-[9px] font-mono text-foreground-muted">
                  unimported modules
                </span>
              </div>
              <div className="flex flex-col divide-y divide-border-subtle rounded-[4px] border border-border bg-surface">
                {readingStarts.map((file) => {
                  const isHovered =
                    hoveredTarget?.type === 'file' && hoveredTarget.id === file.id;
                  return (
                    <button
                      type="button"
                      key={file.id}
                      onClick={() => handleToggleSelectFile(file.id)}
                      onMouseEnter={() => onHoverTarget?.({ type: 'file', id: file.id })}
                      onMouseLeave={() => onHoverTarget?.(null)}
                      className={`w-full text-left flex items-center justify-between px-2 py-1.5 text-xs transition-colors cursor-pointer group ${
                        isHovered
                          ? 'bg-accent/15 text-accent font-medium'
                          : 'hover:bg-surface-raised text-foreground'
                      }`}
                      title={`${file.path} — unimported entry point (imports ${file.fanOut} files)`}
                    >
                      <FormattedPath path={file.path} className="truncate text-[11px]" />
                      <span className="shrink-0 text-[10px] text-outgoing font-medium ml-2">
                        ↑ {file.fanOut}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unidentified files explanation note */}
            <div className="pt-2 text-[10px] text-foreground-muted/80 leading-relaxed border-t border-border-subtle">
              <span className="font-semibold text-foreground-muted">
                {unidentifiedConventionCount} files
              </span>{' '}
              have no framework convention identified and retain generic module status.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
