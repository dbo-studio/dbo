import { useTabStore } from '@/store/tabStore/tab.store';
import { TabType } from '@/types';
import { useMemo } from 'react';

export const useSelectedTab = <T extends TabType>(): T | undefined => {
  const { selectedTab } = useTabStore();

  return useMemo(() => {
    return selectedTab();
  }, [selectedTab()]);
};
