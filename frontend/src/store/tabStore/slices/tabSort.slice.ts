import type { SortType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabSortSlice, TabStore } from '../types';

export const createTabSortSlice: StateCreator<TabStore & TabSortSlice, [], [], TabSortSlice> = (_, get) => ({
  upsertSorts: async (sort: SortType): Promise<void> => {
    const tab = get().selectedTab();
    if (!tab) return;

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
  removeSort: (sort: SortType): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.sorts = tab.sorts?.filter((s: SortType) => s.index !== sort.index);
    get().updateSelectedTab(tab);
  },
  setShowSorts: (): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.showSorts = !tab.showSorts;
    tab.showFilters = false;
    get().updateSelectedTab(tab);
  },
  updateSorts: (sorts: SortType[]): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.sorts = sorts;
    get().updateSelectedTab(tab);
  }
});
