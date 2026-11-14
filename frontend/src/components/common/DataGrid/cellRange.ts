/** Excel-style rectangular selection; row = index in the grid rows, col = index in the grid's table columns. */
export type CellRange = {
  anchorRow: number;
  anchorCol: number;
  focusRow: number;
  focusCol: number;
  /** Table column names at selection time, so actions don't depend on the live column order. */
  columnNames: string[];
};

export type NormalizedRange = { r1: number; r2: number; c1: number; c2: number };

export const normalizeRange = (range: CellRange): NormalizedRange => ({
  r1: Math.min(range.anchorRow, range.focusRow),
  r2: Math.max(range.anchorRow, range.focusRow),
  c1: Math.min(range.anchorCol, range.focusCol),
  c2: Math.max(range.anchorCol, range.focusCol)
});

export const isMultiCellRange = (range: CellRange | null): range is CellRange =>
  !!range && (range.anchorRow !== range.focusRow || range.anchorCol !== range.focusCol);

export const isCellInRange = (range: CellRange, row: number, col: number): boolean => {
  const { r1, r2, c1, c2 } = normalizeRange(range);
  return row >= r1 && row <= r2 && col >= c1 && col <= c2;
};

export const rangeColumnNames = (range: CellRange): string[] => {
  const { c1, c2 } = normalizeRange(range);
  return range.columnNames.slice(c1, c2 + 1).filter((name) => name !== 'select');
};
