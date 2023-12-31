import { StateCreator } from 'zustand';
import { TabStore } from '../tab.store';

export type TabQuerySlice = {
  updateQuery: (query: string) => void;
  setShowQueryPreview: (show: boolean) => void;
};

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
