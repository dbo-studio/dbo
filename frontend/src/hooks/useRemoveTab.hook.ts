import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';

export function useRemoveTab(): [(tabId: string) => TabType | null | undefined] {
  const removeTab = useTabStore((state) => state.removeTab);
  const getTabs = useTabStore((state) => state.getTabs);
  const updateSelectedTab = useTabStore((state) => state.updateSelectedTab);

  const remove = (tabId: string): TabType | null | undefined => {
    if (getTabs().length === 1) {
      updateSelectedTab(undefined);
    }

    indexedDBService.clearTabData(tabId).catch((error: unknown) => {
      console.error('Error clearing IndexedDB data for tab:', tabId, error);
    });

    return removeTab(tabId);
  };

  return [remove];
}
