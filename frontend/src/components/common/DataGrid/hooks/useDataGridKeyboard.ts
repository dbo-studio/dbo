import { useDataStoreApi } from '@/store/dataStore/data.store';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import type { ColumnType, RowType } from '@/types';
import { useCallback, useMemo, type RefObject } from 'react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';
import { isMultiCellRange, normalizeRange, rangeColumnNames } from '../cellRange';
import { applyCells, parseTsv, selectionToText } from '../gridCellActions';
import { useDataGridRowActions } from './useDataGridRowActions';

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 40;

type Cell = { row: number; col: number };

type Props = {
  containerRef: RefObject<HTMLDivElement | null>;
  rows: RowType[];
  tableColumns: ColumnType[];
  columnSizes: Record<string, number>;
  enabled: boolean;
};

/** Excel-style keyboard handling for the grid container (navigation, range select, copy / cut / paste, clear). */
export function useDataGridKeyboard({ containerRef, rows, tableColumns, columnSizes, enabled }: Props) {
  const store = useDataStoreApi();
  const { canEditGrid, isDataFetching } = useDataGridRowActions();
  const currentConnection = useCurrentConnection();
  const [, copy] = useCopyToClipboard();

  const safeModeBlocks =
    (currentConnection?.safeMode === 'safe' || currentConnection?.safeMode === 'safe_write') &&
    !currentConnection?.safeModeUnlocked;
  const canWrite = canEditGrid && !safeModeBlocks && !isDataFetching;

  const names = useMemo(() => tableColumns.map((c) => c.name), [tableColumns]);
  const firstCol = names[0] === 'select' ? 1 : 0;
  const lastCol = names.length - 1;
  const lastRow = rows.length - 1;

  const scrollTo = useCallback(
    ({ row, col }: Cell): void => {
      const el = containerRef.current;
      if (!el) return;
      const rowTop = row * ROW_HEIGHT;
      const rowBottom = HEADER_HEIGHT + (row + 1) * ROW_HEIGHT;
      let top = el.scrollTop;
      if (rowTop < top) top = rowTop;
      else if (rowBottom > top + el.clientHeight) top = rowBottom - el.clientHeight;

      let left = 0;
      for (let i = 0; i < col; i++) left += columnSizes[names[i]] ?? 200;
      const right = left + (columnSizes[names[col]] ?? 200);
      let x = el.scrollLeft;
      if (left < x) x = left;
      else if (right > x + el.clientWidth) x = right - el.clientWidth;
      el.scrollTo({ top, left: x });
    },
    [containerRef, columnSizes, names]
  );

  const getCursor = useCallback((): Cell | null => {
    const { cellRange, selectedRows } = store.getState();
    if (cellRange) return { row: cellRange.focusRow, col: cellRange.focusCol };
    const last = selectedRows[selectedRows.length - 1];
    const col = last ? names.indexOf(last.selectedColumn) : -1;
    return last && col >= 0 ? { row: last.index, col } : null;
  }, [store, names]);

  const moveTo = useCallback(
    (target: Cell, extend: boolean): void => {
      const state = store.getState();
      const cell = {
        row: Math.max(0, Math.min(lastRow, target.row)),
        col: Math.max(firstCol, Math.min(lastCol, target.col))
      };
      if (extend) {
        const anchor = state.cellRange
          ? { row: state.cellRange.anchorRow, col: state.cellRange.anchorCol }
          : (getCursor() ?? cell);
        state.setCellRange({
          anchorRow: anchor.row,
          anchorCol: anchor.col,
          focusRow: cell.row,
          focusCol: cell.col,
          columnNames: names
        });
      } else {
        const row = rows[cell.row];
        if (!row) return;
        state.updateSelectedRows([{ index: cell.row, selectedColumn: names[cell.col], row }], true);
      }
      scrollTo(cell);
    },
    [store, rows, names, lastRow, lastCol, firstCol, getCursor, scrollTo]
  );

  /** Set every selected cell (range, or the single focused cell) to `value`. */
  const clearSelection = useCallback(
    (value: unknown): void => {
      if (!canWrite) return;
      const { cellRange, selectedRows } = store.getState();
      if (isMultiCellRange(cellRange)) {
        const { r1, r2 } = normalizeRange(cellRange);
        applyCells(store.getState(), r1, r2, rangeColumnNames(cellRange), () => value);
        return;
      }
      for (const s of selectedRows.length === 1 ? selectedRows : []) {
        if (s.selectedColumn) applyCells(store.getState(), s.index, s.index, [s.selectedColumn], () => value);
      }
    },
    [store, canWrite]
  );

  const copySelection = useCallback(
    (cut: boolean, withHeaders: boolean): void => {
      const state = store.getState();
      const text = selectionToText(state, rows, names, 'tsv');
      if (text === null) return;
      let out = text;
      if (withHeaders) {
        const headerNames = isMultiCellRange(state.cellRange)
          ? rangeColumnNames(state.cellRange)
          : state.selectedRows.length === 1 && state.selectedRows[0].selectedColumn
            ? [state.selectedRows[0].selectedColumn]
            : names.filter((n) => n !== 'select');
        out = `${headerNames.join('\t')}\n${text}`;
      }
      void copy(out).then(() => toast.success(locales.copied));
      if (cut && canWrite) clearSelection(null);
    },
    [store, rows, names, copy, canWrite, clearSelection]
  );

  const paste = useCallback(async (): Promise<void> => {
    if (!canWrite) return;
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      toast.error(locales.paste_unavailable);
      return;
    }
    if (!text) return;
    const state = store.getState();
    const data = parseTsv(text);
    const cursor = getCursor();
    if (!cursor) return;

    // One copied value fills the whole selected range; a block pastes from the top-left cell.
    if (isMultiCellRange(state.cellRange) && data.length === 1 && data[0].length === 1) {
      const { r1, r2 } = normalizeRange(state.cellRange);
      applyCells(state, r1, r2, rangeColumnNames(state.cellRange), () => data[0][0]);
      return;
    }
    const start = state.cellRange ? normalizeRange(state.cellRange) : null;
    const r1 = start ? start.r1 : cursor.row;
    const c1 = Math.max(firstCol, start ? start.c1 : cursor.col);
    const r2 = Math.min(lastRow, r1 + data.length - 1);
    const targetNames = names.slice(c1, c1 + Math.max(...data.map((r) => r.length)));
    applyCells(state, r1, r2, targetNames, (i, j) => data[i]?.[j] ?? '');
  }, [canWrite, store, getCursor, names, firstCol, lastRow]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      // Portals (dialogs) bubble through React; inputs own their own keys.
      if (!enabled || !e.currentTarget.contains(target) || target.closest('input,textarea,[contenteditable]')) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key;
      const cursor = getCursor();
      const pageRows = Math.max(
        1,
        Math.floor(((containerRef.current?.clientHeight ?? 0) - HEADER_HEIGHT) / ROW_HEIGHT)
      );
      let handled = true;

      if (mod && !e.altKey && key.toLowerCase() === 'c') copySelection(false, e.shiftKey);
      else if (mod && key.toLowerCase() === 'x') copySelection(true, false);
      else if (mod && key.toLowerCase() === 'v') void paste();
      else if (mod && key.toLowerCase() === 'a') {
        store.getState().setCellRange({
          anchorRow: 0,
          anchorCol: firstCol,
          focusRow: lastRow,
          focusCol: lastCol,
          columnNames: names
        });
      } else if (key === 'Escape') store.getState().setCellRange(null);
      else if (key === 'Delete' || key === 'Backspace') clearSelection(mod ? null : '');
      else if (
        key.startsWith('Arrow') ||
        key === 'Tab' ||
        key === 'Enter' ||
        ['Home', 'End', 'PageUp', 'PageDown'].includes(key)
      ) {
        const from = cursor ?? { row: 0, col: firstCol };
        const back = e.shiftKey && (key === 'Tab' || key === 'Enter');
        let next: Cell;
        switch (key) {
          case 'ArrowUp':
            next = { row: mod ? 0 : from.row - 1, col: from.col };
            break;
          case 'ArrowDown':
            next = { row: mod ? lastRow : from.row + 1, col: from.col };
            break;
          case 'ArrowLeft':
            next = { row: from.row, col: mod ? firstCol : from.col - 1 };
            break;
          case 'ArrowRight':
            next = { row: from.row, col: mod ? lastCol : from.col + 1 };
            break;
          case 'Tab':
            next = { row: from.row, col: back ? from.col - 1 : from.col + 1 };
            break;
          case 'Enter':
            next = { row: back ? from.row - 1 : from.row + 1, col: from.col };
            break;
          case 'Home':
            next = { row: mod ? 0 : from.row, col: firstCol };
            break;
          case 'End':
            next = { row: mod ? lastRow : from.row, col: lastCol };
            break;
          case 'PageUp':
            next = { row: from.row - pageRows, col: from.col };
            break;
          default:
            next = { row: from.row + pageRows, col: from.col };
        }
        // Tab / Enter move the active cell only, they never extend a range.
        moveTo(next, e.shiftKey && key !== 'Tab' && key !== 'Enter');
      } else handled = false;

      if (handled) e.preventDefault();
    },
    [
      enabled,
      getCursor,
      containerRef,
      copySelection,
      paste,
      store,
      firstCol,
      lastRow,
      lastCol,
      names,
      clearSelection,
      moveTo
    ]
  );

  return { onKeyDown };
}
