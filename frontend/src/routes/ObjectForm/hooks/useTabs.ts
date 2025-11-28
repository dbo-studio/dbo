import api from '@/api';
import type { TabResponseType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export const useTabs = (): {
  tabs: TabResponseType;
  selectedTabId: string | null;
  isLoading: boolean;
  handleTabChange: (tabId: string) => void;
} => {
  const selectedTab = useSelectedTab();
  const currentConnection = useCurrentConnection();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const [selectedTabId, setSelectedTabId] = useState<string | null>(selectedTab?.options?.tabId ?? null);

  const { data: tabs, isLoading } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.options?.action, selectedTab?.nodeId],
    queryFn: (): Promise<TabResponseType> =>
      api.tree.getTabs({
        nodeId: selectedTab?.nodeId ?? '',
        action: selectedTab?.options?.action ?? '',
        connectionId: currentConnection?.id ?? 0
      }),
    enabled: !!(selectedTab?.id && currentConnection?.id && selectedTab?.options?.action)
  });

  useEffect(() => {
    if (!selectedTab || !tabs || tabs.length === 0) return;

    const savedTabId = selectedTab?.options?.tabId;
    if (savedTabId && tabs.some((tab) => tab.id === savedTabId)) {
      setSelectedTabId(savedTabId);
    } else if (tabs[0]) {
      const firstTabId = tabs[0].id;
      setSelectedTabId(firstTabId);
      updateSelectedTab({
        ...selectedTab,
        options: {
          ...selectedTab.options,
          tabId: firstTabId
        }
      });
    }
  }, [selectedTab, tabs, updateSelectedTab]);

  const handleTabChange = (tabId: string): void => {
    if (!selectedTab) return;

    setSelectedTabId(tabId);
    updateSelectedTab({
      ...selectedTab,
      options: {
        ...selectedTab.options,
        tabId
      }
    });
  };

  return {
    tabs: tabs ?? [],
    selectedTabId,
    isLoading,
    handleTabChange
  };
};
