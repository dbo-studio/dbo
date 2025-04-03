import type { FilterType, TabType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabFilterSlice, TabStore } from '../types';

export const createTabFilterSlice: StateCreator<TabStore & TabFilterSlice, [], [], TabFilterSlice> = (_, get) => ({
  upsertFilters: async (tab: TabType, filter: FilterType): Promise<void> => {
    const findFilter = tab.filters?.find((f: FilterType) => f.index === filter.index);
    if (!findFilter) {
      tab.filters?.push(filter);
    } else {
      findFilter.column = filter.column;
      findFilter.value = filter.value;
      findFilter.operator = filter.operator;
      findFilter.next = filter.next;
      findFilter.isActive = filter.isActive;
    }

    get().updateSelectedTab(tab);
  },
  removeFilter: (tab: TabType, filter: FilterType): void => {
    tab.filters = tab?.filters?.filter((f: FilterType) => f.index !== filter.index);
    get().updateSelectedTab(tab);
  },
  setShowFilters: (tab: TabType): void => {
    tab.showFilters = !tab.showFilters;
    tab.showSorts = false;

    get().updateSelectedTab(tab);
  }
});
