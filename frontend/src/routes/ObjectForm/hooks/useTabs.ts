import api from '@/api';
import type { TabResponseType } from '@/api/tree/types';
import { useCurrentConnection } from '@/hooks';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useTabStore } from '@/store/tabStore/tab.store';
import { ObjectTabType } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

export const useTabs = (): {
  tabs: TabResponseType;
  selectedTabId: string | null;
  isLoading: boolean;
  handleTabChange: (objectTabId: string) => void;
} => {
  const selectedTab = useSelectedTab<ObjectTabType>();
  const currentConnection = useCurrentConnection();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const [userSelectedTabId, setUserSelectedTabId] = useState<string | null>(null);
  const [prevObjectTabId, setPrevObjectTabId] = useState(selectedTab?.id);

  if (selectedTab?.id !== prevObjectTabId) {
    setPrevObjectTabId(selectedTab?.id);
    setUserSelectedTabId(null);
  }

  const { data: tabs, isLoading } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.action, selectedTab?.nodeId],
    queryFn: (): Promise<TabResponseType> =>
      api.tree.getTabs({
        nodeId: selectedTab?.nodeId ?? '',
        action: selectedTab?.action ?? '',
        connectionId: currentConnection?.id ?? 0
      }),
    enabled: !!(selectedTab?.id && currentConnection?.id && selectedTab?.action)
  });

  const selectedTabId = useMemo(() => {
    if (!tabs?.length) {
      return userSelectedTabId ?? selectedTab?.objectTabId ?? null;
    }

    if (userSelectedTabId && tabs.some((tab) => tab.id === userSelectedTabId)) {
      return userSelectedTabId;
    }

    const savedTabId = selectedTab?.objectTabId;
    if (savedTabId && tabs.some((tab) => tab.id === savedTabId)) {
      return savedTabId;
    }

    return tabs[0]?.id ?? null;
  }, [tabs, userSelectedTabId, selectedTab?.objectTabId]);

  useEffect(() => {
    if (!selectedTab || !tabs?.length) return;

    const savedTabId = selectedTab.objectTabId;
    if (savedTabId && tabs.some((tab) => tab.id === savedTabId)) {
      return;
    }

    const firstTabId = tabs[0]?.id;
    if (firstTabId && selectedTab.objectTabId !== firstTabId) {
      updateSelectedTab({
        ...selectedTab,
        objectTabId: firstTabId
      });
    }
  }, [selectedTab, tabs, updateSelectedTab]);

  const handleTabChange = (objectTabId: string): void => {
    if (!selectedTab) return;

    setUserSelectedTabId(objectTabId);
    updateSelectedTab({
      ...selectedTab,
      objectTabId
    });
  };

  return {
    tabs: tabs ?? [],
    selectedTabId,
    isLoading,
    handleTabChange
  };
};
