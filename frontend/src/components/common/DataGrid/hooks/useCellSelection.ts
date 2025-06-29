import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { useCallback, useRef } from 'react';
import type { CellSelectionReturn } from '../types';

export const useCellSelection = (
  row: RowType,
  rowIndex: number,
  columnId: string,
  editable: boolean
): CellSelectionReturn => {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateEditingCell = useDataStore((state) => state.updateEditingCell);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

  const handleSelect = useCallback(
    (_: React.MouseEvent): void => {
      updateSelectedRows(
        [
          {
            index: rowIndex,
            selectedColumn: columnId,
            row
          }
        ],
        true
      );
    },
    [updateSelectedRows, rowIndex, columnId, row]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent): void => {
      if (clickTimeoutRef.current && editable) {
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
