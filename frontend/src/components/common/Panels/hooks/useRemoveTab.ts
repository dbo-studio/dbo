import { TabMode } from '@/core/enums';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useConfirmModalStore } from '@/store/confirmModal/confirmModal.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useCallback } from 'react';

type useRemoveTabReturn = {
  handleRemoveTab: (tabId: string) => Promise<void>;
};

export const useRemoveTab = (): useRemoveTabReturn => {
  const removeTab = useTabStore((state) => state.removeTab);
  const warning = useConfirmModalStore((state) => state.warning);

  const performRemove = useCallback(
    (tabId: string): TabType | null | undefined => {
      indexedDBService.clearTabData(tabId).catch((error: unknown) => {
        console.error('Error clearing IndexedDB data for tab:', tabId, error);
      });

      return removeTab(tabId);
    },
    [removeTab]
  );

  const needConfirm = async (tab: TabType): Promise<boolean> => {
    if (tab.mode === TabMode.Query && useTabStore.getState().getQuery(tab.id) !== '') {
      return true;
    }

    if (tab.mode === TabMode.ObjectDetail) {
      return true;
    }

    if (tab.mode === TabMode.Data) {
      const [editedRows, unsavedRows] = await Promise.all([
        indexedDBService.getEditedRows(tab.id),
        indexedDBService.getUnsavedRows(tab.id)
      ]);

      if ((editedRows && editedRows.length > 0) || (unsavedRows && unsavedRows.length > 0)) {
        return true;
      }
    }

    return false;
  };

  const handleRemoveTab = useCallback(
    async (tabId: string): Promise<void> => {
      const selectedTab = useTabStore.getState().tabs.find((tab) => tab.id === tabId);
      if (!selectedTab) {
        return;
      }

      if (await needConfirm(selectedTab)) {
        warning(undefined, 'Are you sure you want to close this tab?', () => {
          performRemove(tabId);
        });
      } else {
        performRemove(tabId);
      }
    },
    [performRemove, warning]
  );

  return { handleRemoveTab };
};
