import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { SkippedFile } from './types';

export const DEFAULT_IGNORE_DIRECTORIES = [
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  '.cache',
  '.coverage',
];

export const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

export interface RawCandidateFile {
  path: string;
  folder: string;
  name: string;
  extension: string;
  lines: number;
  hash: string;
  content: string;
}

export interface WalkResult {
  candidates: RawCandidateFile[];
  skipped: SkippedFile[];
  allRepoFilePaths: Set<string>;
}

export interface WalkOptions {
  ignoreDirectories?: string[];
}

function determineSkipReason(fileName: string, extension: string): string {
  if (fileName.endsWith('.d.ts')) {
    return 'TypeScript declaration file (.d.ts)';
  }

  const ext = extension.toLowerCase();
  switch (ext) {
    case '.md':
    case '.markdown':
    case '.mdown':
      return 'Documentation file (.md)';
    case '.json':
      return 'JSON configuration or data file (.json)';
    case '.jsonc':
    case '.json5':
      return 'JSON configuration file with comments';
    case '.yaml':
    case '.yml':
      return 'YAML configuration file';
    case '.css':
    case '.scss':
    case '.sass':
    case '.less':
      return 'Stylesheet file';
    case '.svg':
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.ico':
    case '.webp':
    case '.bmp':
    case '.tiff':
    case '.avif':
      return 'Image / media asset file';
    case '.sh':
    case '.bash':
    case '.zsh':
    case '.ps1':
    case '.bat':
    case '.cmd':
      return 'Shell script';
    case '.sql':
      return 'SQL database script (.sql)';
    case '.tsbuildinfo':
      return 'TypeScript build cache (.tsbuildinfo)';
    case '.map':
      return 'Source map file (.map)';
    case '.txt':
    case '.log':
      return 'Text / log file';
    case '.html':
    case '.htm':
      return 'Static HTML document';
    case '.toml':
    case '.ini':
      return `Configuration file (${ext})`;
    case '.woff':
    case '.woff2':
    case '.ttf':
    case '.eot':
    case '.otf':
      return 'Font asset file';
    default:
      if (fileName.startsWith('.env')) {
        return 'Environment variable file';
      }
      if (fileName.startsWith('.git') || fileName.includes('ignore')) {
        return 'VCS or tool ignore file';
      }
      if (fileName.includes('lock')) {
        return 'Package manager lockfile';
      }
      if (ext) {
        return `Unsupported file extension (${ext})`;
      }
      return `Non-code file (${fileName})`;
  }
}

/**
 * Normalizes Windows backslashes to POSIX forward slashes.
 */
export function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Computes directory folder path relative to repo root, e.g. "lib/parser" or "."
 */
export function computeFolder(posixRelPath: string): string {
  const dir = path.posix.dirname(posixRelPath);
  return dir === '.' ? '.' : dir;
}

/**
 * Recursively walks a repository directory, identifying parse candidate files
 * and recording skipped files with reasons.
 */
export function walkRepository(rootPath: string, options?: WalkOptions): WalkResult {
  const resolvedRoot = path.resolve(rootPath);
  const ignoreSet = new Set([
    ...DEFAULT_IGNORE_DIRECTORIES,
    ...(options?.ignoreDirectories ?? []),
  ]);

  const candidates: RawCandidateFile[] = [];
  const skipped: SkippedFile[] = [];
  const allRepoFilePaths = new Set<string>();

  function traverse(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    // Sort entries for deterministic walk order across platforms
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoreSet.has(entry.name)) {
          traverse(path.join(currentDir, entry.name));
        }
      } else if (entry.isFile()) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = toPosixPath(path.relative(resolvedRoot, fullPath));
        allRepoFilePaths.add(relPath);

        const ext = path.extname(entry.name).toLowerCase();
        const folder = computeFolder(relPath);

        if (entry.name.endsWith('.d.ts')) {
          skipped.push({
            path: relPath,
            reason: 'TypeScript declaration file (.d.ts)',
          });
        } else if (CODE_EXTENSIONS.has(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.length === 0 ? 0 : content.split(/\r?\n/).length;
            const hash = crypto.createHash('sha256').update(content).digest('hex');

            candidates.push({
              path: relPath,
              folder,
              name: entry.name,
              extension: ext,
              lines,
              hash,
              content,
            });
          } catch (err) {
            skipped.push({
              path: relPath,
              reason: `Failed to read file contents: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        } else {
          skipped.push({
            path: relPath,
            reason: determineSkipReason(entry.name, ext),
          });
        }
      }
    }
  }

  traverse(resolvedRoot);

  return {
    candidates,
    skipped,
    allRepoFilePaths,
  };
}
