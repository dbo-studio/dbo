/** Match each file column to a table column of the same name (case-insensitive); the rest are skipped. */
export const autoMapping = (fileColumns: string[], tableColumns: string[]): Record<string, string> => {
  const byName = new Map(tableColumns.map((c) => [c.toLowerCase(), c]));
  return Object.fromEntries(fileColumns.map((c) => [c, byName.get(c.toLowerCase()) ?? '']));
};

/** 'none' when nothing is mapped, 'duplicate' when two file columns feed one table column. */
export const mappingProblem = (mapping: Record<string, string>): 'none' | 'duplicate' | null => {
  const targets = Object.values(mapping).filter(Boolean);
  if (targets.length === 0) return 'none';
  return new Set(targets).size === targets.length ? null : 'duplicate';
};
