'use no memo';

import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { matchConnectionId } from '@/store/tabStore/connectionId';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useEffect, useMemo } from 'react';

export const useSelectedTab = <T extends TabType>(): T | undefined => {
  const tabs = useTabStore((state) => state.tabs);
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const switchTab = useTabStore((state) => state.switchTab);

  const selectedTab = useMemo((): T | undefined => {
    if (!currentConnectionId) {
      return undefined;
    }

    const connectionTabs = tabs.filter((tab) => matchConnectionId(tab.connectionId, currentConnectionId));
    if (connectionTabs.length === 0) {
      return undefined;
    }

    if (selectedTabId) {
      const activeTab = connectionTabs.find((tab) => tab.id === selectedTabId);
      if (activeTab) {
        return activeTab as T;
      }
    }

    return connectionTabs[0] as T;
  }, [tabs, selectedTabId, currentConnectionId]);

  useEffect(() => {
    if (!selectedTab || selectedTabId === selectedTab.id) {
      return;
    }

    switchTab(selectedTab.id);
  }, [selectedTab, selectedTabId, switchTab]);

  return selectedTab;
};
