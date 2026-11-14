import { useDataStoreApi } from '@/store/dataStore/data.store';
import type { ColumnType } from '@/types';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { isMultiCellRange } from '../cellRange';

type Cell = { row: number; col: number };

const cellFromTarget = (target: EventTarget | null): Cell | null => {
  const td = (target as HTMLElement | null)?.closest?.('td[data-c]') as HTMLElement | null;
  if (!td) return null;
  return { row: Number(td.dataset.r), col: Number(td.dataset.c) };
};

const setTextSelectable = (on: boolean): void => {
  document.body.style.userSelect = on ? '' : 'none';
};

/**
 * Excel-style cell range selection via event delegation on <tbody>: one set of handlers for the
 * whole grid, and the store only changes when the focused cell changes, so dragging stays cheap.
 */
export function useCellRangeSelection(columns: ColumnType[]) {
  const store = useDataStoreApi();
  const columnNames = useMemo(() => columns.map((c) => c.name), [columns]);
  const dragRef = useRef<{ anchor: Cell; last: Cell } | null>(null);
  const stopDragRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopDragRef.current?.(), []);

  const select = useCallback(
    (anchor: Cell, focus: Cell): void => {
      store.getState().setCellRange({
        anchorRow: anchor.row,
        anchorCol: anchor.col,
        focusRow: focus.row,
        focusCol: focus.col,
        columnNames
      });
    },
    [store, columnNames]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent): void => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('input,textarea')) return;
      const cell = cellFromTarget(e.target);
      if (!cell || columnNames[cell.col] === 'select') return;

      const state = store.getState();
      let anchor = cell;
      if (e.shiftKey) {
        const current = state.cellRange;
        const focused = state.selectedRows[state.selectedRows.length - 1];
        const focusedCol = focused ? columnNames.indexOf(focused.selectedColumn) : -1;
        if (current) anchor = { row: current.anchorRow, col: current.anchorCol };
        else if (focused && focusedCol > 0) anchor = { row: focused.index, col: focusedCol };
        select(anchor, cell);
      }
      dragRef.current = { anchor, last: cell };

      setTextSelectable(false);
      const end = (): void => {
        dragRef.current = null;
        setTextSelectable(true);
        window.removeEventListener('mouseup', end);
        window.removeEventListener('blur', end);
        stopDragRef.current = null;
      };
      stopDragRef.current?.();
      stopDragRef.current = end;
      window.addEventListener('mouseup', end);
      window.addEventListener('blur', end);
    },
    [store, columnNames, select]
  );

  const onMouseOver = useCallback(
    (e: React.MouseEvent): void => {
      const d = dragRef.current;
      if (!d) return;
      const cell = cellFromTarget(e.target);
      if (!cell || (cell.row === d.last.row && cell.col === d.last.col)) return;
      d.last = cell;
      select(d.anchor, cell);
    },
    [select]
  );

  // A shift-click that built a range must not also run the cell's own click-to-select.
  const onClickCapture = useCallback(
    (e: React.MouseEvent): void => {
      if (e.shiftKey && isMultiCellRange(store.getState().cellRange)) e.stopPropagation();
    },
    [store]
  );

  return { onMouseDown, onMouseOver, onClickCapture };
}
