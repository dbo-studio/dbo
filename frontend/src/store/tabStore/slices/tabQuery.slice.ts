import { tools } from '@/core/utils';
import { indexedDBService } from '@/core/indexedDB/indexedDB.service';
import type { StateCreator } from 'zustand';
import type { TabQuerySlice, TabStore } from '../types';

const parseStoredQuery = (storedQuery: string): string => {
  if (tools.isValidJSON(storedQuery)) {
    const parsed: unknown = JSON.parse(storedQuery);
    if (typeof parsed === 'string') {
      return parsed;
    }
  }

  return storedQuery;
};

export const createTabQuerySlice: StateCreator<TabStore & TabQuerySlice, [], [], TabQuerySlice> = (_set, get) => ({
  getQuery: (tabId?: string): string => {
    const tab = tabId ?? get().selectedTabId;
    if (!tab) return '';

    const storedQuery = indexedDBService.getTabQuery(tab);
    if (!storedQuery) return '';

    return parseStoredQuery(storedQuery);
  },
  updateQuery: (query: string): void => {
    const tabId = get().selectedTabId;
    if (!tabId) return;

    void indexedDBService.saveTabQuery(tabId, query);
  },
  removeQuery: (tabId: string): void => {
    void indexedDBService.removeTabQuery(tabId);
  },
  clearStoredQueries: (): void => {
    void indexedDBService.clearTabQueries();
  }
});
