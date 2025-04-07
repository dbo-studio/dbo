import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';

export const useSelectedTab = (): TabType | undefined => {
  const { tabs, selectedTabId, selectedTab } = useTabStore();

  return useMemo(() => {
    return selectedTab();
  }, [tabs, selectedTabId, selectedTab]);
};
