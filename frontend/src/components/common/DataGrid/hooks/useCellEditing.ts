import { handleRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import { useCallback, useEffect, useRef } from 'react';
import type { CellEditingReturn } from '../types';

export const useCellEditing = (row: any, columnId: string, cellValue: string, editedRows: any): CellEditingReturn => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const updateEditingCell = useDataStore((state) => state.updateEditingCell);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const toggleReRender = useDataStore((state) => state.toggleReRender);

  const handleRowChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement>): void => {
      const newValue = e.target.value;
      if (newValue !== cellValue) {
        const newRow = {
          ...row,
          [columnId]: newValue
        };

        updateRow(newRow);
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        // updateTimeoutRef.current = setTimeout(() => {
        const newEditedRows = handleRowChangeLog(editedRows, row, columnId, row[columnId], newValue);
        Promise.all([updateEditedRows(newEditedRows), updateRow(newRow)]).catch(console.error);
        // }, 100);
        toggleReRender();
      }
      updateEditingCell(null);
    },
    [row, columnId, cellValue, editedRows, updateEditedRows, updateRow, updateEditingCell]
  );

  useEffect((): (() => void) => {
    return (): void => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    inputRef,
    handleRowChange
  };
};
