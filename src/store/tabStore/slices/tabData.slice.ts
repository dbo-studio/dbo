import { StateCreator } from 'zustand';
import { TabStore } from '../tab.store';

export type TabDataSlice = {
  updateRows: (rows: any[]) => void;
  updateColumns: (columns: any[]) => void;
  setShowColumns: (show: boolean) => void;
};

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
