import { handelRowChangeLog } from '@/core/utils';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableClass } from '@handsontable/react';
import { type RefObject, useEffect } from 'react';

export const useHandleRowChange = (hotTableRef: RefObject<HotTableClass>) => {
  const { getRows, updateEditedRows, updateRows, getEditedRows } = useDataStore();

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.addHook('afterChange', (changes: any[] | null, _: any) => {
      if (!changes || changes.length === 0) return;
      for (const [row, prop, oldValue, newValue] of changes) {
        if (oldValue === newValue) continue;
        const rows = getRows();
        const editedRows = handelRowChangeLog(getEditedRows(), rows, row, prop, oldValue, newValue);
        updateEditedRows(editedRows);
        updateRows(rows).then();
      }
    });
  }, [hotTableRef.current]);
};
