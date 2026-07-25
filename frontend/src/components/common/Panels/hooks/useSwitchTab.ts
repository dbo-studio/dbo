import { useTabStore } from '@/store/tabStore/tab.store';
import { useCallback } from 'react';

export const useSwitchTab = (): { handleSwitchTab: (tabId: string) => void } => {
  const switchTab = useTabStore((state) => state.switchTab);
  const selectedTabId = useTabStore((state) => state.selectedTabId);

  const handleSwitchTab = useCallback(
    (tabId: string): void => {
      if (tabId === selectedTabId) {
        return;
      }

      switchTab(tabId);
    },
    [selectedTabId, switchTab]
  );

  return { handleSwitchTab };
};
