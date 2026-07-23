import type { TestInfo } from '@playwright/test';

/** Unique suffix safe for parallel workers and SQL identifiers (no hyphens). */
export function uniqueTestSuffix(testInfo: TestInfo): string {
  return `${Date.now()}_w${testInfo.workerIndex}_p${testInfo.parallelIndex}`;
}
