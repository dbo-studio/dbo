import { handleRowChangeLog, valuesSemanticallyEqual } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store';
import type { RowType } from '@/types';
import { useCallback, useRef } from 'react';
import type { CellEditingReturn } from '../types';
import { coerceFkCellValue } from './fkColumn';

export const useCellEditing = (row: RowType, columnId: string): CellEditingReturn => {
  const inputRef = useRef<HTMLInputElement>(null);
  const updateEditedRows = useDataStore((state) => state.updateEditedRows);
  const updateRow = useDataStore((state) => state.updateRow);
  const columns = useDataStore((state) => state.columns ?? []);

  const commitFields = useCallback(
    (updates: Record<string, unknown>): void => {
      const store = useDataStore.getState();
      const activeColumns = store.columns ?? columns;
      const foundRow = store.rows?.find((r) => r.dbo_index === row.dbo_index);
      const baseRow = foundRow ?? row;

      let nextEdited = store.editedRows;
      const newRow: RowType = { ...baseRow };
      let changed = false;

      for (const [field, rawValue] of Object.entries(updates)) {
        const column = activeColumns.find((item) => item.name === field);
        const nextValue = coerceFkCellValue(rawValue, column?.mappedType);
        const previousValue = baseRow[field];

        if (Object.is(nextValue, previousValue) || valuesSemanticallyEqual(previousValue, nextValue)) {
          continue;
        }

        changed = true;
        newRow[field] = nextValue;
        nextEdited = handleRowChangeLog(nextEdited, baseRow, field, previousValue, nextValue, activeColumns);
      }

      if (!changed) {
        return;
      }

      updateRow(newRow)
        .then(() => {
          updateEditedRows(nextEdited).catch(console.error);
        })
        .catch(console.error);
    },
    [row, columns, updateEditedRows, updateRow]
  );

  const commitValue = useCallback(
    (newValue: unknown): void => {
      commitFields({ [columnId]: newValue });
    },
    [columnId, commitFields]
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
    commitValue,
    commitFields
  };
};
