import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';

export const useSelectedTab = (): TabType | undefined => {
  const { selectedTab } = useTabStore();

  return useMemo(() => {
    return selectedTab();
  }, [selectedTab()]);
};
