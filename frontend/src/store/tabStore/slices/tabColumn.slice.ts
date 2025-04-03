import type { TabType } from '@/types/Tab';
import type { StateCreator } from 'zustand';
import type { TabDataSlice, TabStore } from '../types';

export const createTabColumnSlice: StateCreator<TabStore & TabDataSlice, [], [], TabDataSlice> = (_, get) => ({
  setShowColumns: (tab: TabType): void => {
    tab.showColumns = !tab.showColumns;
    get().updateSelectedTab(tab);
  },
  updateColumns: (tab: TabType, columns: string[]): void => {
    tab.columns = columns;
    get().updateSelectedTab(tab);
  }
});
