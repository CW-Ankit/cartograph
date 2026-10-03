'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  Background,
  Controls,
  Node,
  Edge as FlowEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ParseResult } from '@/lib/parser/types';
import { foldRepository } from '@/lib/graph/folding';
import { calculateDagreLayout, MAX_PANEL_FILES } from '@/lib/graph/layout';
import { FoldedNodeComponent } from './folded-node';
import { OpenPanelNodeComponent } from './open-panel-node';
import type { CanvasSelectionTarget, CanvasHoverTarget } from './right-pane';

const nodeTypes = {
  foldedNode: FoldedNodeComponent,
  openPanel: OpenPanelNodeComponent,
};

export interface GraphCanvasProps {
  parseResult: ParseResult;
  selectedTarget?: CanvasSelectionTarget;
  onSelectTarget?: (target: CanvasSelectionTarget) => void;
  hoveredTarget?: CanvasHoverTarget;
  onHoverTarget?: (target: CanvasHoverTarget) => void;
  onSelectElement?: (element: CanvasSelectionTarget) => void;
}

export function GraphCanvas({
  parseResult,
  selectedTarget,
  onSelectTarget,
  hoveredTarget,
  onHoverTarget,
  onSelectElement,
}: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner
        parseResult={parseResult}
        selectedTarget={selectedTarget}
        onSelectTarget={onSelectTarget}
        hoveredTarget={hoveredTarget}
        onHoverTarget={onHoverTarget}
        onSelectElement={onSelectElement}
      />
    </ReactFlowProvider>
  );
}

function GraphCanvasInner({
  parseResult,
  selectedTarget: externalSelectedTarget,
  onSelectTarget,
  hoveredTarget: externalHoveredTarget,
  onHoverTarget,
  onSelectElement,
}: GraphCanvasProps) {
  const { fitView, getZoom } = useReactFlow();

  // State: expanded folder node IDs
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(() => new Set());

  // Internal state fallback if uncontrolled
  const [internalSelectedTarget, setInternalSelectedTarget] = useState<CanvasSelectionTarget>(null);
  const selectedTarget = externalSelectedTarget !== undefined ? externalSelectedTarget : internalSelectedTarget;

  const [internalHoveredTarget, setInternalHoveredTarget] = useState<CanvasHoverTarget>(null);
  const hoveredTarget = externalHoveredTarget !== undefined ? externalHoveredTarget : internalHoveredTarget;

  const handleSelect = useCallback(
    (target: CanvasSelectionTarget) => {
      setInternalSelectedTarget(target);
      onSelectTarget?.(target);
      onSelectElement?.(target);
    },
    [onSelectTarget, onSelectElement]
  );

  const handleHover = useCallback(
    (target: CanvasHoverTarget) => {
      setInternalHoveredTarget(target);
      onHoverTarget?.(target);
    },
    [onHoverTarget]
  );

  // 1. Compute folded graph (pure function)
  const foldingResult = useMemo(() => {
    return foldRepository(parseResult.files, parseResult.edges, 24);
  }, [parseResult.files, parseResult.edges]);

  const { nodes: foldedNodes, edges: derivedEdges, fileToNodeMap } = foldingResult;

  // Effective open node IDs: includes any explicitly opened folder, plus auto-opened folder for selected file
  const effectiveOpenNodeIds = useMemo(() => {
    if (selectedTarget?.type === 'file') {
      const hostNodeId = fileToNodeMap.get(selectedTarget.id);
      if (hostNodeId && !openNodeIds.has(hostNodeId)) {
        const next = new Set(openNodeIds);
        next.add(hostNodeId);
        return next;
      }
    }
    return openNodeIds;
  }, [selectedTarget, fileToNodeMap, openNodeIds]);

  // Track initial mount for fitView
  const isInitialMount = useRef(true);

  // 2. Compute deterministic layout whenever effectiveOpenNodeIds changes
  const layout = useMemo(() => {
    return calculateDagreLayout(foldedNodes, derivedEdges, effectiveOpenNodeIds);
  }, [foldedNodes, derivedEdges, effectiveOpenNodeIds]);

  // Handle open folder
  const handleOpenFolder = useCallback(
    (nodeId: string) => {
      setOpenNodeIds((prev) => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });

      // Constraint: Refitting on open may only ever zoom out, never in.
      requestAnimationFrame(() => {
        const currentZoom = getZoom();
        fitView({
          padding: 0.15,
          maxZoom: currentZoom,
          duration: 120,
        });
      });
    },
    [getZoom, fitView]
  );

  // Handle close folder
  const handleCloseFolder = useCallback((nodeId: string) => {
    setOpenNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  // Handle node selection
  const handleSelectNode = useCallback(
    (nodeId: string) => {
      const next: CanvasSelectionTarget =
        selectedTarget?.type === 'node' && selectedTarget.id === nodeId
          ? null
          : { type: 'node', id: nodeId };
      handleSelect(next);
    },
    [selectedTarget, handleSelect]
  );

  // Handle file selection
  const handleSelectFile = useCallback(
    (fileId: string) => {
      const next: CanvasSelectionTarget =
        selectedTarget?.type === 'file' && selectedTarget.id === fileId
          ? null
          : { type: 'file', id: fileId };
      handleSelect(next);
    },
    [selectedTarget, handleSelect]
  );

  // Handle pane click to deselect (returns to repository summary)
  const handlePaneClick = useCallback(() => {
    handleSelect(null);
  }, [handleSelect]);

  // Initial fitView on load
  useEffect(() => {
    if (isInitialMount.current && layout.positions.size > 0) {
      isInitialMount.current = false;
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, minZoom: 0.2, maxZoom: 1 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [layout, fitView]);

  // 3. Calculate active connected elements for selection dimming
  const selectionInfo = useMemo(() => {
    if (!selectedTarget) {
      return {
        activeNodeIds: new Set<string>(),
        activeFileIds: new Set<string>(),
        activeEdgeIds: new Set<string>(),
        incomingEdgeIds: new Set<string>(),
        outgoingEdgeIds: new Set<string>(),
      };
    }

    const activeNodeIds = new Set<string>();
    const activeFileIds = new Set<string>();
    const activeEdgeIds = new Set<string>();
    const incomingEdgeIds = new Set<string>();
    const outgoingEdgeIds = new Set<string>();

    if (selectedTarget.type === 'node') {
      const targetNodeId = selectedTarget.id;
      activeNodeIds.add(targetNodeId);

      for (const edge of derivedEdges) {
        if (edge.sourceNodeId === targetNodeId) {
          activeEdgeIds.add(edge.id);
          outgoingEdgeIds.add(edge.id);
          activeNodeIds.add(edge.targetNodeId);
          activeFileIds.add(edge.sourceFileId);
          activeFileIds.add(edge.targetFileId);
        } else if (edge.targetNodeId === targetNodeId) {
          activeEdgeIds.add(edge.id);
          incomingEdgeIds.add(edge.id);
          activeNodeIds.add(edge.sourceNodeId);
          activeFileIds.add(edge.sourceFileId);
          activeFileIds.add(edge.targetFileId);
        }
      }
    } else if (selectedTarget.type === 'file') {
      const targetFileId = selectedTarget.id;
      activeFileIds.add(targetFileId);
      const hostNodeId = fileToNodeMap.get(targetFileId);
      if (hostNodeId) activeNodeIds.add(hostNodeId);

      for (const edge of derivedEdges) {
        if (edge.sourceFileId === targetFileId) {
          activeEdgeIds.add(edge.id);
          outgoingEdgeIds.add(edge.id);
          activeFileIds.add(edge.targetFileId);
          activeNodeIds.add(edge.targetNodeId);
          activeNodeIds.add(edge.sourceNodeId);
        } else if (edge.targetFileId === targetFileId) {
          activeEdgeIds.add(edge.id);
          incomingEdgeIds.add(edge.id);
          activeFileIds.add(edge.sourceFileId);
          activeNodeIds.add(edge.sourceNodeId);
          activeNodeIds.add(edge.targetNodeId);
        }
      }
    }

    return {
      activeNodeIds,
      activeFileIds,
      activeEdgeIds,
      incomingEdgeIds,
      outgoingEdgeIds,
    };
  }, [selectedTarget, derivedEdges, fileToNodeMap]);

  // 4. Construct React Flow nodes
  const flowNodes: Node[] = useMemo(() => {
    return foldedNodes.map((node) => {
      const pos = layout.positions.get(node.id) || { x: 0, y: 0 };
      const isOpen = effectiveOpenNodeIds.has(node.id);
      const isSelected = selectedTarget?.type === 'node' && selectedTarget.id === node.id;
      const isConnected = selectionInfo.activeNodeIds.has(node.id);
      const isDimmed = selectedTarget !== null && !isSelected && !isConnected;

      // Hover highlighting
      const isHovered =
        (hoveredTarget?.type === 'node' && hoveredTarget.id === node.id) ||
        (hoveredTarget?.type === 'file' && node.files.some((f) => f.id === hoveredTarget.id));

      if (isOpen) {
        return {
          id: node.id,
          type: 'openPanel',
          position: { x: pos.x, y: pos.y },
          data: {
            node,
            isDimmed,
            selectedFileId: selectedTarget?.type === 'file' ? selectedTarget.id : null,
            activeFileIds: selectionInfo.activeFileIds,
            hoveredFileId: hoveredTarget?.type === 'file' ? hoveredTarget.id : null,
            onClose: handleCloseFolder,
            onSelectFile: handleSelectFile,
            onHoverFile: (fileId: string | null) =>
              handleHover(fileId ? { type: 'file', id: fileId } : null),
          },
        };
      }

      return {
        id: node.id,
        type: 'foldedNode',
        position: { x: pos.x, y: pos.y },
        data: {
          node,
          isDimmed,
          isSelected,
          isConnected,
          isHovered,
          onOpen: handleOpenFolder,
          onSelect: handleSelectNode,
          onHover: (target: { type: 'node'; id: string } | null) => handleHover(target),
        },
      };
    });
  }, [
    foldedNodes,
    layout.positions,
    effectiveOpenNodeIds,
    selectedTarget,
    selectionInfo,
    hoveredTarget,
    handleOpenFolder,
    handleCloseFolder,
    handleSelectNode,
    handleSelectFile,
    handleHover,
  ]);

  // 5. Construct React Flow edges
  const flowEdges: FlowEdge[] = useMemo(() => {
    const edgeList: FlowEdge[] = [];
    const closedPairsDrawn = new Set<string>();

    for (const edge of derivedEdges) {
      if (edge.sourceNodeId === edge.targetNodeId) continue;

      const isSourceOpen = effectiveOpenNodeIds.has(edge.sourceNodeId);
      const isTargetOpen = effectiveOpenNodeIds.has(edge.targetNodeId);

      // If both are closed, deduplicate visually to one connection line between nodes
      if (!isSourceOpen && !isTargetOpen) {
        const pairKey = `${edge.sourceNodeId}-->${edge.targetNodeId}`;
        if (closedPairsDrawn.has(pairKey)) continue;
        closedPairsDrawn.add(pairKey);
      }

      const isEdgeActive = selectionInfo.activeEdgeIds.has(edge.id);
      const isOutgoing = selectionInfo.outgoingEdgeIds.has(edge.id);
      const isIncoming = selectionInfo.incomingEdgeIds.has(edge.id);
      const isDimmed = selectedTarget !== null && !isEdgeActive;

      // Hover connection highlighting
      const isHoverEdge =
        hoveredTarget?.type === 'file'
          ? edge.sourceFileId === hoveredTarget.id || edge.targetFileId === hoveredTarget.id
          : hoveredTarget?.type === 'node'
          ? edge.sourceNodeId === hoveredTarget.id || edge.targetNodeId === hoveredTarget.id
          : false;

      // Handle resolution for open panels
      let sourceHandle: string | null = null;
      let targetHandle: string | null = null;

      if (isSourceOpen) {
        const sourceNode = foldedNodes.find((n) => n.id === edge.sourceNodeId);
        const sourceIndex = sourceNode?.files.findIndex((f) => f.id === edge.sourceFileId) ?? -1;
        sourceHandle =
          sourceIndex >= 0 && sourceIndex < MAX_PANEL_FILES
            ? edge.sourceFileId
            : `${edge.sourceNodeId}-source`;
      }

      if (isTargetOpen) {
        const targetNode = foldedNodes.find((n) => n.id === edge.targetNodeId);
        const targetIndex = targetNode?.files.findIndex((f) => f.id === edge.targetFileId) ?? -1;
        targetHandle =
          targetIndex >= 0 && targetIndex < MAX_PANEL_FILES
            ? edge.targetFileId
            : `${edge.targetNodeId}-target`;
      }

      // Edge styling per delta.dev guidelines
      let strokeColor = '#3f3f46';
      let strokeWidth = 1;
      let zIndex = 1;

      if (isHoverEdge) {
        strokeColor = 'var(--accent)';
        strokeWidth = 2.5;
        zIndex = 25;
      } else if (isOutgoing) {
        strokeColor = 'var(--outgoing)';
        strokeWidth = 2;
        zIndex = 10;
      } else if (isIncoming) {
        strokeColor = 'var(--incoming)';
        strokeWidth = 2;
        zIndex = 10;
      } else if (isDimmed) {
        strokeColor = 'var(--border)';
        strokeWidth = 0.8;
      }

      edgeList.push({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        zIndex,
        style: {
          stroke: strokeColor,
          strokeWidth,
          opacity: isHoverEdge ? 1 : isDimmed ? 0.1 : 0.85,
          transition: 'all 120ms ease',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 8,
          height: 8,
          color: strokeColor,
        },
      });
    }

    return edgeList;
  }, [derivedEdges, effectiveOpenNodeIds, foldedNodes, selectionInfo, selectedTarget, hoveredTarget]);

  return (
    <div className="relative h-full w-full bg-background bg-grid-pattern">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onPaneClick={handlePaneClick}
        fitView
        minZoom={0.15}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        className="h-full w-full"
      >
        <Background color="var(--border)" gap={24} size={1} />
        <Controls
          showInteractive={false}
          className="!bottom-4 !right-4 !border !border-border !bg-surface !shadow-none !rounded-[4px] [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-foreground hover:[&>button]:!bg-surface-raised"
        />
      </ReactFlow>

      {/* Floating Canvas Status Indicator */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-[4px] border border-border bg-surface/90 px-2.5 py-1 font-mono text-[10px] text-foreground-muted backdrop-blur-sm">
        <span>Nodes: {foldedNodes.length}</span>
        <span className="text-border">·</span>
        <span>Edges: {derivedEdges.length}</span>
        <span className="text-border">·</span>
        <span>Threshold: &ge;{foldingResult.threshold} files</span>
        {selectedTarget ? (
          <>
            <span className="text-border">·</span>
            <span className="text-accent font-medium">
              Selected: {selectedTarget.type} ({selectedTarget.id})
            </span>
          </>
        ) : (
          <>
            <span className="text-border">·</span>
            <span>No selection (Repo overview)</span>
          </>
        )}
        {hoveredTarget && (
          <>
            <span className="text-border">·</span>
            <span className="text-incoming font-medium">
              Hover: {hoveredTarget.type} ({hoveredTarget.id})
            </span>
          </>
        )}
      </div>
    </div>
  );
}
