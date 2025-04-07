import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useEffect } from 'react';

export const useHandleDataUpdate = (hotTableRef: RefObject<HotTableRef | null>): void => {
  const { selectedTabId } = useTabStore();
  const selectedTab = useSelectedTab();

  const { getColumns, getRows, runQuery, getEditedRows, getRemovedRows, getUnsavedRows, toggleDataFetching } =
    useDataStore();

  useEffect(() => {
    if (selectedTab?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [selectedTabId]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.render();
  }, [getRemovedRows(), getUnsavedRows(), getEditedRows()]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.updateSettings({
      columns: getColumns(true).map((column) => ({
        data: column.name,
        title: column.name
      })),
      data: getRows()
    });
  }, [toggleDataFetching, selectedTabId]);
};
