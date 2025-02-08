import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { SelectedRow } from '@/store/dataStore/types';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useCallback } from 'react';

export const useHandleRowSelect = (hotTableRef: RefObject<HotTableRef | null>) => {
  const { setSelectedRows } = useDataStore();

  return useCallback(
    (rowStart: number, colStart: number, rowEnd: number, colEnd: number) => {
      const hotInstance = hotTableRef.current?.hotInstance;
      if (!hotInstance) return;

      const selectedRows: SelectedRow[] = [];
      const selectedColumnsSet = new Set<string>(); // To store unique column names

      for (let row = Math.min(rowStart, rowEnd); row <= Math.max(rowStart, rowEnd); row++) {
        const rowData = hotInstance.getSourceDataAtRow(row);

        for (let col = Math.min(colStart, colEnd); col <= Math.max(colStart, colEnd); col++) {
          const columnHeader = hotInstance.getColHeader(col);

          const selectedColumn = Array.isArray(columnHeader) ? columnHeader.join(', ') : columnHeader;
          selectedColumnsSet.add(selectedColumn as string);
        }

        selectedRows.push({
          index: row,
          data: rowData,
          selectedColumns: Array.from(selectedColumnsSet)
        });
      }

      setSelectedRows(selectedRows);
    },
    [hotTableRef, setSelectedRows]
  );
};
