import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import type { HotTableRef } from '@handsontable/react-wrapper';
import { type RefObject, useEffect } from 'react';

export const useHandleDataUpdate = (hotTableRef: RefObject<HotTableRef | null>): void => {
  const selectedTab = useSelectedTab();

  const { getColumns, getRows, runQuery, getEditedRows, getRemovedRows, getUnsavedRows, toggleDataFetching } =
    useDataStore();

  useEffect(() => {
    if (
      selectedTab?.mode === TabMode.Data &&
      (getRows(selectedTab).length === 0 || getColumns(selectedTab).length === 0)
    ) {
      runQuery(selectedTab).then();
    }
  }, [selectedTab?.id]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.render();
  }, [getRemovedRows(selectedTab), getUnsavedRows(selectedTab), getEditedRows(selectedTab)]);

  useEffect(() => {
    hotTableRef?.current?.hotInstance?.updateData(getRows(selectedTab));
  }, [toggleDataFetching]);
};
