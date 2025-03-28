import api from '@/api';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useObjectTabs = () => {
  const { getSelectedTab } = useTabStore();
  const selectedTab = useMemo(() => getSelectedTab(), [getSelectedTab()]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTabIndex, setSelectedTabIndex] = useState(Number.parseInt(searchParams.get('objectTabId') ?? '0'));
  const { currentConnection } = useConnectionStore();

  const { data: tabs } = useQuery({
    queryKey: ['objectTabs', selectedTab?.id, currentConnection?.id, selectedTab?.options?.action],
    queryFn: () =>
      api.tree.getTabs({
        nodeId: selectedTab?.nodeId ?? '',
        action: selectedTab?.options?.action,
        connectionId: currentConnection?.id || 0
      }),
    enabled: !!(selectedTab?.id && currentConnection?.id && selectedTab?.options?.action)
  });

  const currentTabId = tabs?.[selectedTabIndex]?.id;

  const handleTabChange = (index: number) => {
    setSelectedTabIndex(index);
    searchParams.set('objectTabId', index.toString());
    setSearchParams(searchParams);
  };

  useEffect(() => {
    if (selectedTab) {
      setSelectedTabIndex(Number.parseInt(searchParams.get('objectTabId') ?? '0'));
    }
  }, [selectedTab]);

  return {
    tabs,
    selectedTabIndex,
    currentTabId,
    handleTabChange
  };
};
