import type { StateCreator } from 'zustand';
import type { TabDataSlice, TabStore } from '../types';

export const createTabColumnSlice: StateCreator<TabStore & TabDataSlice, [], [], TabDataSlice> = (set, get) => ({
  setShowColumns: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showColumns = show;
    get().updateSelectedTab(selectedTab);
  },
  updateColumns: (columns: string[]) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.columns = columns;
    get().updateSelectedTab(selectedTab);
  }
});
