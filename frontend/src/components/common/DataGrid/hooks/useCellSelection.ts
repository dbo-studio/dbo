import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { useCallback, useRef, useState } from 'react';
import type { CellSelectionReturn } from '../types';

export const useCellSelection = (
  row: RowType,
  rowIndex: number,
  columnId: string,
  editable: boolean
): CellSelectionReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

        setIsEditing(true);
        handleSelect(e);
      } else {
        clickTimeoutRef.current = setTimeout(() => {
          handleSelect(e);
          clickTimeoutRef.current = null;
        }, 250);
      }
    },
    [handleSelect, editable]
  );

  return {
    handleClick,
    isEditing,
    setIsEditing
  };
};
