import api from '@/api';
import locales from '@/locales';
import { useTransactionStore } from '@/store/transactionStore/transaction.store';
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

      // The server rolls the tab's open transaction back when the tab goes away; free it now.
      const transaction = useTransactionStore.getState();
      const connectionId = transaction.byTab[tabId];
      if (connectionId !== undefined) {
        transaction.clear(tabId);
        void api.query.endTransaction({ connectionId, tab: tabId }, false).catch(() => undefined);
      }

      return removeTab(tabId);
    },
    [removeTab]
  );

  const needConfirm = async (tab: TabType): Promise<boolean> => {
    if (tab.id in useTransactionStore.getState().byTab) {
      return true;
    }

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
        const hasTransaction = selectedTab.id in useTransactionStore.getState().byTab;
        warning(
          undefined,
          hasTransaction ? locales.transaction_close_warning : 'Are you sure you want to close this tab?',
          () => {
            performRemove(tabId);
          }
        );
      } else {
        performRemove(tabId);
      }
    },
    [performRemove, warning]
  );

  return { handleRemoveTab };
};
