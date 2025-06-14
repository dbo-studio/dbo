import type { StateCreator } from 'zustand';
import type { TabDataSlice, TabStore } from '../types';

export const createTabColumnSlice: StateCreator<TabStore & TabDataSlice, [], [], TabDataSlice> = (_, get) => ({
  updateColumns: (columns: string[]): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.columns = columns;
    get().updateSelectedTab(tab);
  }
});
