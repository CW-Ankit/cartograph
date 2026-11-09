import {
  Project,
  SyntaxKind,
  StringLiteral,
  NoSubstitutionTemplateLiteral,
} from 'ts-morph';
import type {
  ParsedFile,
  ImportKind,
  CoverageReport,
  ImportFailure,
  FrameworkAdapter,
} from './types';
import type { RawCandidateFile } from './walk';
import type { ModuleResolver } from './resolve';

export interface RawEdge {
  source: string;
  target: string;
  kind: ImportKind;
}

export interface ParseFilesResult {
  files: ParsedFile[];
  rawEdges: RawEdge[];
  coverage: CoverageReport;
  reexportsFound: number;
  reexportsResolved: number;
}

/**
 * Parses all candidate source files using ts-morph, extracting imports,
 * re-exports, and literal dynamic imports, then resolves them.
 */
export function parseFiles(
  candidates: RawCandidateFile[],
  resolver: ModuleResolver,
  adapter: FrameworkAdapter
): ParseFilesResult {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      allowJs: true,
      jsx: 1, // Preserve
    },
  });

  const parsedFiles: ParsedFile[] = [];
  const rawEdges: RawEdge[] = [];
  const failures: ImportFailure[] = [];
  const externalPackagesSet = new Set<string>();

  let totalImports = 0;
  let resolvedCount = 0;
  let externalCount = 0;
  let excludedCount = 0;
  let failedCount = 0;
  let reexportsFound = 0;
  let reexportsResolved = 0;

  for (const candidate of candidates) {
    const classification = adapter.classifyFile({
      path: candidate.path,
      folder: candidate.folder,
      extension: candidate.extension,
    });

    const parsedFile: ParsedFile = {
      id: candidate.path,
      path: candidate.path,
      folder: candidate.folder,
      name: candidate.name,
      extension: candidate.extension,
      lines: candidate.lines,
      hash: candidate.hash,
      role: classification.role,
      fanIn: 0,
      fanOut: 0,
    };
    parsedFiles.push(parsedFile);

    // Create AST source file in ts-morph
    const sourceFile = project.createSourceFile(candidate.path, candidate.content, {
      overwrite: true,
    });

    interface ExtractedImport {
      specifier: string;
      kind: ImportKind;
      line: number;
    }

    const importsToProcess: ExtractedImport[] = [];

    // 1. Plain imports
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const specifier = importDecl.getModuleSpecifierValue();
      const line = importDecl.getStartLineNumber();
      importsToProcess.push({ specifier, kind: 'import', line });
    }

    // 2. Re-exports (export ... from '...')
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      if (exportDecl.hasModuleSpecifier()) {
        const specifier = exportDecl.getModuleSpecifierValue()!;
        const line = exportDecl.getStartLineNumber();
        reexportsFound++;
        importsToProcess.push({ specifier, kind: 'reexport', line });
      }
    }

    // 3. Dynamic imports and CommonJS require()
    const allCallExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

    // 3a. Dynamic imports: import(...)
    const dynamicCalls = allCallExpressions.filter(
      (c) => c.getExpression().getKind() === SyntaxKind.ImportKeyword
    );

    for (const call of dynamicCalls) {
      const args = call.getArguments();
      const line = call.getStartLineNumber();

      if (args.length === 0) {
        totalImports++;
        failedCount++;
        failures.push({
          sourceFile: candidate.path,
          specifier: '',
          kind: 'dynamic',
          reason: 'Dynamic import missing specifier argument',
          line,
        });
        continue;
      }

      const firstArg = args[0];
      const isLiteral =
        firstArg.getKind() === SyntaxKind.StringLiteral ||
        firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral;

      if (isLiteral) {
        const literalNode = firstArg as StringLiteral | NoSubstitutionTemplateLiteral;
        const specifier = literalNode.getLiteralValue();
        importsToProcess.push({ specifier, kind: 'dynamic', line });
      } else {
        totalImports++;
        failedCount++;
        failures.push({
          sourceFile: candidate.path,
          specifier: firstArg.getText(),
          kind: 'dynamic',
          reason: 'Dynamic import has non-literal specifier (cannot be statically resolved)',
          line,
        });
      }
    }

    // 3b. CommonJS require(...) calls
    const requireCalls = allCallExpressions.filter((c) => {
      const expr = c.getExpression();
      return expr.getKind() === SyntaxKind.Identifier && expr.getText() === 'require';
    });

    for (const call of requireCalls) {
      const args = call.getArguments();
      const line = call.getStartLineNumber();

      if (args.length === 0) {
        totalImports++;
        failedCount++;
        failures.push({
          sourceFile: candidate.path,
          specifier: '',
          kind: 'require',
          reason: 'require() missing specifier argument',
          line,
        });
        continue;
      }

      const firstArg = args[0];
      const isLiteral =
        firstArg.getKind() === SyntaxKind.StringLiteral ||
        firstArg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral;

      if (isLiteral) {
        const literalNode = firstArg as StringLiteral | NoSubstitutionTemplateLiteral;
        const specifier = literalNode.getLiteralValue();
        importsToProcess.push({ specifier, kind: 'require', line });
      } else {
        totalImports++;
        failedCount++;
        failures.push({
          sourceFile: candidate.path,
          specifier: firstArg.getText(),
          kind: 'require',
          reason: 'require() has non-literal specifier (cannot be statically resolved)',
          line,
        });
      }
    }

    // Resolve all extracted imports
    for (const imp of importsToProcess) {
      totalImports++;
      const resolution = resolver.resolve(imp.specifier, candidate.path);

      switch (resolution.status) {
        case 'resolved': {
          resolvedCount++;
          if (imp.kind === 'reexport') {
            reexportsResolved++;
          }
          rawEdges.push({
            source: candidate.path,
            target: resolution.targetFile,
            kind: imp.kind,
          });
          break;
        }
        case 'external': {
          externalCount++;
          externalPackagesSet.add(resolution.packageName);
          break;
        }
        case 'excluded': {
          excludedCount++;
          break;
        }
        case 'failed': {
          failedCount++;
          failures.push({
            sourceFile: candidate.path,
            specifier: imp.specifier,
            kind: imp.kind,
            reason: resolution.reason,
            line: imp.line,
          });
          break;
        }
      }
    }

    // Clean up AST memory immediately
    project.removeSourceFile(sourceFile);
  }

  const coverage: CoverageReport = {
    totalImports,
    resolved: resolvedCount,
    external: externalCount,
    excluded: excludedCount,
    failed: failedCount,
    failures,
    externalPackages: Array.from(externalPackagesSet).sort(),
  };

  return {
    files: parsedFiles,
    rawEdges,
    coverage,
    reexportsFound,
    reexportsResolved,
  };
}
