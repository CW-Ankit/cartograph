// Scaffolding typed data file for Phase 4 canvas
import type { ParseResult } from '@/lib/parser/types';
import rawData from './sample-data.json';

export const sampleParseResult: ParseResult = rawData as unknown as ParseResult;
