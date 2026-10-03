import type { FileClassification, FrameworkAdapter } from './types';

/**
 * Fallback framework adapter with zero framework assumptions.
 * Used when no specific framework is active or requested.
 */
export class FallbackAdapter implements FrameworkAdapter {
  readonly name = 'fallback';

  classifyFile(): FileClassification {
    return {
      role: 'module',
      isEntryPoint: false,
    };
  }
}
