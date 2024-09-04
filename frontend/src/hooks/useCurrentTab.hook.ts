import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export const useCurrentTab = (): TabType | undefined => {
  const { tabId } = useParams();
  const { tabs, selectedTab } = useTabStore();

  return useMemo(() => {
    if (!tabId) {
      return selectedTab;
    }

    return tabs.find((tab) => tab.id === tabId);
  }, [tabId, tabs, selectedTab]);
};
