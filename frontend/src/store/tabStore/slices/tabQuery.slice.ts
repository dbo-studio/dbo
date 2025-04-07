import { tools } from '@/core/utils';
import type { TabType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabQuerySlice, TabStore } from '../types';

export const createTabQuerySlice: StateCreator<TabStore & TabQuerySlice, [], [], TabQuerySlice> = (_, get) => ({
  getQuery: (): string => {
    const tab = get().selectedTab();
    if (!tab) return '';

    if (tab.query && tools.isValidJSON(tab.query)) {
      return JSON.parse(tab.query);
    }

    return tab?.query ?? '';
  },
  updateQuery: (query: string): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    if (!tools.isValidJSON(query)) {
      // biome-ignore lint: reason
      query = JSON.stringify(query);
    }

    tab.query = query;
    get().updateSelectedTab(tab);
  },
  setShowQueryPreview: (): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.showQuery = !tab.showQuery;
    get().updateSelectedTab(tab);
  }
});
