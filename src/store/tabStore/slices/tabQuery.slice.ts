import { TabQuerySlice, TabStore } from '@/src/types/TabStore';
import { StateCreator } from 'zustand';

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
    get().updateSelectedTab(selectedTab);
  }
});
