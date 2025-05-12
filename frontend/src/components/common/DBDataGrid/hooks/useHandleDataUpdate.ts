import { useTableData } from '@/contexts/TableDataContext';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { ColumnType, RowType } from '@/types';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useEffect } from 'react';

type UseHandleDataUpdateProps = {
  hotTableRef: RefObject<HotTableRef | null>;
  rows: RowType[];
  columns: ColumnType[];
};

export const useHandleDataUpdate = ({ hotTableRef, rows, columns }: UseHandleDataUpdateProps): void => {
  const { isLoading } = useTableData();
  const selectedTabId = useTabStore((state) => state.selectedTabId);

  useEffect(() => {
    if (!selectedTabId || !hotTableRef.current || !hotTableRef?.current?.hotInstance) return;

    hotTableRef.current?.hotInstance?.updateSettings({
      data: rows,
      columns: columns.map((c) => {
        return {
          data: c.name,
          title: c.name
        };
      })
    });
  }, [isLoading, selectedTabId, columns, rows]);
};
