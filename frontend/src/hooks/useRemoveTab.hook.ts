import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';

export function useRemoveTab(): [(tabId: string) => TabType | null | undefined] {
  const { removeTab, getTabs, updateSelectedTab } = useTabStore();

  const remove = (tabId: string): TabType | null | undefined => {
    if (getTabs().length === 1) {
      updateSelectedTab(undefined);
    }

    // No need to clear data from Zustand store anymore, as we're using IndexedDB directly

    // Clear data from IndexedDB
    indexedDBService.clearTabData(tabId).catch((error: unknown) => {
      console.error('Error clearing IndexedDB data for tab:', tabId, error);
    });

    return removeTab(tabId);
  };

  return [remove];
}
