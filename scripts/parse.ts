#!/usr/bin/env node

import * as path from 'node:path';
import { parseRepository, writeParseResult, readParseResult } from '../lib/parser';

interface CliArgs {
  targetDir: string;
  outputPath?: string;
}

function parseArgs(args: string[]): CliArgs {
  let targetDir = '.';
  let outputPath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--output' || arg === '-o') {
      outputPath = args[i + 1];
      i++;
    } else if (!arg.startsWith('-')) {
      targetDir = arg;
    }
  }

  return { targetDir, outputPath };
}

async function main(): Promise<void> {
  const { targetDir, outputPath } = parseArgs(process.argv.slice(2));
  const resolvedDir = path.resolve(targetDir);

  const result = await parseRepository(resolvedDir);

  // Group skipped files by reason for dense reporting
  const skipReasonCounts = new Map<string, number>();
  for (const skipped of result.skippedFiles) {
    skipReasonCounts.set(
      skipped.reason,
      (skipReasonCounts.get(skipped.reason) ?? 0) + 1
    );
  }

  console.log(`\nCartograph Parser Report`);
  console.log(`========================`);
  console.log(`Directory:        ${result.rootPath}`);
  console.log(`Duration:         ${result.stats.durationMs}ms\n`);

  console.log(`Files`);
  console.log(`-----`);
  console.log(`Files found:      ${result.stats.filesFound}`);
  console.log(`Files parsed:     ${result.stats.filesParsed}`);
  console.log(`Files skipped:    ${result.stats.filesSkipped}`);
  console.log(`Distinct folders: ${result.stats.distinctFolders}\n`);

  console.log(`Skip Reasons Breakdown:`);
  const sortedReasons = Array.from(skipReasonCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  for (const [reason, count] of sortedReasons) {
    console.log(`  - ${reason}: ${count}`);
  }
  console.log('');

  console.log(`Graph`);
  console.log(`-----`);
  console.log(`Edges (deduped):  ${result.edges.length}`);
  console.log(`Re-exports found: ${result.stats.reexportsFound}`);
  console.log(`Re-exports ok:    ${result.stats.reexportsResolved}\n`);

  console.log(`Coverage`);
  console.log(`--------`);
  console.log(`Total imports:    ${result.coverage.totalImports}`);
  console.log(`Resolved:         ${result.coverage.resolved}`);
  console.log(`External:         ${result.coverage.external}`);
  console.log(`Excluded:         ${result.coverage.excluded}`);
  console.log(`Failed:           ${result.coverage.failed}\n`);

  if (result.coverage.externalPackages.length > 0) {
    console.log(`External Packages (${result.coverage.externalPackages.length}):`);
    console.log(`  ${result.coverage.externalPackages.join(', ')}\n`);
  }

  if (result.coverage.failures.length > 0) {
    console.log(`Resolution Failures (${result.coverage.failures.length}):`);
    for (const fail of result.coverage.failures) {
      console.log(`  ${fail.sourceFile}:${fail.line} -> "${fail.specifier}" (${fail.kind})`);
      console.log(`    Reason: ${fail.reason}`);
    }
    console.log('');
  }

  if (outputPath) {
    const resolvedOutput = path.resolve(outputPath);
    writeParseResult(resolvedOutput, result);
    // Acceptance check 5: Read back and verify contract holds
    const validated = readParseResult(resolvedOutput);
    console.log(`Contract verified: Output written to ${resolvedOutput} and validated (${validated.files.length} nodes, ${validated.edges.length} edges).`);
  }
}

main().catch((err) => {
  console.error('Parser error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
