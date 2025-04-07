import type { StateCreator } from 'zustand';
import type { TabDataSlice, TabStore } from '../types';

export const createTabColumnSlice: StateCreator<TabStore & TabDataSlice, [], [], TabDataSlice> = (_, get) => ({
  setShowColumns: (): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.showColumns = !tab.showColumns;
    get().updateSelectedTab(tab);
  },
  updateColumns: (columns: string[]): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.columns = columns;
    get().updateSelectedTab(tab);
  }
});
