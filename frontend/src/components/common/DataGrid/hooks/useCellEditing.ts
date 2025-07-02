import { handleRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CellEditingReturn } from '../types';

export const useCellEditing = (
  row: any,
  columnId: string,
  cellValue: string | null,
  editedRows: any
): CellEditingReturn => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [localValue, setLocalValue] = useState(cellValue);
  const updateEditingCell = useDataStore((state) => state.updateEditingCell);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);

  const displayValue = useMemo((): string => {
    return String(localValue === null ? 'NULL' : localValue || '');
  }, [localValue]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setLocalValue(e.target.value);
  }, []);

  const handleRowChange = useCallback(
    (_: React.FocusEvent<HTMLInputElement>): void => {
      const newValue = localValue;
      if (newValue !== cellValue) {
        const newRow = {
          ...row,
          [columnId]: newValue
        };

        updateRow(newRow);
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
          const newEditedRows = handleRowChangeLog(editedRows, row, columnId, row[columnId], newValue);
          Promise.all([updateEditedRows(newEditedRows), updateRow(newRow)]).catch(console.error);
        }, 100);
      }
      updateEditingCell(null);
    },
    [row, columnId, cellValue, localValue, editedRows, updateEditedRows, updateRow, updateEditingCell]
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
    handleRowChange,
    localValue: localValue || '',
    handleInputChange,
    displayValue
  };
};
