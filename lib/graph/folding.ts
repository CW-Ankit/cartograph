import type { ParsedFile, Edge } from '@/lib/parser/types';

export interface FoldedNode {
  id: string;
  path: string;
  label: string;
  files: ParsedFile[];
  fanIn: number;
  fanOut: number;
  width: number;
  height: number;
}

export interface DerivedGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceFileId: string;
  targetFileId: string;
  kinds: string[];
}

export interface FoldingResult {
  threshold: number;
  nodes: FoldedNode[];
  edges: DerivedGraphEdge[];
  fileToNodeMap: Map<string, string>;
}

function getDepth(dir: string): number {
  if (dir === '.' || dir === '') return 0;
  return dir.split('/').length;
}

function getParent(dir: string): string | null {
  if (dir === '.' || dir === '') return null;
  const parts = dir.split('/');
  if (parts.length <= 1) return '.';
  return parts.slice(0, -1).join('/');
}

/**
 * Computes the shortest suffix for each directory path that remains strictly unique
 * among all paths currently on screen.
 */
export function computeShortestUniqueLabels(paths: string[]): Map<string, string> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  // Handle root directory explicitly
  const normalizedPaths = paths.map((p) => (p === '' ? '.' : p));

  for (const path of normalizedPaths) {
    if (path === '.') {
      result.set(path, 'root');
      continue;
    }

    const segments = path.split('/');
    let length = 1;
    let candidate = segments.slice(-length).join('/');

    // Check uniqueness against other paths
    while (length < segments.length) {
      const collisions = normalizedPaths.filter((other) => {
        if (other === path || other === '.') return false;
        const otherSegments = other.split('/');
        return otherSegments.slice(-length).join('/') === candidate;
      });

      if (collisions.length === 0) {
        break;
      }
      length++;
      candidate = segments.slice(-length).join('/');
    }

    result.set(path, candidate);
  }

  return result;
}

/**
 * Executes a single folding pass at a given file threshold.
 * Runs deepest-first, fresh from initial directory tree.
 */
function runFoldingPass(files: ParsedFile[], threshold: number): Map<string, ParsedFile[]> {
  const dirFiles = new Map<string, ParsedFile[]>();

  for (const file of files) {
    const folder = file.folder || '.';
    if (!dirFiles.has(folder)) {
      dirFiles.set(folder, []);
    }
    dirFiles.get(folder)!.push(file);

    // Ensure all ancestor folders are present in directory tree
    let p = getParent(folder);
    while (p !== null) {
      if (!dirFiles.has(p)) {
        dirFiles.set(p, []);
      }
      p = getParent(p);
    }
  }

  const allDirs = Array.from(dirFiles.keys());
  const maxDepth = Math.max(...allDirs.map(getDepth));

  // Fresh working map for this pass
  const currentDirFiles = new Map<string, ParsedFile[]>();
  for (const [dir, list] of dirFiles.entries()) {
    currentDirFiles.set(dir, [...list]);
  }

  const activeDirs = new Set(allDirs);

  // Deepest first upward to depth 1
  for (let depth = maxDepth; depth >= 1; depth--) {
    const dirsAtDepth = Array.from(activeDirs).filter((d) => getDepth(d) === depth);

    for (const dir of dirsAtDepth) {
      const flist = currentDirFiles.get(dir) || [];
      if (flist.length < threshold) {
        const parent = getParent(dir);
        if (parent !== null) {
          const parentFiles = currentDirFiles.get(parent) || [];
          currentDirFiles.set(parent, [...parentFiles, ...flist]);
          currentDirFiles.delete(dir);
          activeDirs.delete(dir);
        }
      }
    }
  }

  // Handle root '.' if present
  if (activeDirs.has('.')) {
    const rootFiles = currentDirFiles.get('.') || [];
    if (rootFiles.length === 0) {
      activeDirs.delete('.');
      currentDirFiles.delete('.');
    }
  }

  return currentDirFiles;
}

/**
 * Pure function: Folds directory tree into nodes stopping at the lowest threshold
 * that lands under roughly two dozen nodes.
 */
export function foldRepository(
  files: ParsedFile[],
  edges: Edge[],
  maxNodes = 24
): FoldingResult {
  if (files.length === 0) {
    return {
      threshold: 2,
      nodes: [],
      edges: [],
      fileToNodeMap: new Map(),
    };
  }

  let chosenThreshold = 2;
  let finalDirMap = new Map<string, ParsedFile[]>();

  // Start with threshold 2 (fewer than a couple of files merges into parent)
  // Raise threshold until node count lands under maxNodes (roughly two dozen)
  for (let t = 2; t <= 100; t++) {
    const dirMap = runFoldingPass(files, t);
    const nodeCount = dirMap.size;

    chosenThreshold = t;
    finalDirMap = dirMap;

    if (nodeCount <= maxNodes) {
      break;
    }
  }

  // Map each file id to its host node id (directory path)
  const fileToNodeMap = new Map<string, string>();
  for (const [dirPath, dirFileList] of finalDirMap.entries()) {
    for (const f of dirFileList) {
      fileToNodeMap.set(f.id, dirPath);
    }
  }

  // Calculate fan-in and fan-out between nodes
  const nodeFanIn = new Map<string, number>();
  const nodeFanOut = new Map<string, number>();
  const derivedEdges: DerivedGraphEdge[] = [];

  for (const edge of edges) {
    const sourceNodeId = fileToNodeMap.get(edge.source);
    const targetNodeId = fileToNodeMap.get(edge.target);

    if (!sourceNodeId || !targetNodeId) continue;

    derivedEdges.push({
      id: `${edge.source}->${edge.target}`,
      sourceNodeId,
      targetNodeId,
      sourceFileId: edge.source,
      targetFileId: edge.target,
      kinds: edge.kinds,
    });

    if (sourceNodeId !== targetNodeId) {
      nodeFanOut.set(sourceNodeId, (nodeFanOut.get(sourceNodeId) || 0) + 1);
      nodeFanIn.set(targetNodeId, (nodeFanIn.get(targetNodeId) || 0) + 1);
    }
  }

  // Shortest unique labels for all active nodes on screen
  const dirPaths = Array.from(finalDirMap.keys()).sort();
  const labelMap = computeShortestUniqueLabels(dirPaths);

  // Calculate max fan-in for height scaling
  const maxFanIn = Math.max(1, ...Array.from(nodeFanIn.values()));

  const nodes: FoldedNode[] = dirPaths.map((dirPath) => {
    const dirFiles = finalDirMap.get(dirPath) || [];
    const label = labelMap.get(dirPath) || dirPath;
    const fanIn = nodeFanIn.get(dirPath) || 0;
    const fanOut = nodeFanOut.get(dirPath) || 0;

    // Spec: A node's height carries how many things depend on it.
    // Width comes from the label, so a long name doesn't read as an important file.
    const height = Math.round(42 + (fanIn / maxFanIn) * 58); // 42px to 100px
    const width = Math.max(130, Math.round(label.length * 8 + 36));

    return {
      id: dirPath,
      path: dirPath,
      label,
      files: dirFiles.sort((a, b) => a.path.localeCompare(b.path)),
      fanIn,
      fanOut,
      width,
      height,
    };
  });

  return {
    threshold: chosenThreshold,
    nodes,
    edges: derivedEdges,
    fileToNodeMap,
  };
}
