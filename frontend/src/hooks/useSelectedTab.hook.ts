import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';

export const useSelectedTab = (): TabType | undefined => {
  const selectedTab = useTabStore((state) => state.selectedTab);

  return useMemo(() => {
    return selectedTab();
  }, [selectedTab()]);
};
