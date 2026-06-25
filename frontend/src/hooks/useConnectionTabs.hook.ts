'use no memo';

import { matchConnectionId } from '@/store/tabStore/connectionId';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';

export const useConnectionTabs = (): TabType[] => {
  const tabs = useTabStore((state) => state.tabs);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);

  return useMemo(
    () => tabs.filter((tab) => matchConnectionId(tab.connectionId, currentConnectionId)),
    [tabs, currentConnectionId]
  );
};
