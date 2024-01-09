import { StateCreator } from 'zustand';
import { TabQuerySlice, TabStore } from '../types';

export const createTabQuerySlice: StateCreator<TabStore & TabQuerySlice, [], [], TabQuerySlice> = (set, get) => ({
  updateQuery: (query: string) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.query = query;
    get().updateSelectedTab(selectedTab);
  },
  setShowQueryPreview: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showQuery = show;
    selectedTab.showFilters = false;
    selectedTab.showSorts = false;
    get().updateSelectedTab(selectedTab);
  }
});
