import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useSelectedTab = (): TabType | undefined => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabs = useTabStore((state) => state.getTabs()) || [];

  const tabId = useMemo(() => searchParams.get('tabId'), [searchParams]);

  useEffect(() => {
    if ((!tabId || tabId === '') && tabs[0]?.id) {
      searchParams.set('tabId', tabs[0].id);
      setSearchParams(searchParams);
    }
  }, [tabs, searchParams, setSearchParams, tabId]);

  const selectedTab = useMemo(() => {
    if (!tabId || tabId === '') {
      return tabs[0];
    }
    return tabs.find((t) => t.id === tabId);
  }, [tabs, tabId]);

  return selectedTab;
};
