import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useCallback } from 'react';

export const useSwitchTab = (): { handleSwitchTab: (tabId: string) => void } => {
  const getTabs = useTabStore((state) => state.getTabs);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const confirmModal = useConfirmModalStore();

  const handleSwitchTab = useCallback(
    (tabId: string): void => {
      const findTab = getTabs().find((t: TabType) => t.id === tabId);
      const selectedTabId = useTabStore.getState().selectedTabId;

      if (!findTab || findTab.id === selectedTabId) return;

      updateSelectedTab(findTab);
    },
    [getTabs, updateSelectedTab]
  );

  return { handleSwitchTab };
};
