import api from '@/api';
import type { TabResponseType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export const useObjectTabs = (): {
  tabs: TabResponseType;
  selectedTabIndex: string;
  handleTabChange: (index: string) => void;
} => {
  const selectedTab = useSelectedTab();
  const [selectedTabIndex, setSelectedTabIndex] = useState(selectedTab?.options?.tabId);
  const currentConnection = useCurrentConnection();
  const { updateSelectedTab } = useTabStore();

  const { data: tabs } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.options?.action],
    queryFn: (): Promise<TabResponseType> =>
      api.tree.getTabs({
        nodeId: selectedTab?.nodeId ?? '',
        action: selectedTab?.options?.action,
        connectionId: currentConnection?.id || 0
      }),
    enabled: !!(selectedTab?.id && currentConnection?.id && selectedTab?.options?.action)
  });

  const handleTabChange = (index: string): void => {
    if (!selectedTab) return;

    updateSelectedTab({
      ...selectedTab,
      options: {
        ...selectedTab.options,
        tabId: index
      }
    });

    setSelectedTabIndex(index);
  };

  useEffect(() => {
    if (!selectedTab) return;
    if (!tabs || tabs.length === 0) return;

    if (selectedTab?.options?.tabId) {
      setSelectedTabIndex(selectedTab?.options?.tabId);
    } else {
      setSelectedTabIndex(tabs[0]?.id);
      updateSelectedTab({
        ...selectedTab,
        options: {
          ...selectedTab.options,
          tabId: tabs[0]?.id
        }
      });
    }
  }, [selectedTab, tabs]);

  return {
    tabs: tabs ?? [],
    selectedTabIndex,
    handleTabChange
  };
};
