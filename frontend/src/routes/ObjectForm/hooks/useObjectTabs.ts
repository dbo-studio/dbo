import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

export const useObjectTabs = () => {
  const { getSelectedTab, updateSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);
  const [selectedTabIndex, setSelectedTabIndex] = useState(Number.parseInt(selectedTab?.options?.tabId));
  const { currentConnection } = useConnectionStore();

  const { data: tabs } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.options?.action],
    queryFn: () =>
      api.tree.getTabs({
        nodeId: selectedTab?.nodeId ?? '',
        action: selectedTab?.options?.action,
        connectionId: String(currentConnection?.id || '')
      }),
    enabled: !!currentConnection
  });

  const currentTabId = tabs?.[selectedTabIndex]?.id;

  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
    updateSelectedTab({
      ...selectedTab,
      options: {
        ...selectedTab?.options,
        tabId: index
      }
    } as TabType);
  };

  useEffect(() => {
    if (selectedTab) {
      setSelectedTabIndex(Number.parseInt(selectedTab?.options?.tabId));
    }
  }, [selectedTab]);

  return {
    tabs,
    selectedTabIndex,
    currentTabId,
    handleTabChange
  };
};
