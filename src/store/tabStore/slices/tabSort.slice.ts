import { SortType } from '@/src/types';
import { TabSortSlice, TabStore } from '@/src/types/TabStore';
import { StateCreator } from 'zustand';

export const createTabSortSlice: StateCreator<TabStore & TabSortSlice, [], [], TabSortSlice> = (set, get) => ({
  upsertSorts: (sort: SortType) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    const findSort = selectedTab.sorts.find((s: SortType) => s.index === sort.index);
    if (!findSort) {
      selectedTab.sorts.push(sort);
    } else {
      findSort.value = sort.value;
      findSort.operator = sort.operator;
      findSort.isActive = sort.isActive;
    }

    get().updateSelectedTab(selectedTab);
  },
  removeSort: (sort: SortType) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    (selectedTab.sorts = selectedTab.sorts.filter((s: SortType) => s.index !== sort.index)),
      get().updateSelectedTab(selectedTab);
  },
  setShowSorts: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showSorts = show;
    get().updateSelectedTab(selectedTab);
  }
});
