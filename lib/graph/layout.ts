import dagre from 'dagre';
import type { FoldedNode, DerivedGraphEdge } from './folding';

export const MAX_PANEL_FILES = 10;
export const PANEL_WIDTH = 280;
export const ROW_HEIGHT = 26;
export const HEADER_HEIGHT = 38;
export const OVERFLOW_HEIGHT = 26;

export function getOpenPanelDimensions(fileCount: number, labelWidth: number): { width: number; height: number } {
  const visibleRows = Math.min(fileCount, MAX_PANEL_FILES);
  const hasOverflow = fileCount > MAX_PANEL_FILES;
  const height = HEADER_HEIGHT + visibleRows * ROW_HEIGHT + (hasOverflow ? OVERFLOW_HEIGHT : 0) + 8;
  const width = Math.max(PANEL_WIDTH, labelWidth + 40);
  return { width, height };
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  positions: Map<string, NodePosition>;
  width: number;
  height: number;
}

/**
 * Pure, deterministic graph layout calculation using Dagre.
 * Always produces identical positioning for the same input dataset and expansion state.
 */
export function calculateDagreLayout(
  nodes: FoldedNode[],
  edges: DerivedGraphEdge[],
  openNodeIds: Set<string>
): LayoutResult {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',
    nodesep: 48,
    ranksep: 96,
    marginx: 48,
    marginy: 48,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Deterministic sorting
  const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

  // Compute dimensions for each node
  const dimensionMap = new Map<string, { width: number; height: number }>();
  for (const node of sortedNodes) {
    const isOpen = openNodeIds.has(node.id);
    const dims = isOpen
      ? getOpenPanelDimensions(node.files.length, node.width)
      : { width: node.width, height: node.height };
    dimensionMap.set(node.id, dims);
    g.setNode(node.id, { width: dims.width, height: dims.height });
  }

  // Deduplicate and sort edges between nodes
  const nodeEdgeSet = new Set<string>();
  const sortedEdges = [...edges].sort((a, b) => a.id.localeCompare(b.id));

  for (const edge of sortedEdges) {
    if (edge.sourceNodeId === edge.targetNodeId) continue;
    const pair = `${edge.sourceNodeId}-->${edge.targetNodeId}`;
    if (!nodeEdgeSet.has(pair)) {
      nodeEdgeSet.add(pair);
      g.setEdge(edge.sourceNodeId, edge.targetNodeId);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, NodePosition>();
  for (const node of sortedNodes) {
    const nodeData = g.node(node.id);
    const dims = dimensionMap.get(node.id)!;
    positions.set(node.id, {
      id: node.id,
      x: Math.round(nodeData.x - dims.width / 2),
      y: Math.round(nodeData.y - dims.height / 2),
      width: dims.width,
      height: dims.height,
    });
  }

  const graphData = g.graph();
  return {
    positions,
    width: graphData.width || 1200,
    height: graphData.height || 800,
  };
}
