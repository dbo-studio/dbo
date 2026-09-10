'use no memo';

import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { selectTabs, selectVisibleTabs, useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useMemo } from 'react';

export const useConnectionTabs = (): TabType[] => {
  const tabs = useTabStore(selectTabs);
  const currentConnectionId = useConnectionStore((state) => state.currentConnectionId);

  return useMemo(() => selectVisibleTabs(tabs, currentConnectionId), [tabs, currentConnectionId]);
};
