import type { SortType, TabType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabSortSlice, TabStore } from '../types';

export const createTabSortSlice: StateCreator<TabStore & TabSortSlice, [], [], TabSortSlice> = (_, get) => ({
  upsertSorts: async (tab: TabType, sort: SortType): Promise<void> => {
    const findSort = tab.sorts?.find((s: SortType) => s.index === sort.index);
    if (!findSort) {
      tab.sorts?.push(sort);
    } else {
      findSort.column = sort.column;
      findSort.operator = sort.operator;
      findSort.isActive = sort.isActive;
    }

    get().updateSelectedTab(tab);
  },
  removeSort: (tab: TabType, sort: SortType): void => {
    tab.sorts = tab.sorts?.filter((s: SortType) => s.index !== sort.index);
    get().updateSelectedTab(tab);
  },
  setShowSorts: (tab: TabType): void => {
    tab.showSorts = !tab.showSorts;
    tab.showFilters = false;
    get().updateSelectedTab(tab);
  },
  updateSorts: async (tab: TabType, sorts: SortType[]): Promise<void> => {
    tab.sorts = sorts;
    get().updateSelectedTab(tab);
  }
});
