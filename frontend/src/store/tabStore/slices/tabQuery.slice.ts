import { tools } from '@/core/utils';
import type { TabType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabQuerySlice, TabStore } from '../types';

export const createTabQuerySlice: StateCreator<TabStore & TabQuerySlice, [], [], TabQuerySlice> = (_, get) => ({
  getQuery: (tab: TabType): string => {
    if (tab.query && tools.isValidJSON(tab.query)) {
      return JSON.parse(tab.query);
    }

    return tab?.query ?? '';
  },
  updateQuery: (tab: TabType, query: string): void => {
    if (!tools.isValidJSON(query)) {
      // biome-ignore lint: reason
      query = JSON.stringify(query);
    }

    tab.query = query;
    get().updateSelectedTab(tab);
  },
  setShowQueryPreview: (tab: TabType): void => {
    tab.showQuery = !tab.showQuery;
    get().updateSelectedTab(tab);
  }
});
