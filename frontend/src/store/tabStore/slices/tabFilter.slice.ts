import type { FilterType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabFilterSlice, TabStore } from '../types';

export const createTabFilterSlice: StateCreator<TabStore & TabFilterSlice, [], [], TabFilterSlice> = (_, get) => ({
  upsertFilters: async (filter: FilterType) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    const findFilter = selectedTab.filters.find((f: FilterType) => f.index === filter.index);
    if (!findFilter) {
      selectedTab.filters.push(filter);
    } else {
      findFilter.column = filter.column;
      findFilter.value = filter.value;
      findFilter.operator = filter.operator;
      findFilter.next = filter.next;
      findFilter.isActive = filter.isActive;
    }

    get().updateSelectedTab(selectedTab);
  },
  removeFilter: (filter: FilterType) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    selectedTab.filters = selectedTab.filters.filter((f: FilterType) => f.index !== filter.index);
    get().updateSelectedTab(selectedTab);
  },
  setShowFilters: (show: boolean) => {
    const selectedTab = get().getSelectedTab();
    if (!selectedTab) {
      return;
    }

    selectedTab.showFilters = show;
    selectedTab.showSorts = false;
    get().updateSelectedTab(selectedTab);
  }
});
