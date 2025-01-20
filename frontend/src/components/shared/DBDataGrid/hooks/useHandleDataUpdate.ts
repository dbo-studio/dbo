import { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useEffect } from 'react';

export const useHandleDataUpdate = (hotTableRef: RefObject<HotTableRef | null>) => {
  const { getColumns, getRows, runQuery, getEditedRows, getRemovedRows, getUnsavedRows, toggleDataFetching } =
    useDataStore();
  const { getSelectedTab } = useTabStore();

  useEffect(() => {
    if (getSelectedTab()?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [getSelectedTab()?.id]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.render();
  }, [getRemovedRows(), getUnsavedRows(), getEditedRows()]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.updateData(getRows());
  }, [toggleDataFetching]);
};
