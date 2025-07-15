import { TabMode } from '@/core/enums';
import { useRemoveTab as useRemoveTabHook } from '@/hooks/useRemoveTab.hook.ts';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { TabType } from '@/types';
import { useCallback } from 'react';

export const useRemoveTab = (): { handleRemoveTab: (tabId: string) => void } => {
  const [removeTab] = useRemoveTabHook();
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);
  const confirmModal = useConfirmModalStore();

  const handleRemoveTab = useCallback(
    (tabId: string): void => {
      const selectedTab = useTabStore.getState().tabs.find((tab) => tab.id === tabId);
      if (!selectedTab) return;

      if (needConfirm(selectedTab)) {
        confirmModal.warning(undefined, 'Are you sure you want to close this tab?', () => {
          remove(tabId);
        });
      } else {
        remove(tabId);
      }
    },
    [removeTab, updateSelectedTab]
  );

  const needConfirm = (tab: TabType): boolean => {
    if (tab.mode === TabMode.Query && useTabStore.getState().getQuery(tab.id) !== '') {
      return true;
    }

    if (tab.mode === TabMode.ObjectDetail) {
      return true;
    }

    if (tab.mode === TabMode.Data) {
      const editedRows = useDataStore.getState().editedRows;
      const unsavedRows = useDataStore.getState().unSavedRows;

      if ((editedRows && editedRows.length > 0) || (unsavedRows && unsavedRows.length > 0)) {
        return true;
      }
    }

    return false;
  };

  const remove = (tabId: string): void => {
    const newTab = removeTab(tabId);
    if (newTab === undefined) {
      updateSelectedTab(undefined);
      return;
    }

    if (newTab) {
      updateSelectedTab(newTab);
    }
  };

  return { handleRemoveTab };
};
