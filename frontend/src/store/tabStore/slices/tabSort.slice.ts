import type { SortType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabSortSlice, TabStore } from '../types';

export const createTabSortSlice: StateCreator<TabStore & TabSortSlice, [], [], TabSortSlice> = (set, get) => ({
  upsertSorts: async (sort: SortType) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const findSort = selectedTab.sorts.find((s: SortType) => s.index === sort.index);
    if (!findSort) {
      selectedTab.sorts.push(sort);
    } else {
      findSort.column = sort.column;
      findSort.operator = sort.operator;
      findSort.isActive = sort.isActive;
    }

    get().updateSelectedTab(selectedTab);
  },
  removeSort: (sort: SortType) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    selectedTab.sorts = selectedTab.sorts.filter((s: SortType) => s.index !== sort.index);
    get().updateSelectedTab(selectedTab);
  },
  setShowSorts: (show: boolean) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    selectedTab.showSorts = show;
    selectedTab.showFilters = false;
    get().updateSelectedTab(selectedTab);
  },
  updateSorts: async (sorts: SortType[]) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    selectedTab.sorts = sorts;
    get().updateSelectedTab(selectedTab);
  }
});
