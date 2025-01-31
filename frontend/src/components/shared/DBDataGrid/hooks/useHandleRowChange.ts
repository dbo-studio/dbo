import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { ChangeSource } from 'handsontable/common';
import { useCallback } from 'react';

export const useHandleRowChange = () => {
  const { getRow, updateEditedRows, updateRow, getEditedRows } = useDataStore();

  return useCallback((changes: any[] | null, source: ChangeSource) => {
    if (!changes || changes.length === 0 || source !== 'edit') return;

    for (const [index, prop, oldValue, newValue] of changes) {
      if (oldValue === null && newValue === null) continue;
      if (oldValue !== null && oldValue.toString() === newValue.toString()) continue;
      const row = getRow(index);
      const newRow = { ...row };
      newRow[prop] = oldValue;
      const editedRows = handelRowChangeLog(getEditedRows(), newRow, prop, oldValue, newValue);
      updateEditedRows(editedRows);
      updateRow(row);
    }
  }, []);
};
