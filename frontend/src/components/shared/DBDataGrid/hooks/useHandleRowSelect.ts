import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback } from 'react';

export const useHandleRowSelect = (hotTableRef: RefObject<HotTableRef | null>) => {
  const { setSelectedRows } = useDataStore();

  return useCallback(
    (rowStart: number, _colStart: number, rowEnd: number, _colEnd: number) => {
      const hotInstance = hotTableRef?.current?.hotInstance;
      if (!hotInstance) return;

      const selectedRows = [];
      for (let i = Math.min(rowStart, rowEnd); i <= Math.max(rowStart, rowEnd); i++) {
        const rowData = hotInstance.getSourceDataAtRow(i);
        selectedRows.push({ index: i, data: rowData });
      }

      setSelectedRows(selectedRows);
    },
    [hotTableRef.current]
  );
};
