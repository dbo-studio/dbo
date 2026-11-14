import { handleRowChangeLog } from '@/core/utils';
import type { useDataStoreApi } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { isMultiCellRange, normalizeRange, rangeColumnNames } from './cellRange';
import { serializeCellsForClipboard, serializeRowsForClipboard } from './DataGridContextMenu/clipboard';

type DataState = ReturnType<ReturnType<typeof useDataStoreApi>['getState']>;

/**
 * Write `valueAt(i, j)` into rows r1..r2 x `names` in one pass and one store write
 * (not one write per cell). Non-editable columns are skipped.
 */
export function applyCells(
  state: DataState,
  r1: number,
  r2: number,
  names: string[],
  valueAt: (rowOffset: number, colOffset: number) => unknown
): void {
  const allRows = state.rows;
  const columns = state.columns ?? [];
  if (!allRows) return;

  let nextEditedRows = state.editedRows;
  const changed = new Map<number, RowType>();
  for (let r = r1; r <= r2; r++) {
    const row = allRows[r];
    if (!row) continue;
    const newRow = { ...row };
    names.forEach((name, j) => {
      if (columns.find((c) => c.name === name)?.editable === false) return;
      const value = valueAt(r - r1, j);
      nextEditedRows = handleRowChangeLog(nextEditedRows, row, name, row[name], value, columns);
      newRow[name] = value;
    });
    changed.set(row.dbo_index, newRow);
  }
  if (changed.size === 0) return;

  state.updateRows(allRows.map((r) => changed.get(r.dbo_index) ?? r)).catch((e) => console.error('updateRows', e));
  state.updateEditedRows(nextEditedRows).catch((e) => console.error('updateEditedRows', e));
}

/** The selection as a text block for the clipboard, or null when nothing is selected. */
export function selectionToText(
  state: DataState,
  rows: RowType[],
  tableColumnNames: string[],
  format: 'tsv' | 'csv'
): string | null {
  const { cellRange, selectedRows } = state;
  if (isMultiCellRange(cellRange)) {
    const { r1, r2 } = normalizeRange(cellRange);
    return serializeCellsForClipboard(rows.slice(r1, r2 + 1), rangeColumnNames(cellRange), format);
  }
  if (selectedRows.length === 0) return null;
  const last = selectedRows[selectedRows.length - 1];
  if (selectedRows.length === 1 && last.selectedColumn) {
    return serializeCellsForClipboard([last.row], [last.selectedColumn], format);
  }
  const dataColumns = (state.columns ?? []).filter((c) => tableColumnNames.includes(c.name));
  return serializeRowsForClipboard(
    selectedRows.map((s) => s.row),
    dataColumns,
    format
  );
}

/** Parse clipboard text as TSV. shortcut: no quoted-newline support, upgrade when pasting multi-line cells matters. */
export function parseTsv(text: string): string[][] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines.map((line) => line.split('\t'));
}
