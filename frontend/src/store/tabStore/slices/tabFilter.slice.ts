import type { FilterType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabFilterSlice, TabStore } from '../types';

export const createTabFilterSlice: StateCreator<TabStore & TabFilterSlice, [], [], TabFilterSlice> = (_, get) => ({
  upsertFilters: async (filter: FilterType): Promise<void> => {
    const tab = get().selectedTab();
    if (!tab) return;

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
  removeFilter: (filter: FilterType): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.filters = tab?.filters?.filter((f: FilterType) => f.index !== filter.index);
    get().updateSelectedTab(tab);
  },
  setShowFilters: (): void => {
    const tab = get().selectedTab();
    if (!tab) return;

    tab.showFilters = !tab.showFilters;
    tab.showSorts = false;

    get().updateSelectedTab(tab);
  }
});
