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

const nodeTypes = {
  foldedNode: FoldedNodeComponent,
  openPanel: OpenPanelNodeComponent,
};

interface GraphCanvasProps {
  parseResult: ParseResult;
  onSelectElement?: (element: { type: 'node' | 'file'; id: string } | null) => void;
}

export function GraphCanvas({ parseResult, onSelectElement }: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner parseResult={parseResult} onSelectElement={onSelectElement} />
    </ReactFlowProvider>
  );
}

function GraphCanvasInner({ parseResult, onSelectElement }: GraphCanvasProps) {
  const { fitView, getZoom } = useReactFlow();

  // State: expanded folder node IDs
  const [openNodeIds, setOpenNodeIds] = useState<Set<string>>(() => new Set());

  // State: selected target (node or file)
  const [selectedTarget, setSelectedTarget] = useState<
    { type: 'node'; id: string } | { type: 'file'; id: string } | null
  >(null);

  // 1. Compute folded graph (pure function)
  const foldingResult = useMemo(() => {
    return foldRepository(parseResult.files, parseResult.edges, 24);
  }, [parseResult.files, parseResult.edges]);

  const { nodes: foldedNodes, edges: derivedEdges, fileToNodeMap } = foldingResult;

  // Track initial mount for fitView
  const isInitialMount = useRef(true);

  // 2. Compute deterministic layout whenever openNodeIds changes
  const layout = useMemo(() => {
    return calculateDagreLayout(foldedNodes, derivedEdges, openNodeIds);
  }, [foldedNodes, derivedEdges, openNodeIds]);

  // Handle open folder
  const handleOpenFolder = useCallback(
    (nodeId: string) => {
      setOpenNodeIds((prev) => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });

      // Constraint: Refitting on open may only ever zoom out, never in.
      // We read the current zoom level and clamp maxZoom to it.
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

  // Handle selection
  const handleSelectNode = useCallback(
    (nodeId: string) => {
      setSelectedTarget((prev) => {
        const next: { type: 'node'; id: string } | null =
          prev?.type === 'node' && prev.id === nodeId ? null : { type: 'node', id: nodeId };
        onSelectElement?.(next);
        return next;
      });
    },
    [onSelectElement]
  );

  const handleSelectFile = useCallback(
    (fileId: string) => {
      setSelectedTarget((prev) => {
        const next: { type: 'file'; id: string } | null =
          prev?.type === 'file' && prev.id === fileId ? null : { type: 'file', id: fileId };
        onSelectElement?.(next);
        return next;
      });
    },
    [onSelectElement]
  );

  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    setSelectedTarget(null);
    onSelectElement?.(null);
  }, [onSelectElement]);

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
      const isOpen = openNodeIds.has(node.id);
      const isSelected = selectedTarget?.type === 'node' && selectedTarget.id === node.id;
      const isConnected = selectionInfo.activeNodeIds.has(node.id);
      const isDimmed = selectedTarget !== null && !isSelected && !isConnected;

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
            onClose: handleCloseFolder,
            onSelectFile: handleSelectFile,
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
          onOpen: handleOpenFolder,
          onSelect: handleSelectNode,
        },
      };
    });
  }, [
    foldedNodes,
    layout.positions,
    openNodeIds,
    selectedTarget,
    selectionInfo,
    handleOpenFolder,
    handleCloseFolder,
    handleSelectNode,
    handleSelectFile,
  ]);

  // 5. Construct React Flow edges
  const flowEdges: FlowEdge[] = useMemo(() => {
    const edgeList: FlowEdge[] = [];

    // Track drawn pairs between folded nodes to avoid visual edge clutter when closed
    const closedPairsDrawn = new Set<string>();

    for (const edge of derivedEdges) {
      if (edge.sourceNodeId === edge.targetNodeId) continue;

      const isSourceOpen = openNodeIds.has(edge.sourceNodeId);
      const isTargetOpen = openNodeIds.has(edge.targetNodeId);

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

      // Handle resolution for open panels
      let sourceHandle: string | null = null;
      let targetHandle: string | null = null;

      if (isSourceOpen) {
        const sourceNode = foldedNodes.find((n) => n.id === edge.sourceNodeId);
        const sourceIndex = sourceNode?.files.findIndex((f) => f.id === edge.sourceFileId) ?? -1;
        sourceHandle = sourceIndex >= 0 && sourceIndex < MAX_PANEL_FILES
          ? edge.sourceFileId
          : `${edge.sourceNodeId}-source`;
      }

      if (isTargetOpen) {
        const targetNode = foldedNodes.find((n) => n.id === edge.targetNodeId);
        const targetIndex = targetNode?.files.findIndex((f) => f.id === edge.targetFileId) ?? -1;
        targetHandle = targetIndex >= 0 && targetIndex < MAX_PANEL_FILES
          ? edge.targetFileId
          : `${edge.targetNodeId}-target`;
      }

      // Edge styling per delta.dev guidelines
      let strokeColor = '#3f3f46'; // subtle hairline
      let strokeWidth = 1;
      let zIndex = 1;

      if (isOutgoing) {
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
          opacity: isDimmed ? 0.1 : 0.85,
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
  }, [derivedEdges, openNodeIds, foldedNodes, selectionInfo, selectedTarget]);

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
        {selectedTarget && (
          <>
            <span className="text-border">·</span>
            <span className="text-accent font-medium">
              Selected: {selectedTarget.type} ({selectedTarget.id})
            </span>
          </>
        )}
      </div>
    </div>
  );
}
