import * as path from 'node:path';
import * as fs from 'node:fs';
import ts from 'typescript';
import { toPosixPath } from './walk';

export type ResolveResult =
  | { status: 'resolved'; targetFile: string }
  | { status: 'external'; packageName: string }
  | { status: 'excluded'; reason?: string }
  | { status: 'failed'; reason: string };

const NODE_BUILTINS = new Set([
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'dgram',
  'diagnostics_channel',
  'dns',
  'domain',
  'events',
  'fs',
  'fs/promises',
  'http',
  'http2',
  'https',
  'inspector',
  'module',
  'net',
  'os',
  'path',
  'path/posix',
  'path/win32',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream',
  'stream/promises',
  'stream/web',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'url',
  'util',
  'util/types',
  'v8',
  'vm',
  'wasi',
  'worker_threads',
  'zlib',
]);

interface PathMapping {
  hasWildcard: boolean;
  prefix: string;
  suffix: string;
  targets: string[];
}

export class ModuleResolver {
  private readonly baseUrl: string;
  private readonly pathMappings: PathMapping[] = [];
  private readonly allRepoFiles: Set<string>;
  private readonly excludedSpecifiers: Set<string>;

  constructor(
    rootPath: string,
    allRepoFiles: Set<string>,
    options?: { excludeSpecifiers?: string[] }
  ) {
    this.allRepoFiles = allRepoFiles;
    this.excludedSpecifiers = new Set(options?.excludeSpecifiers ?? []);

    const resolvedRoot = path.resolve(rootPath);
    let baseUrl = '.';

    // Look for tsconfig.json or jsconfig.json
    const tsconfigPath = path.join(resolvedRoot, 'tsconfig.json');
    const jsconfigPath = path.join(resolvedRoot, 'jsconfig.json');
    const configToRead = fs.existsSync(tsconfigPath)
      ? tsconfigPath
      : fs.existsSync(jsconfigPath)
      ? jsconfigPath
      : null;

    if (configToRead) {
      const readResult = ts.readConfigFile(configToRead, ts.sys.readFile);
      if (!readResult.error && readResult.config) {
        const compilerOptions = readResult.config.compilerOptions || {};
        if (compilerOptions.baseUrl) {
          baseUrl = toPosixPath(compilerOptions.baseUrl);
        }
        if (compilerOptions.paths && typeof compilerOptions.paths === 'object') {
          for (const [pattern, rawTargets] of Object.entries(compilerOptions.paths)) {
            const targets = Array.isArray(rawTargets) ? (rawTargets as string[]) : [];
            const starIndex = pattern.indexOf('*');
            if (starIndex === -1) {
              this.pathMappings.push({
                hasWildcard: false,
                prefix: pattern,
                suffix: '',
                targets,
              });
            } else {
              this.pathMappings.push({
                hasWildcard: true,
                prefix: pattern.slice(0, starIndex),
                suffix: pattern.slice(starIndex + 1),
                targets,
              });
            }
          }
        }
      }
    }

    this.baseUrl = baseUrl;
  }

  /**
   * Resolves an import/export specifier from a source file into a target or external status.
   */
  resolve(specifier: string, sourceRelPath: string): ResolveResult {
    const trimmed = specifier.trim();
    if (!trimmed) {
      return { status: 'failed', reason: 'Empty import specifier' };
    }

    if (this.excludedSpecifiers.has(trimmed)) {
      return { status: 'excluded', reason: `Specifier '${trimmed}' is in exclusion list` };
    }

    // Node built-in module
    if (trimmed.startsWith('node:')) {
      return { status: 'external', packageName: trimmed };
    }
    const cleanSpecifier = trimmed.replace(/^node:/, '');
    if (NODE_BUILTINS.has(cleanSpecifier) || NODE_BUILTINS.has(cleanSpecifier.split('/')[0])) {
      return { status: 'external', packageName: cleanSpecifier };
    }

    // Relative imports
    if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
      const sourceDir = path.posix.dirname(sourceRelPath);
      const combined = path.posix.normalize(path.posix.join(sourceDir, trimmed));

      // Guard against imports escaping repository root
      if (combined.startsWith('../') || combined === '..') {
        return {
          status: 'failed',
          reason: `Import '${trimmed}' escapes repository root`,
        };
      }

      const match = this.matchFileCandidates(combined);
      if (match) {
        return { status: 'resolved', targetFile: match };
      }

      return {
        status: 'failed',
        reason: `File not found: ${trimmed}`,
      };
    }

    // Absolute-like paths from repo root (e.g. "/lib/parser")
    if (trimmed.startsWith('/')) {
      const candidate = path.posix.normalize(trimmed.slice(1));
      const match = this.matchFileCandidates(candidate);
      if (match) {
        return { status: 'resolved', targetFile: match };
      }
      return {
        status: 'failed',
        reason: `File not found from root: ${trimmed}`,
      };
    }

    // Path aliases from tsconfig.json
    for (const mapping of this.pathMappings) {
      if (mapping.hasWildcard) {
        if (
          trimmed.startsWith(mapping.prefix) &&
          trimmed.endsWith(mapping.suffix)
        ) {
          const wildcard = trimmed.slice(
            mapping.prefix.length,
            trimmed.length - mapping.suffix.length
          );

          let candidateAttempted = '';
          for (const target of mapping.targets) {
            const replacedTarget = target.replace('*', wildcard);
            const candidate = path.posix.normalize(
              path.posix.join(this.baseUrl, replacedTarget)
            );
            candidateAttempted = candidate;
            const match = this.matchFileCandidates(candidate);
            if (match) {
              return { status: 'resolved', targetFile: match };
            }
          }

          return {
            status: 'failed',
            reason: `Path alias '${mapping.prefix}*${mapping.suffix}' resolved to '${candidateAttempted}' but file not found`,
          };
        }
      } else {
        if (trimmed === mapping.prefix) {
          let candidateAttempted = '';
          for (const target of mapping.targets) {
            const candidate = path.posix.normalize(
              path.posix.join(this.baseUrl, target)
            );
            candidateAttempted = candidate;
            const match = this.matchFileCandidates(candidate);
            if (match) {
              return { status: 'resolved', targetFile: match };
            }
          }

          return {
            status: 'failed',
            reason: `Path alias '${mapping.prefix}' resolved to '${candidateAttempted}' but file not found`,
          };
        }
      }
    }

    // Reject invalid scoped syntax like '@/...' as a package name
    if (trimmed.startsWith('@/')) {
      return {
        status: 'failed',
        reason: `Unconfigured path alias or invalid module specifier: '${trimmed}'`,
      };
    }

    // Bare specifier pointing to external npm package
    const packageName = this.extractPackageName(trimmed);
    if (packageName) {
      return { status: 'external', packageName };
    }

    return {
      status: 'failed',
      reason: `Cannot resolve import '${trimmed}'`,
    };
  }

  /**
   * Tests all potential file extensions and index variations against known repository files.
   */
  private matchFileCandidates(candidatePath: string): string | null {
    // 1. Exact match
    if (this.allRepoFiles.has(candidatePath)) {
      return candidatePath;
    }

    // 2. ESM .js/.jsx specifier pointing to .ts/.tsx on disk
    if (candidatePath.endsWith('.js')) {
      const tsCandidate = candidatePath.slice(0, -3) + '.ts';
      if (this.allRepoFiles.has(tsCandidate)) return tsCandidate;
      const tsxCandidate = candidatePath.slice(0, -3) + '.tsx';
      if (this.allRepoFiles.has(tsxCandidate)) return tsxCandidate;
    } else if (candidatePath.endsWith('.jsx')) {
      const tsxCandidate = candidatePath.slice(0, -4) + '.tsx';
      if (this.allRepoFiles.has(tsxCandidate)) return tsxCandidate;
    } else if (candidatePath.endsWith('.mjs')) {
      const mtsCandidate = candidatePath.slice(0, -4) + '.mts';
      if (this.allRepoFiles.has(mtsCandidate)) return mtsCandidate;
    } else if (candidatePath.endsWith('.cjs')) {
      const ctsCandidate = candidatePath.slice(0, -4) + '.cts';
      if (this.allRepoFiles.has(ctsCandidate)) return ctsCandidate;
    }

    // 3. Extensionless candidate
    const extensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.mjs',
      '.cjs',
      '.d.ts',
      '.json',
      '.css',
    ];
    for (const ext of extensions) {
      const withExt = candidatePath + ext;
      if (this.allRepoFiles.has(withExt)) {
        return withExt;
      }
    }

    // 4. Directory index candidate
    const indexExtensions = [
      '/index.ts',
      '/index.tsx',
      '/index.js',
      '/index.jsx',
      '/index.mjs',
      '/index.cjs',
      '/index.d.ts',
    ];
    for (const indexExt of indexExtensions) {
      const indexCandidate = candidatePath + indexExt;
      if (this.allRepoFiles.has(indexCandidate)) {
        return indexCandidate;
      }
    }

    return null;
  }

  /**
   * Extracts package name from bare specifier (handles scoped packages e.g. @clerk/nextjs).
   */
  private extractPackageName(specifier: string): string | null {
    if (specifier.startsWith('@')) {
      const parts = specifier.split('/');
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return specifier;
    }

    const firstSlash = specifier.indexOf('/');
    if (firstSlash !== -1) {
      return specifier.slice(0, firstSlash);
    }

    return specifier;
  }
}
