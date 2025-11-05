import { handleRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { useCallback, useEffect, useRef } from 'react';
import type { CellEditingReturn } from '../types';

export const useCellEditing = (row: RowType, columnId: string, cellValue: string): CellEditingReturn => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);

  const handleRowChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement>): void => {
      const store = useDataStore.getState();
      const editedRows = store.editedRows;
      const foundRow = store.rows?.find((r) => r.dbo_index === row.dbo_index);

      const newValue = e.target.value;
      if (newValue !== cellValue) {
        const newRow = {
          ...(foundRow ?? row),
          [columnId]: newValue
        };

        const newEditedRows = handleRowChangeLog(editedRows, row, columnId, row[columnId], newValue);

        updateRow(newRow).then(() => {
          updateEditedRows(newEditedRows).catch(console.error);
        }).catch(console.error);
      }
    },
    [row, columnId, cellValue, updateEditedRows, updateRow]
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
