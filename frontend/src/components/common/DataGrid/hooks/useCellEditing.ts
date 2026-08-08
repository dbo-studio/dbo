import { handleRowChangeLog, valuesSemanticallyEqual } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { useCallback, useRef } from 'react';
import type { CellEditingReturn } from '../types';

export const useCellEditing = (row: RowType, columnId: string): CellEditingReturn => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const columns = useDataStore((state) => state.columns ?? []);

  const commitValue = useCallback(
    (newValue: unknown): void => {
      const store = useDataStore.getState();
      const editedRows = store.editedRows;
      const activeColumns = store.columns ?? columns;
      const foundRow = store.rows?.find((r) => r.dbo_index === row.dbo_index);
      const previousValue = row[columnId];

      if (Object.is(newValue, previousValue)) {
        return;
      }

      // Avoid false dirty state when input strings match numeric/boolean cell values.
      if (valuesSemanticallyEqual(previousValue, newValue)) {
        return;
      }

      const newRow = {
        ...(foundRow ?? row),
        [columnId]: newValue
      };

      const newEditedRows = handleRowChangeLog(editedRows, row, columnId, previousValue, newValue, activeColumns);

      updateRow(newRow)
        .then(() => {
          updateEditedRows(newEditedRows).catch(console.error);
        })
        .catch(console.error);
    },
    [row, columnId, columns, updateEditedRows, updateRow]
  );

  const handleRowChange = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>): void => {
      commitValue(e.target.value);
    },
    [commitValue]
  );

  return {
    inputRef,
    handleRowChange,
    commitValue
  };
};
