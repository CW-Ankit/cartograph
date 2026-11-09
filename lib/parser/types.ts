/**
 * Core type definitions for Cartograph parser contract.
 * Everything built downstream reads this output shape.
 */

export type ImportKind = 'import' | 'reexport' | 'dynamic' | 'require';

export interface ParsedFile {
  /** Relative POSIX path from repository root, e.g. "lib/parser/types.ts" */
  id: string;
  /** Relative POSIX path from repository root */
  path: string;
  /** Relative directory folder path, e.g. "lib/parser" or "." */
  folder: string;
  /** File name with extension, e.g. "types.ts" */
  name: string;
  /** File extension including dot, e.g. ".ts" */
  extension: string;
  /** Total line count in file */
  lines: number;
  /** SHA-256 hash of file contents */
  hash: string;
  /** Architectural or framework role assigned by adapter (defaults to "module") */
  role: string;
  /** Number of unique repository files that import this file */
  fanIn: number;
  /** Number of unique repository files that this file imports */
  fanOut: number;
}

export interface Edge {
  /** Unique edge identifier: `${source}->${target}` */
  id: string;
  /** Source file id (relative POSIX path) */
  source: string;
  /** Target file id (relative POSIX path) */
  target: string;
  /** Kinds of connection between source and target */
  kinds: ImportKind[];
}

export interface SkippedFile {
  /** Relative POSIX path from repository root */
  path: string;
  /** Specific reason why this file was not parsed into a node */
  reason: string;
}

export interface ImportFailure {
  /** Relative POSIX path of the file containing the import */
  sourceFile: string;
  /** Raw specifier string from code, e.g. "./missing" or "@/components/card" */
  specifier: string;
  /** Kind of import statement */
  kind: ImportKind;
  /** Specific reason why resolution failed */
  reason: string;
  /** 1-based line number where the import was declared */
  line: number;
}

export interface CoverageReport {
  /** Total number of import statements examined across all parsed files */
  totalImports: number;
  /** Number of imports successfully resolved to internal repository files */
  resolved: number;
  /** Number of imports pointing to external packages or built-in modules */
  external: number;
  /** Number of imports deliberately excluded */
  excluded: number;
  /** Number of imports that failed to resolve */
  failed: number;
  /** List of all unresolved import failures with source, specifier, line and reason */
  failures: ImportFailure[];
  /** Distinct external package names referenced */
  externalPackages: string[];
}

export interface ParseStats {
  /** Total files encountered during repository walk (filesParsed + filesSkipped) */
  filesFound: number;
  /** Total files successfully parsed into graph nodes */
  filesParsed: number;
  /** Total files skipped with recorded reasons */
  filesSkipped: number;
  /** Total number of distinct folders containing parsed files */
  distinctFolders: number;
  /** Total re-export statements found */
  reexportsFound: number;
  /** Total re-export statements resolved */
  reexportsResolved: number;
  /** Execution duration in milliseconds */
  durationMs: number;
}

export interface ParseResult {
  /** Repository root path that was analyzed */
  rootPath: string;
  /** List of parsed file nodes */
  files: ParsedFile[];
  /** List of deduplicated dependency edges */
  edges: Edge[];
  /** Files skipped during walking with exact reasons */
  skippedFiles: SkippedFile[];
  /** Detailed import coverage analysis */
  coverage: CoverageReport;
  /** High-level summary metrics */
  stats: ParseStats;
}

export interface FileClassification {
  role: string;
  isEntryPoint?: boolean;
}

export interface FrameworkAdapter {
  readonly name: string;
  /**
   * Determine the role or label of a file in the project.
   */
  classifyFile(file: { path: string; folder: string; extension: string }): FileClassification;
}

export interface ParserOptions {
  /** Framework adapter instance. Defaults to FallbackAdapter */
  adapter?: FrameworkAdapter;
  /** Additional directories to ignore during walking (e.g. ['test-fixtures']) */
  ignoreDirectories?: string[];
  /** Custom import specifiers to deliberately exclude */
  excludeSpecifiers?: string[];
}
