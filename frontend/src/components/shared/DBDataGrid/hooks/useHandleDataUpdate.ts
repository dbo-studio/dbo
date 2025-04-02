import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useEffect } from 'react';

export const useHandleDataUpdate = (hotTableRef: RefObject<HotTableRef | null>) => {
  const selectedTab = useSelectedTab();

  const { getColumns, getRows, runQuery, getEditedRows, getRemovedRows, getUnsavedRows, toggleDataFetching } =
    useDataStore();

  useEffect(() => {
    if (selectedTab?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [selectedTab?.id]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.render();
  }, [getRemovedRows(), getUnsavedRows(), getEditedRows()]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.updateData(getRows());
  }, [toggleDataFetching]);
};
