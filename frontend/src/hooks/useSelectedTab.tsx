import { useTabStore } from '@/store/tabStore/tab.store';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCurrentConnection } from './useCurrentConnection';

export const useSelectedTab = () => {
  const [searchParams, _] = useSearchParams();
  const currentConnection = useCurrentConnection();
  const { tabs } = useTabStore();

  const tabId = searchParams.get('tabId');

  return useMemo(() => {
    if (!currentConnection) {
      return undefined;
    }

    return tabs?.[currentConnection.id]?.find((t) => t.id === tabId);
  }, [tabs, tabId, currentConnection]);
};
