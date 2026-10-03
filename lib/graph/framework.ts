import type { ParseResult } from '@/lib/parser/types';

/**
 * Pure function: Detects framework from repository metadata and external package dependencies.
 * If no framework convention is matched, returns "None detected".
 */
export function detectFramework(parseResult: ParseResult): string {
  const external = parseResult.coverage?.externalPackages ?? [];

  if (external.some((p) => p === 'next' || p.startsWith('@next/'))) {
    return 'Next.js';
  }
  if (external.some((p) => p === '@nestjs/core' || p.startsWith('@nestjs/'))) {
    return 'NestJS';
  }
  if (external.some((p) => p === 'express')) {
    return 'Express';
  }
  if (external.some((p) => p === 'react' || p === 'react-dom')) {
    return 'React';
  }
  if (external.some((p) => p.startsWith('@trpc/'))) {
    return 'tRPC';
  }

  return 'None detected';
}
