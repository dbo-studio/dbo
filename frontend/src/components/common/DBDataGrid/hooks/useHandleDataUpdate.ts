import { TabMode } from '@/core/enums';
import { useSelectedTab } from '@/hooks';
import { useDataStore } from '@/store/dataStore/data.store.ts';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useEffect } from 'react';

export const useHandleDataUpdate = (): void => {
  const { selectedTabId } = useTabStore();
  const selectedTab = useSelectedTab();

  const { getColumns, getRows, runQuery } = useDataStore();

  useEffect(() => {
    if (selectedTab?.mode === TabMode.Data && (getRows().length === 0 || getColumns().length === 0)) {
      runQuery().then();
    }
  }, [selectedTabId]);
};
