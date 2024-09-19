import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';
import { useCallback } from 'react';

export function useRemoveTab() {
  const { removeTab } = useTabStore();
  const {
    removeColumnsByTabId,
    removeEditedColumnsByTabId,
    removeEditedRowsByTabId,
    removeHighlightedRowsByTabId,
    deleteRemovedRowsByTabId,
    removeRowsByTabId,
    removeUnsavedRowsByTabId
  } = useDataStore();

  const remove = useCallback((tabId: string): TabType | null | undefined => {
    removeColumnsByTabId(tabId);
    removeEditedColumnsByTabId(tabId);
    removeEditedRowsByTabId(tabId);
    removeHighlightedRowsByTabId(tabId);
    deleteRemovedRowsByTabId(tabId);
    removeRowsByTabId(tabId);
    removeUnsavedRowsByTabId(tabId);
    return removeTab(tabId);
  }, []);

  return [remove];
}
