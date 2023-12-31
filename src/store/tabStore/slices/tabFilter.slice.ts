import { FilterType } from '@/src/types';
import { StateCreator } from 'zustand';
import { TabStore } from '../tab.store';

export type TabFilterSlice = {
  upsertFilters: (filter: FilterType) => void;
  removeFilter: (filter: FilterType) => void;
  setShowFilters: (show: boolean) => void;
};

export const createTabFilterSlice: StateCreator<TabStore & TabFilterSlice, [], [], TabFilterSlice> = (set, get) => ({
  upsertFilters: (filter: FilterType) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    const findFilter = selectedTab.filters.find((f) => f.index === filter.index);
    if (!findFilter) {
      selectedTab.filters.push(filter);
    } else {
      findFilter.value = filter.value;
      findFilter.operator = filter.operator;
      findFilter.isActive = filter.isActive;
    }

    get().updateSelectedTab(selectedTab);
  },
  removeFilter: (filter: FilterType) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    (selectedTab.filters = selectedTab.filters.filter((f: FilterType) => f.index !== filter.index)),
      get().updateSelectedTab(selectedTab);
  },
  setShowFilters: (show: boolean) => {
    const selectedTab = get().selectedTab;
    if (!selectedTab) {
      return;
    }

    selectedTab.showFilters = show;
    get().updateSelectedTab(selectedTab);
  }
});
