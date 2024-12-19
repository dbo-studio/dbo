import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableClass } from '@handsontable/react';
import { type RefObject, useEffect } from 'react';

export const useHandleRowSelect = (hotTableRef: RefObject<HotTableClass>) => {
  const { setSelectedRows } = useDataStore();

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.addHook(
      'afterSelectionEnd',
      (rowStart: number, _colStart: number, rowEnd: number, _colEnd: number) => {
        const hot = hotTableRef?.current?.hotInstance;
        if (!hot) {
          return;
        }
        const selectedRows = [];
        for (let i = Math.min(rowStart, rowEnd); i <= Math.max(rowStart, rowEnd); i++) {
          const rowData = hot.getSourceDataAtRow(i);
          selectedRows.push({ index: i, data: rowData });
        }

        setSelectedRows(selectedRows);
      }
    );
  }, [hotTableRef.current]);
};
