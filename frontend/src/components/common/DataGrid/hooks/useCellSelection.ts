import { useDataStore } from '@/store/dataStore/data.store';
import type { SelectedRow } from '@/store/dataStore/types';
import type { RowType } from '@/types';
import { useCallback, useRef } from 'react';
import type { CellSelectionReturn } from '../types';

export const useCellSelection = (
  row: RowType,
  rowIndex: number,
  columnId: string,
  setSelectedRows: (rows: SelectedRow[]) => void
): CellSelectionReturn => {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateEditingCell = useDataStore((state) => state.updateEditingCell);

  const handleSelect = useCallback(
    (e: React.MouseEvent): void => {
      setSelectedRows([
        {
          index: rowIndex,
          selectedColumn: columnId,
          row
        }
      ]);
    },
    [setSelectedRows, rowIndex, columnId, row]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent): void => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;

        updateEditingCell({ rowIndex, columnId });
        handleSelect(e);
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          handleSelect(e);
          clickTimeoutRef.current = null;
        }, 250);
      }
    },
    [handleSelect, rowIndex, columnId, updateEditingCell]
  );

  return {
    handleClick
  };
};
