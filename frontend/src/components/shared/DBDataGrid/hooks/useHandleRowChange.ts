import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { ChangeSource } from 'handsontable/common';
import { useCallback } from 'react';

export const useHandleRowChange = () => {
  const { getRows, updateEditedRows, updateRows, getEditedRows } = useDataStore();

  return useCallback((changes: any[] | null, source: ChangeSource) => {
    if (!changes || changes.length === 0 || source !== 'edit') return;

    for (const [row, prop, oldValue, newValue] of changes) {
      if (oldValue === null && newValue === null) continue;
      if (oldValue !== null && oldValue.toString() === newValue.toString()) continue;
      const rows = getRows();
      const editedRows = handelRowChangeLog(getEditedRows(), rows, row, prop, oldValue, newValue);
      updateEditedRows(editedRows);
      updateRows(rows).then();
    }
  }, []);
};
