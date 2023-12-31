import { TabDataSlice, TabStore } from '@/src/types/TabStore';
import { StateCreator } from 'zustand';

export const createTabDataSlice: StateCreator<TabStore & TabDataSlice, [], [], TabDataSlice> = (set, get) => ({
  updateRows: (rows: any[]) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.rows = rows;

    get().updateSelectedTab(selectedTab);
  },
  updateColumns: (columns: any[]) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.columns = columns;
    get().updateSelectedTab(selectedTab);
  },
  setShowColumns: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showColumns = show;
    get().updateSelectedTab(selectedTab);
  }
});
