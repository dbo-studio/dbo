'use no memo';

import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { selectPaneTabs, selectTabs, selectVisibleTabs, useTabStore } from '@/store/tabStore/tab.store';
import { resolvePaneSelectedTab } from '@/store/tabStore/tabs';
import type { TabType } from '@/types';
import { useEffect, useMemo } from 'react';
import { usePane } from './usePane';

export const useSelectedTab = <T extends TabType>(): T | undefined => {
  const tabs = useTabStore(selectTabs);
  const selectedTabId = useTabStore((state) => state.selectedTabId);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);
  const selectedByPane = useTabStore((state) => state.selectedByPane);
  const switchTab = useTabStore((state) => state.switchTab);
  const pane = usePane();

  const selectedTab = useMemo((): T | undefined => {
    if (pane !== undefined) {
      return resolvePaneSelectedTab(selectPaneTabs(tabs, currentConnectionId, pane), selectedByPane, pane) as
        T | undefined;
    }

    const visible = selectVisibleTabs(tabs, currentConnectionId);
    if (visible.length === 0) {
      return undefined;
    }

    if (selectedTabId) {
      const activeTab = visible.find((tab) => tab.id === selectedTabId);
      if (activeTab) {
        return activeTab as T;
      }
    }

    return visible[0] as T;
  }, [tabs, selectedTabId, selectedByPane, currentConnectionId, pane]);

  useEffect(() => {
    if (pane !== undefined || !selectedTab || selectedTabId === selectedTab.id) {
      return;
    }

    switchTab(selectedTab.id);
  }, [pane, selectedTab, selectedTabId, switchTab]);

  return selectedTab;
};
