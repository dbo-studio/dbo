import api from '@/api';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import { useSelectedTab } from '@/hooks/useSelectedTab';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export const useObjectTabs = () => {
  const selectedTab = useSelectedTab();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTabIndex, setSelectedTabIndex] = useState(Number.parseInt(searchParams.get('objectTabId') ?? '0'));
  const currentConnection = useCurrentConnection();

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
