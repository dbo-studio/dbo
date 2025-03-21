import type { TabMode } from '@/core/enums';
import { useDataStore } from '@/store/dataStore/data.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import type { TabType } from '@/types';

export function useRemoveTab() {
  const { removeTab, getTabs, updateSelectedTab } = useTabStore();
  const {
    removeColumnsByTabId,
    removeEditedRowsByTabId,
    deleteRemovedRowsByTabId,
    removeRowsByTabId,
    removeUnsavedRowsByTabId
  } = useDataStore();

  const remove = (tabId: string): TabType | null | undefined => {
    if (getTabs().length === 1) {
      updateSelectedTab(undefined);
    }

    removeColumnsByTabId(tabId);
    removeEditedRowsByTabId(tabId);
    deleteRemovedRowsByTabId(tabId);
    removeRowsByTabId(tabId);
    removeUnsavedRowsByTabId(tabId);
    return removeTab(tabId);
  };

  return [remove];
}
