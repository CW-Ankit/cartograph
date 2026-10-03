import * as path from 'node:path';
import * as fs from 'node:fs';
import type {
  ParseResult,
  ParserOptions,
  ParseStats,
} from './types';
import { FallbackAdapter } from './adapter';
import { walkRepository, toPosixPath } from './walk';
import { ModuleResolver } from './resolve';
import { parseFiles } from './parse';
import { calculateGraphMetrics } from './graph';

export * from './types';
export * from './adapter';
export * from './walk';
export * from './resolve';
export * from './parse';
export * from './graph';

/**
 * Main entry point: Parses a repository on disk into files, edges, and coverage metrics.
 */
export async function parseRepository(
  directoryPath: string,
  options?: ParserOptions
): Promise<ParseResult> {
  const startTime = performance.now();
  const rootPath = path.resolve(directoryPath);

  if (!fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
    throw new Error(`Target path does not exist or is not a directory: ${directoryPath}`);
  }

  // 1. Walk directory tree
  const walkResult = walkRepository(rootPath, {
    ignoreDirectories: options?.ignoreDirectories,
  });

  // 2. Initialize framework adapter (defaults to FallbackAdapter)
  const adapter = options?.adapter ?? new FallbackAdapter();

  // 3. Initialize module resolver
  const resolver = new ModuleResolver(rootPath, walkResult.allRepoFilePaths, {
    excludeSpecifiers: options?.excludeSpecifiers,
  });

  // 4. Parse files and extract imports
  const parsed = parseFiles(walkResult.candidates, resolver, adapter);

  // 5. Calculate graph metrics (deduplication, fanIn, fanOut)
  const graph = calculateGraphMetrics(parsed.files, parsed.rawEdges);

  // 6. Calculate distinct folders
  const distinctFoldersSet = new Set<string>();
  for (const file of graph.files) {
    distinctFoldersSet.add(file.folder);
  }

  const durationMs = Math.round(performance.now() - startTime);

  const stats: ParseStats = {
    filesFound: graph.files.length + walkResult.skipped.length,
    filesParsed: graph.files.length,
    filesSkipped: walkResult.skipped.length,
    distinctFolders: distinctFoldersSet.size,
    reexportsFound: parsed.reexportsFound,
    reexportsResolved: parsed.reexportsResolved,
    durationMs,
  };

  return {
    rootPath: toPosixPath(rootPath),
    files: graph.files,
    edges: graph.edges,
    skippedFiles: walkResult.skipped,
    coverage: parsed.coverage,
    stats,
  };
}

/**
 * Validates that an unknown object adheres to the ParseResult contract.
 */
export function validateParseResult(data: unknown): ParseResult {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid ParseResult: expected an object');
  }

  const candidate = data as Record<string, unknown>;

  if (typeof candidate.rootPath !== 'string') {
    throw new Error('Invalid ParseResult: rootPath must be a string');
  }

  if (!Array.isArray(candidate.files)) {
    throw new Error('Invalid ParseResult: files must be an array');
  }

  for (const [idx, f] of candidate.files.entries()) {
    if (
      typeof f !== 'object' ||
      f === null ||
      typeof f.id !== 'string' ||
      typeof f.path !== 'string' ||
      typeof f.folder !== 'string' ||
      typeof f.name !== 'string' ||
      typeof f.extension !== 'string' ||
      typeof f.lines !== 'number' ||
      typeof f.hash !== 'string' ||
      typeof f.role !== 'string' ||
      typeof f.fanIn !== 'number' ||
      typeof f.fanOut !== 'number'
    ) {
      throw new Error(`Invalid ParseResult: file at index ${idx} does not match ParsedFile structure`);
    }
  }

  if (!Array.isArray(candidate.edges)) {
    throw new Error('Invalid ParseResult: edges must be an array');
  }

  for (const [idx, e] of candidate.edges.entries()) {
    if (
      typeof e !== 'object' ||
      e === null ||
      typeof e.id !== 'string' ||
      typeof e.source !== 'string' ||
      typeof e.target !== 'string' ||
      !Array.isArray(e.kinds)
    ) {
      throw new Error(`Invalid ParseResult: edge at index ${idx} does not match Edge structure`);
    }
  }

  if (!Array.isArray(candidate.skippedFiles)) {
    throw new Error('Invalid ParseResult: skippedFiles must be an array');
  }

  for (const [idx, s] of candidate.skippedFiles.entries()) {
    if (
      typeof s !== 'object' ||
      s === null ||
      typeof s.path !== 'string' ||
      typeof s.reason !== 'string'
    ) {
      throw new Error(`Invalid ParseResult: skippedFile at index ${idx} does not match SkippedFile structure`);
    }
  }

  if (typeof candidate.coverage !== 'object' || candidate.coverage === null) {
    throw new Error('Invalid ParseResult: coverage must be an object');
  }

  const cov = candidate.coverage as Record<string, unknown>;
  if (
    typeof cov.totalImports !== 'number' ||
    typeof cov.resolved !== 'number' ||
    typeof cov.external !== 'number' ||
    typeof cov.excluded !== 'number' ||
    typeof cov.failed !== 'number' ||
    !Array.isArray(cov.failures) ||
    !Array.isArray(cov.externalPackages)
  ) {
    throw new Error('Invalid ParseResult: coverage does not match CoverageReport structure');
  }

  if (typeof candidate.stats !== 'object' || candidate.stats === null) {
    throw new Error('Invalid ParseResult: stats must be an object');
  }

  const st = candidate.stats as Record<string, unknown>;
  if (
    typeof st.filesFound !== 'number' ||
    typeof st.filesParsed !== 'number' ||
    typeof st.filesSkipped !== 'number' ||
    typeof st.distinctFolders !== 'number' ||
    typeof st.reexportsFound !== 'number' ||
    typeof st.reexportsResolved !== 'number' ||
    typeof st.durationMs !== 'number'
  ) {
    throw new Error('Invalid ParseResult: stats does not match ParseStats structure');
  }

  if (st.filesFound !== st.filesParsed + st.filesSkipped) {
    throw new Error(
      `Invalid ParseResult: filesFound (${st.filesFound}) does not equal filesParsed (${st.filesParsed}) + filesSkipped (${st.filesSkipped})`
    );
  }

  return data as ParseResult;
}

/**
 * Reads a JSON file on disk and validates that it matches the ParseResult contract.
 */
export function readParseResult(filePath: string): ParseResult {
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  return validateParseResult(json);
}

/**
 * Writes a ParseResult to a JSON file on disk.
 */
export function writeParseResult(filePath: string, result: ParseResult): void {
  const json = JSON.stringify(result, null, 2);
  fs.writeFileSync(filePath, json, 'utf8');
}
