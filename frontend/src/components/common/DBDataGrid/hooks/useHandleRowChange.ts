import { handelRowChangeLog } from '@/core/utils';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { ChangeSource } from 'handsontable/common';
import { useCallback } from 'react';

export const useHandleRowChange = (): ((changes: any[] | null, source: ChangeSource) => void) => {
  const { getRow, updateEditedRows, getEditedRows } = useDataStore();
  const selectedTab = useSelectedTab();

  return useCallback((changes: any[] | null, source: ChangeSource) => {
    if (!changes || changes.length === 0 || source !== 'edit' || !selectedTab) return;

    for (const [index, prop, oldValue, newValue] of changes) {
      if (oldValue === null && newValue === null) continue;
      if (oldValue !== null && oldValue.toString() === newValue.toString()) continue;
      const row = getRow(selectedTab, index);
      const newRow = { ...row };
      newRow[prop] = oldValue;
      const editedRows = handelRowChangeLog(getEditedRows(selectedTab), newRow, prop, oldValue, newValue);
      updateEditedRows(selectedTab, editedRows);
    }
  }, []);
};
