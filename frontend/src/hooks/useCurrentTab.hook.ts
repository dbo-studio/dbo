import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import useNavigate from './useNavigate.hook';

export const useCurrentTab = (): TabType | undefined => {
  const [searchParams, _] = useSearchParams();
  const { tabs, selectedTab, updateSelectedTab } = useTabStore();
  const navigate = useNavigate();

  return useMemo(() => {
    const params = Object.fromEntries([...searchParams]);

    if (!params.tabId || params.tabId === '') {
      return undefined;
    }

    const tab = tabs.find((tab) => tab.id === params.tabId);
    if (!tab) {
      // navigate({ route: '/' });
      updateSelectedTab(undefined);
      return undefined;
    }

    if (selectedTab?.id !== tab.id) {
      updateSelectedTab(tab);
    }

    return tab;
  }, [searchParams, tabs]);
};
