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
  const lastClickTimeRef = useRef<number>(0);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

  const handleSelect = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (e: React.MouseEvent): void => {
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
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTimeRef.current;

      const doubleClickThreshold = 200;

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (timeSinceLastClick < doubleClickThreshold && editable) {
        setIsEditing(true);
        handleSelect(e);
        lastClickTimeRef.current = 0;
      } else {
        handleSelect(e);
        lastClickTimeRef.current = now;

        if (editable) {
          clickTimeoutRef.current = setTimeout(() => {
            clickTimeoutRef.current = null;
          }, doubleClickThreshold);
        }
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
