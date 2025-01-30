import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { SelectedRow } from '@/store/dataStore/types';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback } from 'react';

export const useHandleRowSelect = (hotTableRef: RefObject<HotTableRef | null>) => {
  const { setSelectedRows } = useDataStore();

  return useCallback(
    (rowStart: number, _colStart: number, rowEnd: number, _colEnd: number) => {
      const hotInstance = hotTableRef?.current?.hotInstance;
      if (!hotInstance) return;

      const selectedRows: SelectedRow[] = [];
      for (let i = Math.min(rowStart, rowEnd); i <= Math.max(rowStart, rowEnd); i++) {
        const rowData = hotInstance.getSourceDataAtRow(i);
        const cellData = hotInstance.getDataAtCell(i, _colStart);
        const columnName = hotInstance.getColHeader(_colStart);
        selectedRows.push({ index: i, data: rowData, selectedCell: cellData, selectedColumn: columnName?.toString() });
      }

      setSelectedRows(selectedRows);
    },
    [hotTableRef.current]
  );
};
