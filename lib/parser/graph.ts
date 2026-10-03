import type { ParsedFile, Edge, ImportKind } from './types';
import type { RawEdge } from './parse';

export interface GraphCalculationResult {
  files: ParsedFile[];
  edges: Edge[];
}

/**
 * Pure graph calculations over a file list and a raw edge list.
 * Deduplicates edges between identical source and target files,
 * and calculates fan-in and fan-out per node.
 */
export function calculateGraphMetrics(
  files: ParsedFile[],
  rawEdges: RawEdge[]
): GraphCalculationResult {
  const fileMap = new Map<string, ParsedFile>();
  for (const file of files) {
    fileMap.set(file.id, file);
  }

  // Deduplicate edges between same source and target, aggregating kinds
  const edgeMap = new Map<string, { source: string; target: string; kindsSet: Set<ImportKind> }>();

  for (const raw of rawEdges) {
    // Only connect edges between nodes that exist in the graph
    if (!fileMap.has(raw.source) || !fileMap.has(raw.target)) {
      continue;
    }

    const edgeId = `${raw.source}->${raw.target}`;
    const existing = edgeMap.get(edgeId);

    if (existing) {
      existing.kindsSet.add(raw.kind);
    } else {
      edgeMap.set(edgeId, {
        source: raw.source,
        target: raw.target,
        kindsSet: new Set([raw.kind]),
      });
    }
  }

  const edges: Edge[] = [];
  const fanInCounts = new Map<string, number>();
  const fanOutCounts = new Map<string, number>();

  for (const [id, item] of edgeMap.entries()) {
    const kinds = Array.from(item.kindsSet).sort();
    edges.push({
      id,
      source: item.source,
      target: item.target,
      kinds,
    });

    fanOutCounts.set(item.source, (fanOutCounts.get(item.source) ?? 0) + 1);
    fanInCounts.set(item.target, (fanInCounts.get(item.target) ?? 0) + 1);
  }

  // Pure mapping: attach computed fanIn and fanOut to each file
  const updatedFiles: ParsedFile[] = files.map((file) => ({
    ...file,
    fanIn: fanInCounts.get(file.id) ?? 0,
    fanOut: fanOutCounts.get(file.id) ?? 0,
  }));

  // Sort edges deterministically by source, then target
  edges.sort((a, b) => {
    const cmp = a.source.localeCompare(b.source);
    if (cmp !== 0) return cmp;
    return a.target.localeCompare(b.target);
  });

  return {
    files: updatedFiles,
    edges,
  };
}
