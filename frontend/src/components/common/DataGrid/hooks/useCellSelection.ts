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
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const updateSelectedRows = useDataStore((state) => state.updateSelectedRows);

  const handleSelect = useCallback((): void => {
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
  }, [updateSelectedRows, rowIndex, columnId, row]);

  const handleClick = useCallback((): void => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    const doubleClickThreshold = 200;

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (timeSinceLastClick < doubleClickThreshold && editable) {
      setIsEditing(true);
      handleSelect();
      lastClickTimeRef.current = 0;
    } else {
      handleSelect();
      lastClickTimeRef.current = now;

      if (editable) {
        clickTimeoutRef.current = setTimeout(() => {
          clickTimeoutRef.current = null;
        }, doubleClickThreshold);
      }
    }
  }, [handleSelect, editable]);

  return {
    handleClick,
    isEditing,
    setIsEditing
  };
};
