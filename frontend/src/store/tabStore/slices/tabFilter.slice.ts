import type { DataTabType, FilterType } from '@/types';
import type { StateCreator } from 'zustand';
import type { TabFilterSlice, TabStore } from '../types';

export const createTabFilterSlice: StateCreator<TabStore & TabFilterSlice, [], [], TabFilterSlice> = (_, get) => ({
  upsertFilters: (filter: FilterType): void => {
    const tab = get().selectedTab<DataTabType>();
    if (!tab) return;

    const filters = tab.filters ?? [];
    const existing = filters.findIndex((f: FilterType) => f.index === filter.index);
    const nextFilters =
      existing === -1 ? [...filters, filter] : filters.map((f, i) => (i === existing ? { ...f, ...filter } : f));

    get().updateSelectedTab({ ...tab, filters: nextFilters });
  },
  removeFilter: (filter: FilterType): void => {
    const tab = get().selectedTab<DataTabType>();
    if (!tab) return;

    get().updateSelectedTab({
      ...tab,
      filters: (tab.filters ?? []).filter((f: FilterType) => f.index !== filter.index)
    });
  },
  updateFilters: (filters: FilterType[]): void => {
    const tab = get().selectedTab<DataTabType>();
    if (!tab) return;

    get().updateSelectedTab({ ...tab, filters });
  }
});
